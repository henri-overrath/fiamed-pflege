import Foundation

// Der Wundfoto-Speicher (IndexedDB) und der übrige App-Zustand (localStorage) liegen
// ausschließlich lokal verschlüsselt auf diesem Gerät (lock.js, CLAUDE.md Regel 2).
// WKWebView legt seine Daten unter Library/WebKit ab, und "Library" wird von iOS
// standardmäßig in iCloud-Backups UND bei der Geräte-zu-Geräte-Migration (Quick Start)
// mitgesichert - ohne diesen Ausschluss würden Gesundheitsdaten unbemerkt auf Apple-
// Server bzw. ein anderes Gerät wandern, was der ganzen "kein Server"-Architektur
// widerspricht (siehe MARKT.md).
//
// Wird von zwei Stellen aufgerufen (AppDelegate.didFinishLaunchingWithOptions und
// SceneDelegate.sceneDidEnterBackground), weil applicationDidEnterBackground auf dem
// AppDelegate bei einer scene-basierten App wie dieser hier NICHT zuverlässig auslöst -
// im iOS-Simulator nachgewiesen (16.-17.09.2026): Nach einem Wechsel in den Hintergrund
// blieb Library/WebKit unmarkiert, solange der Aufruf nur im AppDelegate stand.
// sceneDidEnterBackground ist der zuverlässige scene-level Ersatz dafür und wurde
// ebenfalls im Simulator geprüft (xattr com.apple.metadata:com_apple_backup_excludeItem
// direkt auf der Container-Datei nachgesehen, nicht nur der Code gelesen).
//
// Läuft bei jedem Aufruf erneut (ähnlich wie flushPendingWrite in lock.js): WKWebView
// legt laufend neue Dateien an, die die Backup-Markierung nicht automatisch von ihrem
// Ordner erben. Der genaue Ordnername unter Library/WebKit ist ein von Apple nicht
// offiziell dokumentiertes Implementierungsdetail - deshalb wird hier rekursiv der ganze
// WebKit-Ordner markiert statt ein einzelner, vermuteter Unterpfad.
//
// Auf einem echten Gerät noch nicht verifiziert (nur im Simulator - Simulatoren nehmen
// nicht an echten iCloud-Backups teil). Vor der Veröffentlichung dort prüfen:
// Einstellungen > [Name] > iCloud > Backup > "Nächstes Backup enthält" darf FiaMed
// Pflege nicht mit nennenswerter Größe zeigen, nachdem mindestens ein Wundfoto
// aufgenommen und die App danach einmal in den Hintergrund gewechselt ist.
enum BackupExclusion {
    static func excludeWebViewData() {
        guard let libraryDir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        excludeRecursively(at: libraryDir.appendingPathComponent("WebKit"))
    }

    private static func excludeRecursively(at url: URL) {
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
                excludeRecursively(at: child)
            }
        }
    }
}
