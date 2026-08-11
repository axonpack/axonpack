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
