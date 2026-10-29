import Foundation
import React
import os

let previewLog = Logger(subsystem: "dev.axonpack.preview", category: "AxonpackPreview")

/**
 Which bundle the next start should load. JS writes `state.json` under the app's Documents folder
 (what expo-file-system calls the documents directory), and native only ever reads it. The bundle
 path in it is relative, because the app's container path changes when the app is updated.
 */
enum PreviewState {
  static var root: URL? {
    FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first?
      .appendingPathComponent("preview", isDirectory: true)
  }

  /// Previews need the New Architecture; under the old one only the base bundle ever loads.
  static var newArchitecture: Bool { RCTIsNewArchEnabled() }

  static func warnOldArchitecture() {
    previewLog.warning("@axonpack/preview needs the New Architecture, so the selected preview is ignored and the base bundle loads")
  }

  /// The selected preview if this app can run it, else nil for the base bundle.
  static func bundleToLoad() -> URL? {
    guard let preview = selectedBundle() else {
      return nil
    }
    guard madeForThisBuild() else {
      return nil
    }
    guard newArchitecture else {
      warnOldArchitecture()
      return nil
    }
    if let embedded = embeddedHermesVersion, let version = hermesVersion(of: preview), embedded != version {
      previewLog.warning("The preview is Hermes bytecode \(version) but this build runs \(embedded), so the base bundle loads")
      return nil
    }
    guard claimStart() else {
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

  // Crash fallback. Every JS start has its own token. A preview start writes it into the state as
  // `pending`, and JS clears it once the app has mounted. Finding someone else's token means an
  // earlier start of this preview never got that far, so the preview is marked broken and the base
  // bundle loads instead. Several lookups in one start see their own token and change nothing.
  private static let processToken = UUID().uuidString
  private static var starts = 0
  private static var token: String { "\(processToken):\(starts)" }

  /// Called before a reload, so the next start has a token of its own.
  static func nextStart() {
    starts += 1
  }

  private static var stateURL: URL? { root?.appendingPathComponent("state.json") }

  private static func readJson() -> [String: Any] {
    guard
      let stateURL,
      let data = try? Data(contentsOf: stateURL),
      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else {
      return [:]
    }
    return json
  }

  private static func writeJson(_ json: [String: Any]) {
    guard let root, let stateURL else {
      return
    }
    try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    try? JSONSerialization.data(withJSONObject: json).write(to: stateURL, options: .atomic)
  }

  private static func claimStart() -> Bool {
    var json = readJson()
    let pending = json["pending"] as? String ?? ""
    if pending == token {
      return true
    }
    if !pending.isEmpty {
      let id = (json["bundle"] as? String ?? "").components(separatedBy: "/").first ?? ""
      previewLog.warning("The preview \(id, privacy: .public) stopped before it finished starting, so it is marked broken and the base bundle loads")
      json["broken"] = (json["broken"] as? [String] ?? []) + [id]
      json["bundle"] = nil
      json["pending"] = nil
      writeJson(json)
      return false
    }
    json["pending"] = token
    writeJson(json)
    return true
  }

  /// The key the config plugin baked into this build; nil without the plugin.
  private static var buildKey: String? {
    Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewKey") as? String
  }

  /// A preview chosen on an earlier build (the app was updated since) is not loaded: with app
  /// version matching, a new version is a new native build. The choice is cleared, so the app and
  /// the list both show the base bundle. Without a key on either side there is nothing to compare.
  private static func madeForThisBuild() -> Bool {
    var json = readJson()
    guard let chosenFor = json["key"] as? String, let build = buildKey, chosenFor != build else {
      return true
    }
    previewLog.warning("The chosen preview was made for build \(chosenFor, privacy: .public) but this is \(build, privacy: .public), so the base bundle loads")
    json["bundle"] = nil
    json["key"] = nil
    json["pending"] = nil
    writeJson(json)
    return false
  }

  /// JS calls this once the app has mounted: this start worked.
  static func confirmStart() {
    var json = readJson()
    if json["pending"] as? String == token {
      json["pending"] = nil
      writeJson(json)
    }
  }

  /// Records the choice for the next start or reload. Nil clears it, so the base bundle loads. The
  /// path is relative to the preview folder and must stay inside it. Choosing a preview again takes
  /// it off the broken list, since it may have been fixed and downloaded again.
  static func select(_ bundle: String?, key: String? = nil) throws {
    guard let root else {
      return
    }
    var json = readJson()
    json["pending"] = nil
    if let bundle {
      guard root.appendingPathComponent(bundle).standardizedFileURL.path.hasPrefix(root.standardizedFileURL.path + "/") else {
        throw PreviewPathOutsideException()
      }
      let id = bundle.components(separatedBy: "/").first ?? ""
      json["bundle"] = bundle
      json["key"] = key
      json["broken"] = (json["broken"] as? [String] ?? []).filter { $0 != id }
    } else {
      json["bundle"] = nil
      json["key"] = nil
    }
    writeJson(json)
  }

  // Local Metro servers (debug builds only). `localServer` sits next to the preview fields and
  // never changes them, so stopping a local server brings back whatever preview was chosen.

  /// The chosen local server's bundle URL, or nil; always nil in a release build.
  static var localServerURL: URL? {
    #if DEBUG
    guard
      let server = readJson()["localServer"] as? [String: Any],
      let url = server["url"] as? String
    else {
      return nil
    }
    return URL(string: url)
    #else
    return nil
    #endif
  }

  /// `host:port` of the Metro the app starts on with nothing chosen; always nil in a release build.
  static var defaultServer: String? {
    #if DEBUG
    guard
      let url = PreviewReactDelegateHandler.defaultURL,
      url.scheme?.hasPrefix("http") == true,
      let host = url.host,
      let port = url.port
    else {
      return nil
    }
    return "\(host):\(port)"
    #else
    return nil
    #endif
  }

  static func selectLocalServer(_ url: String?) {
    var json = readJson()
    if let url {
      json["localServer"] = ["url": url]
    } else {
      json["localServer"] = nil
    }
    writeJson(json)
  }

  /// What the running start was loaded from, written when native picked it, so the list shows what
  /// really runs and not only what was chosen. A start this package never picked for is the default.
  private static var loaded: [String: String] = ["kind": "default"]

  static func recordLoaded(local: URL?, preview: URL?) {
    if let local {
      loaded = ["kind": "server", "url": local.absoluteString]
    } else if let preview, let id = previewId(of: preview) {
      loaded = ["kind": "preview", "id": id]
    } else {
      loaded = ["kind": "default"]
    }
  }

  /// The first folder under the preview folder, the way JS reads the id from the bundle path.
  private static func previewId(of bundle: URL) -> String? {
    guard let root else {
      return nil
    }
    let base = root.standardizedFileURL.path + "/"
    let path = bundle.standardizedFileURL.path
    guard path.hasPrefix(base) else {
      return nil
    }
    return path.dropFirst(base.count).components(separatedBy: "/").first
  }

  /// The raw choice and the broken list, for JS to show.
  static func read() -> [String: Any?] {
    let json = readJson()
    return [
      "bundle": json["bundle"] as? String,
      "broken": json["broken"] as? [String] ?? [],
      "localServer": (json["localServer"] as? [String: Any])?["url"] as? String,
      "defaultServer": defaultServer,
      "loaded": loaded,
    ]
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
      previewLog.warning("Could not read the preview state, loading the base bundle")
      return nil
    }
    let bundle = root.appendingPathComponent(relative).standardizedFileURL
    // A path like "../x" must not let the state point outside our own folder.
    let inside = bundle.path.hasPrefix(root.standardizedFileURL.path + "/")
    guard inside, FileManager.default.fileExists(atPath: bundle.path) else {
      previewLog.warning("Selected bundle \(relative, privacy: .public) is missing, loading the base bundle")
      return nil
    }
    return bundle
  }
}
