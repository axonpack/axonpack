import ExpoModulesCore

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

public class AxonpackDevtoolsModule: Module {
  /// Captured when the module is constructed, which happens during native startup.
  private let moduleInitEpochMs = Date().timeIntervalSince1970 * 1000

  public func definition() -> ModuleDefinition {
    Name("AxonpackDevtools")

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
