import ExpoModulesCore
import WidgetKit

/// Writes what the widget shows into the App Group it shares with the app, then asks
/// WidgetKit to redraw. The widget never talks to the network itself.
public class OpasWidgetBridgeModule: Module {
  private let defaults = UserDefaults(suiteName: "group.com.opas.app")

  public func definition() -> ModuleDefinition {
    Name("OpasWidgetBridge")

    Function("setNextDeadline") { (json: String?) in
      if let json {
        self.defaults?.set(json, forKey: "nextDeadline")
      } else {
        self.defaults?.removeObject(forKey: "nextDeadline")
      }
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
