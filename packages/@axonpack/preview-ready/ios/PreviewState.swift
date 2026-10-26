import Foundation
import os

let previewReadyLog = Logger(subsystem: "dev.axonpack.preview-ready", category: "AxonpackPreviewReady")

/**
 Which bundle the next start should load. JS writes `state.json` under the app's Documents folder
 (what expo-file-system calls the documents directory), and native only ever reads it. The bundle
 path in it is relative, because the app's container path changes when the app is updated.
 */
enum PreviewState {
  static var root: URL? {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
      .appendingPathComponent("preview-ready", isDirectory: true)
  }

  /// Nil means "load the base bundle", which is also the answer to anything unexpected.
  static func selectedBundle() -> URL? {
    guard let root, let data = try? Data(contentsOf: root.appendingPathComponent("state.json")) else {
      return nil
    }
    guard
      let state = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let relative = state["bundle"] as? String, !relative.isEmpty
    else {
      previewReadyLog.warning("Could not read the preview state, loading the base bundle")
      return nil
    }
    let bundle = root.appendingPathComponent(relative).standardizedFileURL
    // A path like "../x" must not let the state point outside our own folder.
    let inside = bundle.path.hasPrefix(root.standardizedFileURL.path + "/")
    guard inside, FileManager.default.fileExists(atPath: bundle.path) else {
      previewReadyLog.warning("Selected bundle \(relative, privacy: .public) is missing, loading the base bundle")
      return nil
    }
    return bundle
  }
}
