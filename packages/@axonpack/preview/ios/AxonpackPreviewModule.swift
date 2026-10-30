import Darwin
import ExpoModulesCore
import React

public final class AxonpackPreviewModule: Module {
  private lazy var bonjour = BonjourBrowser { [weak self] services in
    self?.sendEvent("onBonjourServices", ["services": services])
  }

  public func definition() -> ModuleDefinition {
    Name("AxonpackPreview")

    Events("onBonjourServices")

    // What the config plugin wrote at prebuild; nil when the plugin is not in the app config.
    Constants([
      "compatibility": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewCompatibility") as? String,
      "key": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewKey") as? String,
      "slug": Bundle.main.object(forInfoDictionaryKey: "AxonpackPreviewSlug") as? String,
      // For the list's header; read from the app itself so no other module is needed.
      "appName": (Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") ?? Bundle.main.object(forInfoDictionaryKey: "CFBundleName")) as? String,
      "appVersion": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
      "buildNumber": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
    ])

    OnCreate {
      DispatchQueue.main.async {
        PreviewReactDelegateHandler.startOnSelectedPreview()
      }
    }

    Function("select") { (bundle: String?, key: String?) in
      try PreviewState.select(bundle, key: key)
    }

    // `hostPort` is what Android needs; iOS loads the bundle URL itself.
    Function("selectLocalServer") { (url: String?, _: String?) in
      PreviewState.selectLocalServer(url)
    }

    Function("state") {
      PreviewState.read()
    }

    Function("markLaunched") {
      PreviewState.confirmStart()
    }

    // While the dev preview servers list is on screen, and never in the background.
    Function("startBonjourBrowse") {
      self.bonjour.start()
    }

    Function("stopBonjourBrowse") {
      self.bonjour.stop()
    }

    // For the network sweep, which finds a registry whose Bonjour announcements never arrive.
    Function("localNetworks") {
      localNetworks()
    }

    OnDestroy {
      self.bonjour.stop()
    }

    Function("reload") {
      guard PreviewState.newArchitecture else {
        PreviewState.warnOldArchitecture()
        return
      }
      // The reload asks the bundle URL block again, and that block reads the current choice.
      DispatchQueue.main.async {
        PreviewReactDelegateHandler.reload()
      }
    }
  }
}

/// This device's private IPv4 addresses on Wi-Fi or Ethernet (`en*`, so not cellular's `pdp_ip*`),
/// each with its prefix length. Reading them needs no permission.
private func localNetworks() -> [[String: Any]] {
  var first: UnsafeMutablePointer<ifaddrs>?
  guard getifaddrs(&first) == 0 else { return [] }
  defer { freeifaddrs(first) }
  var networks: [[String: Any]] = []
  var cursor = first
  while let entry = cursor?.pointee {
    defer { cursor = entry.ifa_next }
    guard entry.ifa_flags & UInt32(IFF_UP) != 0, entry.ifa_flags & UInt32(IFF_LOOPBACK) == 0,
      String(cString: entry.ifa_name).hasPrefix("en"),
      let address = entry.ifa_addr, address.pointee.sa_family == sa_family_t(AF_INET),
      let mask = entry.ifa_netmask
    else { continue }
    let ip = address.withMemoryRebound(to: sockaddr_in.self, capacity: 1) {
      UInt32(bigEndian: $0.pointee.sin_addr.s_addr)
    }
    // 10/8, 172.16/12 and 192.168/16.
    guard ip >> 24 == 10 || ip >> 20 == 0xAC1 || ip >> 16 == 0xC0A8 else { continue }
    let prefixLength = mask.withMemoryRebound(to: sockaddr_in.self, capacity: 1) {
      $0.pointee.sin_addr.s_addr.nonzeroBitCount
    }
    networks.append([
      "address": "\(ip >> 24).\(ip >> 16 & 0xFF).\(ip >> 8 & 0xFF).\(ip & 0xFF)",
      "prefixLength": prefixLength,
    ])
  }
  return networks
}

final class PreviewPathOutsideException: Exception {
  override var reason: String {
    "The bundle path must stay inside the preview folder"
  }
}
