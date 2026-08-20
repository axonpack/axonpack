import ExpoModulesCore
import UIKit

/**
 Frames the *main* thread actually rendered. A `requestAnimationFrame` loop in JS cannot see this: the UI
 thread can be fully stalled while JS keeps ticking happily, which is the blind spot the FPS card warns
 about. `CADisplayLink` fires on the main runloop, so it stops counting exactly when the UI stops drawing.
 */
private final class UiFpsTracker: NSObject {
  private var displayLink: CADisplayLink?
  private var frames = 0
  private var windowStart = CACurrentMediaTime()
  private(set) var fps: Double = -1

  func start() {
    guard displayLink == nil else { return }
    frames = 0
    windowStart = CACurrentMediaTime()
    let link = CADisplayLink(target: self, selector: #selector(tick))
    link.add(to: .main, forMode: .common)
    displayLink = link
  }

  func stop() {
    displayLink?.invalidate()
    displayLink = nil
    fps = -1
  }

  @objc private func tick() {
    frames += 1
    let now = CACurrentMediaTime()
    let elapsed = now - windowStart
    if elapsed >= 0.5 {
      fps = Double(frames) / elapsed
      frames = 0
      windowStart = now
    }
  }
}

/**
 The only native code in this package, and it exists to *cause* problems rather than measure them:
 the Limiter section needs to stall or kill the main thread, which JavaScript cannot reach.

 Everything here is optional on the JS side (`requireOptionalNativeModule`), so an app without a dev
 client keeps working — it just can't reach the main thread.
 */
/**
 Read once via `sysctl`, which is the only way to learn when the process actually began — every clock
 reachable from JS starts long after that, which is why `performance.rnStartupTiming` can only report
 what the platform chose to record.
 */
private func processStartEpochMs() -> Double? {
  var info = kinfo_proc()
  var size = MemoryLayout<kinfo_proc>.stride
  var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
  guard sysctl(&mib, u_int(mib.count), &info, &size, nil, 0) == 0 else {
    return nil
  }
  let started = info.kp_proc.p_starttime
  return Double(started.tv_sec) * 1000 + Double(started.tv_usec) / 1000
}

/**
 The app's real memory footprint — what iOS actually holds against you, and what a user means by
 "memory". `phys_footprint` is the same number Xcode's memory gauge shows, and it is unrelated to the JS
 heap the Performance tab reads from Hermes.
 */
private func appMemoryFootprintBytes() -> Double? {
  var info = task_vm_info_data_t()
  var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size) / 4
  let result = withUnsafeMutablePointer(to: &info) {
    $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
      task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
    }
  }
  guard result == KERN_SUCCESS else { return nil }
  return Double(info.phys_footprint)
}


/**
 Crash persistence.

 An uncaught Objective-C exception takes the process down before JavaScript gets another turn, so a
 report has to be written from the dying thread — this is the one thing in crash reporting that JS
 cannot do for itself. Written as JSON Lines and appended: a crash handler is the wrong place to be
 reading a file back in to rewrite it.

 Deliberately **not** a POSIX signal handler. `NSSetUncaughtExceptionHandler` runs in ordinary
 context, so normal Foundation calls are safe here; a `SIGSEGV` handler would have to be
 async-signal-safe and would fight Crashlytics/Sentry over the same slot. Swift `fatalError` and
 memory faults are therefore out of scope, and the package says so rather than implying coverage.
 */
private let crashFileName = "axonpack-devtools-crashes.jsonl"

private func crashFileURL() -> URL? {
  let manager = FileManager.default
  guard
    let directory = manager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
  else {
    return nil
  }
  // Application Support is not created for you, and unlike Caches it is not purged under disk
  // pressure — a crash report that evaporates before the next launch is worse than none.
  if !manager.fileExists(atPath: directory.path) {
    try? manager.createDirectory(at: directory, withIntermediateDirectories: true)
  }
  return directory.appendingPathComponent(crashFileName)
}

private func appendCrashLine(_ json: String) {
  guard let url = crashFileURL(), let data = (json + "\n").data(using: .utf8) else { return }

  if let handle = try? FileHandle(forWritingTo: url) {
    defer { try? handle.close() }
    _ = try? handle.seekToEnd()
    try? handle.write(contentsOf: data)
  } else {
    try? data.write(to: url)
  }
}

private func jsonEscape(_ value: String) -> String {
  var escaped = ""
  for character in value.unicodeScalars {
    switch character {
    case "\"": escaped += "\\\""
    case "\\": escaped += "\\\\"
    case "\n": escaped += "\\n"
    case "\r": escaped += "\\r"
    case "\t": escaped += "\\t"
    default:
      if character.value < 0x20 {
        escaped += String(format: "\\u%04x", character.value)
      } else {
        escaped.unicodeScalars.append(character)
      }
    }
  }
  return escaped
}

/// The handler that was installed before ours, called after we persist so Crashlytics/Sentry — or
/// React Native's own — still see the exception.
private var previousExceptionHandler: (@convention(c) (NSException) -> Void)?

private func writeExceptionRecord(_ exception: NSException) {
  let frames = exception.callStackSymbols.map { "\"\(jsonEscape($0))\"" }.joined(separator: ",")
  let json = """
    {"kind":"native-exception",\
    "name":"\(jsonEscape(exception.name.rawValue))",\
    "message":"\(jsonEscape(exception.reason ?? ""))",\
    "stack":null,\
    "timestamp":\(Int(Date().timeIntervalSince1970 * 1000)),\
    "native":{"type":"\(jsonEscape(exception.name.rawValue))","thread":"\(Thread.isMainThread ? "main" : "background")","frames":[\(frames)]}}
    """
  appendCrashLine(json)
}

/// A C function pointer, so it must capture nothing — everything it needs is in the file-scope
/// globals above.
private let axonpackExceptionHandler: @convention(c) (NSException) -> Void = { exception in
  writeExceptionRecord(exception)
  previousExceptionHandler?(exception)
}

private func deviceModelIdentifier() -> String {
  var systemInfo = utsname()
  uname(&systemInfo)
  let mirror = Mirror(reflecting: systemInfo.machine)
  return mirror.children.reduce(into: "") { identifier, element in
    guard let value = element.value as? Int8, value != 0 else { return }
    identifier += String(UnicodeScalar(UInt8(value)))
  }
}

public class AxonpackDevtoolsModule: Module {
  /// Captured when the module is constructed, which happens during native startup.
  private let moduleInitEpochMs = Date().timeIntervalSince1970 * 1000

  private let uiFps = UiFpsTracker()

  public func definition() -> ModuleDefinition {
    Name("AxonpackDevtools")

    // Started and stopped by the view, not at init: a display link on the main runloop keeps the screen
    // awake for as long as it lives.
    Function("startUiFpsTracking") { self.uiFps.start() }
    Function("stopUiFpsTracking") { self.uiFps.stop() }
    /** -1 until the first window closes, so "not measured" stays distinct from a real zero. */
    Function("getUiFps") { self.uiFps.fps }

    /**
     Epoch milliseconds, so JS can line these up with its own `Date.now()` readings. Returning a map
     rather than constants keeps it a single call and lets either value be absent.
     */
    Function("getStartupTimestamps") { () -> [String: Double?] in
      [
        "processStartMs": processStartEpochMs(),
        "nativeModuleInitMs": self.moduleInitEpochMs,
      ]
    }

    /**
     Busy-waits on the main queue. Sleeping would suspend the thread and let the OS schedule other
     work, which is not what a blocked UI thread looks like — spinning is the accurate simulation.
     Dispatched async so the call returns immediately and JS stays responsive while the UI freezes,
     which is the asymmetry being demonstrated.
     */
    /**
     iOS deliberately exposes less than Android here. There is no system-wide "free RAM" — the closest
     honest number is `os_proc_available_memory()`, how much this process may still allocate before the
     system kills it, which is the figure that actually matters to an app.
     */
    Function("getMemoryMetrics") { () -> [String: Double?] in
      [
        "appBytes": appMemoryFootprintBytes(),
        "totalBytes": Double(ProcessInfo.processInfo.physicalMemory),
        "availableToAppBytes": Double(os_proc_available_memory()),
      ]
    }

    /**
     There is deliberately no `getStorageMetrics` here.

     `FileManager.attributesOfFileSystem` (`.systemSize`, `.systemFreeSize`) is one of Apple's
     required-reason APIs. It needs no runtime permission and shows no prompt, but it obliges a
     `PrivacyInfo.xcprivacy` declaration at submission — and shipping it in a library risks pushing that
     obligation onto every app that embeds this package, for a number that is not about performance.

     Android has no equivalent restriction, so storage is reported there and simply absent here.
     */

    Function("installCrashHandler") {
      // Read the incumbent first: whoever installed before us keeps working, and installing twice
      // would otherwise make us our own "previous" handler and loop.
      if previousExceptionHandler == nil {
        previousExceptionHandler = NSGetUncaughtExceptionHandler()
        NSSetUncaughtExceptionHandler(axonpackExceptionHandler)
      }
    }

    /// Destructive by design: a record still in the file outlived the process that wrote it, which is
    /// the only evidence we have that the app actually died rather than carried on.
    Function("drainPendingCrashes") { () -> [String] in
      guard let url = crashFileURL(), let contents = try? String(contentsOf: url, encoding: .utf8)
      else {
        return []
      }
      try? FileManager.default.removeItem(at: url)
      return contents.split(separator: "\n").map(String.init).filter { !$0.isEmpty }
    }

    /// Used for JS fatals, which RN may follow with the process going down before anyone reads them.
    Function("persistCrashRecord") { (json: String) in
      appendCrashLine(json)
    }

    Function("getDeviceInfo") { () -> [String: Any?] in
      let bundle = Bundle.main.infoDictionary ?? [:]
      #if targetEnvironment(simulator)
        let simulator = true
      #else
        let simulator = false
      #endif
      return [
        "platform": "ios",
        "osVersion": UIDevice.current.systemVersion,
        "model": deviceModelIdentifier(),
        "brand": "Apple",
        "appVersion": bundle["CFBundleShortVersionString"] as? String,
        "buildVersion": bundle["CFBundleVersion"] as? String,
        "bundleId": Bundle.main.bundleIdentifier,
        "isEmulator": simulator,
        "totalMemoryBytes": Double(ProcessInfo.processInfo.physicalMemory),
        "availableMemoryBytes": Double(os_proc_available_memory()),
      ]
    }

    Function("blockMainThread") { (durationMs: Double) in
      DispatchQueue.main.async {
        let deadline = Date().addingTimeInterval(durationMs / 1000)
        while Date() < deadline {
        }
      }
    }

    Function("crashMainThread") { (message: String) in
      DispatchQueue.main.async {
        NSException(          name: NSExceptionName("AxonpackDevtoolsCrash"),
          reason: message,
          userInfo: nil
        ).raise()
      }
    }
  }
}
