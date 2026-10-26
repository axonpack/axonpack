import Foundation
import React
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

  /// Previews need the New Architecture; under the old one only the base bundle ever loads.
  static var newArchitecture: Bool { RCTIsNewArchEnabled() }

  static func warnOldArchitecture() {
    previewReadyLog.warning("preview-ready needs the New Architecture, so the selected preview is ignored and the base bundle loads")
  }

  /// The selected preview if this app can run it, else nil for the base bundle.
  static func bundleToLoad() -> URL? {
    guard let preview = selectedBundle() else {
      return nil
    }
    guard newArchitecture else {
      warnOldArchitecture()
      return nil
    }
    if let embedded = embeddedHermesVersion, let version = hermesVersion(of: preview), embedded != version {
      previewReadyLog.warning("The preview is Hermes bytecode \(version) but this build runs \(embedded), so the base bundle loads")
      return nil
    }
    return preview
  }

  /// The bundle inside the app was compiled by the Hermes this build runs. A debug build has none,
  /// and then nothing is checked.
  static let embeddedHermesVersion: UInt32? = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    .flatMap { hermesVersion(of: $0) }

  /// Hermes bytecode starts with an 8-byte magic number, then its format version as a 32-bit int.
  /// Nil for anything else, such as a plain JS bundle.
  static func hermesVersion(of url: URL) -> UInt32? {
    guard let handle = try? FileHandle(forReadingFrom: url) else {
      return nil
    }
    defer { try? handle.close() }
    guard let header = try? handle.read(upToCount: 12), header.count == 12 else {
      return nil
    }
    let magic: [UInt8] = [0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f]
    guard Array(header.prefix(8)) == magic else {
      return nil
    }
    return header.suffix(4).enumerated().reduce(UInt32(0)) { $0 | UInt32($1.element) << (8 * UInt32($1.offset)) }
  }

  /// Records the choice for the next start or reload. Nil clears it, so the base bundle loads. The
  /// path is relative to the preview folder and must stay inside it.
  static func select(_ bundle: String?) throws {
    guard let root else {
      return
    }
    let state = root.appendingPathComponent("state.json")
    guard let bundle else {
      try? FileManager.default.removeItem(at: state)
      return
    }
    guard root.appendingPathComponent(bundle).standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path + "/") else {
      throw PreviewPathOutsideException()
    }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    try JSONSerialization.data(withJSONObject: ["bundle": bundle]).write(to: state, options: .atomic)
  }

  /// The raw choice, for JS to show which preview is active. Empty when nothing is chosen.
  static func read() -> [String: Any?] {
    guard
      let root,
      let data = try? Data(contentsOf: root.appendingPathComponent("state.json")),
      let state = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return [:]
    }
    return ["bundle": state["bundle"] as? String]
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
