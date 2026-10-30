import Network
import os

/// Browses for the `preview start` servers that a registry announces over Bonjour, and resolves
/// each to an IPv4 address and port, which is what JS needs to reach its Metro.
final class BonjourBrowser {
  static let type = "_axon-preview._tcp"

  private let queue = DispatchQueue(label: "dev.axonpack.preview.bonjour")
  private let onChange: ([[String: Any]]) -> Void
  private var browser: NWBrowser?
  private var found: [String: [String: Any]] = [:]
  private var resolving: [String: NWConnection] = [:]

  init(onChange: @escaping ([[String: Any]]) -> Void) {
    self.onChange = onChange
  }

  /// The first browse is what makes iOS ask for local network access. Without
  /// `NSBonjourServices` listing the type, or with access denied, nothing is ever found.
  func start() {
    queue.async { [weak self] in
      guard let self, self.browser == nil else { return }
      let browser = NWBrowser(for: .bonjourWithTXTRecord(type: Self.type, domain: nil), using: .tcp)
      browser.browseResultsChangedHandler = { [weak self] results, _ in
        self?.update(results)
      }
      browser.stateUpdateHandler = { state in
        // Waiting is what a denied local network access looks like.
        if case .waiting(let error) = state {
          previewLog.notice("Bonjour: browsing waits: \(error.debugDescription, privacy: .public)")
        } else if case .failed(let error) = state {
          previewLog.notice("Bonjour: browsing failed: \(error.debugDescription, privacy: .public)")
        }
      }
      browser.start(queue: self.queue)
      self.browser = browser
    }
  }

  func stop() {
    queue.async {
      self.browser?.cancel()
      self.browser = nil
      self.resolving.values.forEach { $0.cancel() }
      self.resolving = [:]
      self.found = [:]
    }
  }

  private func update(_ results: Set<NWBrowser.Result>) {
    var names = Set<String>()
    for result in results {
      guard case let .service(name, _, _, _) = result.endpoint else { continue }
      names.insert(name)
      var txt: [String: String] = [:]
      if case let .bonjour(record) = result.metadata {
        txt = record.dictionary
      }
      if var known = found[name] {
        known["txt"] = txt
        found[name] = known
      } else if resolving[name] == nil {
        resolve(name, result.endpoint, txt)
      }
    }
    found = found.filter { names.contains($0.key) }
    for (name, connection) in resolving where !names.contains(name) {
      connection.cancel()
      resolving[name] = nil
    }
    emit()
  }

  /// A browse result names a service, not an address. Connecting to it is the simplest way to
  /// learn where it is: once ready, the connection's remote end is the address and port.
  private func resolve(_ name: String, _ endpoint: NWEndpoint, _ txt: [String: String]) {
    // IPv4 only. When the computer offers IPv6 too, as macOS does for a service it announces
    // itself (`dns-sd -R`), the connection would otherwise prefer it, and JS can't use it.
    let parameters = NWParameters.tcp
    (parameters.defaultProtocolStack.internetProtocol as? NWProtocolIP.Options)?.version = .v4
    let connection = NWConnection(to: endpoint, using: parameters)
    resolving[name] = connection
    connection.stateUpdateHandler = { [weak self, weak connection] state in
      guard let self, let connection else { return }
      switch state {
      case .ready:
        let remote = connection.currentPath?.remoteEndpoint
        self.found[name] = Self.service(name, remote, txt)
        if self.found[name] == nil {
          previewLog.notice("Bonjour: \(name, privacy: .public) is skipped, it has no IPv4 address (\(String(describing: remote), privacy: .public))")
        }
        self.emit()
      case .waiting(let error), .failed(let error):
        // Metro went away after the announcement, or it has no IPv4 address. The next browse
        // change tries again.
        previewLog.notice("Bonjour: \(name, privacy: .public) is skipped, connecting to it failed: \(error.debugDescription, privacy: .public)")
      default:
        return
      }
      connection.cancel()
      if self.resolving[name] === connection {
        self.resolving[name] = nil
      }
    }
    connection.start(queue: queue)
  }

  /// Only IPv4, which is all JS builds its URLs from.
  private static func service(_ name: String, _ endpoint: NWEndpoint?, _ txt: [String: String]) -> [String: Any]? {
    guard case let .hostPort(host, port)? = endpoint,
      case let .ipv4(address) = host,
      // Rebuilt from the raw bytes to drop the interface suffix, as in "192.168.1.24%en0".
      let ip = IPv4Address(address.rawValue)
    else { return nil }
    return ["name": name, "host": ip.debugDescription, "port": Int(port.rawValue), "txt": txt]
  }

  private func emit() {
    onChange(Array(found.values))
  }
}
