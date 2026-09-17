import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        excludeWebViewDataFromBackup()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
        excludeWebViewDataFromBackup()
    }

    // Der Wundfoto-Speicher (IndexedDB) und der übrige App-Zustand (localStorage) liegen
    // ausschließlich lokal verschlüsselt auf dem Gerät (lock.js, CLAUDE.md Regel 2).
    // WKWebView legt seine Daten unter Library/WebKit ab, und "Library" wird von iOS
    // standardmäßig in iCloud-Backups UND bei der Geräte-zu-Geräte-Migration (Quick
    // Start) mitgesichert - ohne diesen Ausschluss würden Gesundheitsdaten unbemerkt auf
    // Apple-Server bzw. ein anderes Gerät wandern, was der ganzen "kein Server"-
    // Architektur widerspricht (siehe MARKT.md).
    //
    // Läuft bei jedem Start und beim Wechsel in den Hintergrund erneut (ähnlich wie
    // flushPendingWrite in lock.js): WKWebView legt laufend neue Dateien an, die die
    // Backup-Markierung nicht automatisch von ihrem Ordner erben, und der genaue
    // Ordnername unter Library/WebKit ist ein von Apple nicht offiziell dokumentiertes
    // Implementierungsdetail - deshalb wird hier rekursiv der ganze WebKit-Ordner
    // markiert statt ein einzelner, vermuteter Unterpfad.
    //
    // ⚠️ Auf einem echten Gerät noch nicht verifiziert (hier nur geschrieben, nicht
    // gebaut/getestet - dafür fehlen in dieser Umgebung Xcode und ein Gerät/Simulator).
    // Vor der Veröffentlichung prüfen: Einstellungen > [Name] > iCloud > Backup >
    // "Nächstes Backup enthält" darf FiaMed Pflege nicht mit nennenswerter Größe zeigen,
    // nachdem mindestens ein Wundfoto aufgenommen wurde.
    private func excludeWebViewDataFromBackup() {
        guard let libraryDir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        excludeFromBackupRecursively(at: libraryDir.appendingPathComponent("WebKit"))
    }

    private func excludeFromBackupRecursively(at url: URL) {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory) else { return }
        var mutableUrl = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        do {
            try mutableUrl.setResourceValues(values)
        } catch {
            print("FiaMed Pflege: Backup-Ausschluss fehlgeschlagen für \(url.path): \(error)")
        }
        if isDirectory.boolValue, let contents = try? FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil) {
            for child in contents {
                excludeFromBackupRecursively(at: child)
            }
        }
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
