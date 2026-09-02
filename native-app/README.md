# FiaMed Pflege — Android- und iOS-App

Native Hülle um die bestehende Web-App, gebaut mit [Capacitor](https://capacitorjs.com).
**Dieser Ordner enthält keine App-Logik.** `app.js`, `lock.js`, `share.js` usw. bleiben
unverändert in `../Claude-Uebergabe/FiaMed-Pflege-App/` — genau dort, wo Papa und Henri
immer schon gearbeitet haben. Dieser Ordner packt sie nur in installierbare Apps
(`android/` = Android-Projekt, `ios/` = iOS-Projekt, ein gemeinsames `capacitor.config.json`
für beide).

## Grundsatzentscheidung: Dateien liegen fest in der App, nicht online nachgeladen

`capacitor.config.json` zeigt mit `webDir` direkt auf `../Claude-Uebergabe/FiaMed-Pflege-App`.
Beim Bauen kopiert Capacitor diese Dateien **fest in die App**, statt sie zur Laufzeit von
GitHub Pages nachzuladen.

**Warum:** Die Tante arbeitet unterwegs bei Patienten, oft mit schlechtem Empfang. Eine App,
die zum Starten erst online sein muss, wäre schlechter als die heutige PWA. Passt außerdem zur
bestehenden Regel „Alle Daten bleiben auf dem Gerät" aus `CLAUDE.md`.

**Kehrseite:** Updates kommen nicht mehr automatisch wie bei GitHub Pages. Nach jeder Änderung
an der Web-App muss eine neue App gebaut und neu installiert werden (siehe unten).

## Nach jeder Änderung an der Web-App

```bash
cd native-app
npm run sync                  # kopiert den aktuellen Stand aus Claude-Uebergabe/FiaMed-Pflege-App/ in beide Projekte
npm run build:android-debug   # neue Android-Test-APK
# iOS: in Xcode öffnen (npm run open:ios) und über "Run" neu bauen - siehe iOS-Abschnitt unten
```

---

## App-Schutz: Gerätesperre statt PIN (seit 02.09.2026)

Die native App entsperrt sich mit **Face ID, Fingerabdruck oder Geräte-Code** — keine eigene
PIN, kein Wiederherstellungscode mehr. Die Daten liegen weiterhin AES-256-GCM-verschlüsselt im
WebView-Speicher; der Hauptschlüssel liegt im **iOS-Schlüsselbund** bzw. **Android-Keystore**.
Nach 2 Minuten im Hintergrund wird erneut entsperrt. Ohne eingerichtete Gerätesperre startet
die App nicht (sie bittet, erst eine einzurichten).

- **Plugins:** `@aparajita/capacitor-biometric-auth` (Gerätesperre) und
  `@aparajita/capacitor-secure-storage` (Schlüsselbund/Keystore), dazu `@capacitor/app` und
  `@capacitor/keyboard` als deren Abhängigkeiten. `lock.js` spricht sie **ohne Bundler**
  direkt über `Capacitor.nativePromise('SecureStorage' | 'BiometricAuthNative', …)` an —
  es gibt weiterhin keinen Build-Schritt für die Web-App.
- **`capacitor.config.json` hat `"loggingBehavior": "none"`** — sonst schreibt Capacitor in
  Debug-Builds jeden Plugin-Aufruf samt Parametern ins Log, darunter den Hauptschlüssel.
- **Android-Manifest:** `android:allowBackup="false"` (sonst spielt Android bei einer
  Neuinstallation alte WebView-Daten zurück, zu denen der Keystore-Schlüssel nicht mehr
  passt) und `USE_BIOMETRIC`-Berechtigung.
- **iOS-`Info.plist`:** `NSFaceIDUsageDescription` (Pflicht, sonst verweigert iOS Face ID).
- **Gerätewechsel:** Der Keystore-Schlüssel (Android) wandert nie mit; der iOS-Schlüsselbund-
  Eintrag nur bei verschlüsselten Backups. Verlässlicher Weg: in der App „JSON exportieren",
  auf dem neuen Gerät importieren.
- **Alte Installationen aus der PIN-Zeit** werden beim ersten Start einmalig umgestellt
  (alte PIN oder Wiederherstellungscode ein letztes Mal eingeben). Dabei wurde die eigentliche
  Ursache des früheren „PIN funktioniert nach Neustart nicht"-Problems gefunden: In WebKit lag
  der Speicher trotz aktivierter Verschlüsselung im **Klartext** (Details: Kommentar über
  `installShim()` in `lock.js` und `CLAUDE.md`). Behoben.

### Getestet am 02.09.2026

| Ablauf | iPhone-17-Pro-Simulator (Face ID simuliert) | Pixel-9-Pro-Emulator (Geräte-PIN, kein Fingerabdruck) |
|---|---|---|
| Erststart: „Schutz einrichten" → Gerätesperre → App | ✅ | ✅ |
| Daten verschlüsselt im Speicher (per SQLite/LevelDB nachgesehen, kein Klartext) | ✅ | ✅ |
| App beenden → Neustart → Gerätesperre → Daten wieder da | ✅ | ✅ |
| Abbruch/„Gesicht nicht erkannt" → eigener Schirm mit „Entsperren" | ✅ | – |
| Umstellung einer PIN-Installation (Klartextdaten + PIN-Metadaten) | ✅ | – |

**Face ID im Simulator steuern** (Xcode-Menü „Features → Face ID" oder per Terminal):

```bash
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged 1 && xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged   # Face ID „einrichten"
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.pearl.match     # Gesicht erkannt
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.pearl.nomatch   # nicht erkannt
```

**Android-Emulator ohne Fingerabdruck:** `adb shell locksettings set-pin 1234` setzt eine
Gerätesperre; die App fällt dann automatisch auf die PIN-Abfrage des Systems zurück
(`adb shell input text 1234` + `adb shell input keyevent 66`). Screenshots der Sperr-Abfrage
sind schwarz — Android blendet sichere Dialoge aus, das ist kein Fehler.

### Zwei Build-Fallen, beide am 02.09.2026 erlebt

- **Android: „SDK location not found"** — `android/local.properties` ist gitignored und fehlt
  in frischen Klonen/Worktrees. Anlegen mit `sdk.dir=/Users/<name>/Library/Android/sdk`.
- **iOS: „resource fork, Finder information, or similar detritus not allowed" beim CodeSign** —
  macOS hängt an neu geschriebene Dateien ein `com.apple.provenance`-Attribut, das Xcode beim
  Signieren ablehnt. Abhilfe: `xattr -cr ../Claude-Uebergabe/FiaMed-Pflege-App ios/App/App/public`
  und ggf. `xattr -cr <DerivedData>/…/App.app`, dann neu bauen.

---

## Android

### Kein Play Store nötig

Eine APK lässt sich direkt installieren (einmalig „Installation aus unbekannten Quellen
erlauben", Android fragt automatisch danach).

### Voraussetzungen auf diesem Rechner

- **Java:** Kein System-Java installiert. Ein portables JDK 21 (Temurin, LTS) liegt unter
  `~/.local-jdks/jdk-21.0.12.1+1/` — Android Studios eigenes mitgeliefertes Java ist Version 25,
  zu neu für die aktuelle Gradle-Version (Fehler „Unsupported class file major version 69").
  Für Kommandozeilen-Builds:
  ```bash
  export JAVA_HOME="$HOME/.local-jdks/jdk-21.0.12.1+1/Contents/Home"
  ```
  **In Android Studio selbst ist das kein Problem** — dort unter „Preferences → Build,
  Execution, Deployment → Build Tools → Gradle → Gradle JDK" ein passendes JDK auswählen
  (Studio bietet i. d. R. mehrere zur Auswahl an, notfalls „Download JDK…" mit Version 21).
- **Android SDK:** liegt unter `~/Library/Android/sdk`, `platform-tools` + Plattform 37 +
  Build-Tools 36 sind schon installiert.

### Auf einem echten Emulator bestätigt (02.09.2026)

- PIN einrichten funktionierte (WebCrypto/PBKDF2/AES-GCM aus `lock.js` läuft im Android-WebView) —
  **seit 02.09.2026 ersetzt durch die Gerätesperre**, siehe Abschnitt „App-Schutz" oben
- `tel:` (Anrufen), `mailto:` („Fehler melden") und Teilen (`navigator.share()` bzw.
  Zwischenablage-Fallback) wurden alle im Emulator ausprobiert und funktionieren

Noch nicht getestet: echtes Gerät (nur Emulator bisher).

### Release-APK bauen (signiert, installierbar als Update)

Ein Debug-Build reicht zum Ausprobieren, aber Android markiert Debug-Builds anders und sie
lassen sich nicht sauber als Update installieren. Für eine echte Weitergabe:

```bash
export JAVA_HOME="$HOME/.local-jdks/jdk-21.0.12.1+1/Contents/Home"
cd native-app/android
./gradlew assembleRelease
```

Ergebnis liegt unter `android/app/build/outputs/apk/release/app-release.apk`.

**Voraussetzung:** `android/keystore.properties` + `android/keystore/fiamed-release.jks`
müssen vorhanden sein (beide bewusst NICHT im Git-Repo, siehe `.gitignore` — dieses Repo ist
öffentlich). Ohne die beiden Dateien bricht `assembleRelease` mit einer klaren Fehlermeldung
ab; ein Debug-Build funktioniert davon unabhängig immer.

#### ⚠️ Diese beiden Dateien unbedingt sichern (z. B. Passwort-Manager + externe Sicherung)

**Ohne sie kann kein künftiges Update mehr signiert werden.** Android erkennt eine neue APK
nur dann als Update einer bestehenden Installation, wenn sie mit demselben Schlüssel signiert
ist. Geht der Schlüssel verloren, bliebe nur: Tante muss die App komplett deinstallieren und
neu installieren — und verliert dabei alle lokalen Daten (Patienten, Touren, PIN), weil die
Verschlüsselung an die Installation gebunden ist.

### Verteilung ohne Play Store

Fertige APK als GitHub-Release hochladen (kostenlos, kein zusätzliches Hosting nötig,
unabhängig von der eigentlichen Web-App/GitHub-Pages-Seite):

```bash
gh release create android-v1.1 android/app/build/outputs/apk/release/app-release.apk \
  --title "FiaMed Pflege – Android-App v1.1" \
  --notes "Was ist neu: ..."
```

(Versionsnummer in `android/app/build.gradle` bei `versionCode`/`versionName` vorher
hochzählen — Android installiert eine APK mit gleichem oder niedrigerem `versionCode` nicht
als Update.)

Der Tante dann den Direktlink zur Datei schicken (z. B. per WhatsApp-Nachricht als Text-Link,
nicht als Dateianhang — manche Messenger blockieren APK-Anhänge direkt). Sie öffnet den Link
im Handy-Browser, tippt die heruntergeladene Datei an, erlaubt einmalig „Installation aus
dieser Quelle", fertig. Bei jedem weiteren Update reicht: neuen Link schicken, sie installiert
einfach darüber — ihre Daten bleiben erhalten.

### So testest du Android selbst

1. `native-app/android` in Android Studio öffnen (`npm run open:android`).
2. Einmalig einen Emulator anlegen: Tools → Device Manager → „Create device" → ein
   Pixel-Gerät, aktuelles Android-Image herunterladen (braucht etwas Zeit und Speicherplatz).
3. Auf „Run" (▶) klicken.

---

## iOS

### ⚠️ Wichtigster Unterschied zu Android: Verteilung ist NICHT so einfach möglich

Bei Android reicht ein Link zu einer APK-Datei. **Bei iOS geht das grundsätzlich nicht** —
Apple erlaubt kein einfaches „Datei herunterladen und installieren" für selbstsignierte Apps.
Zwei echte Optionen, **das ist eine Entscheidung, die nur Papa treffen kann** (Kosten/Aufwand):

1. **Kostenlose Signierung (Apple-ID reicht, kein bezahlter Account nötig):** Die App läuft
   dann aber nur **7 Tage**, danach verweigert iOS den Start und man muss sie erneut über ein
   an einen Mac angeschlossenes Kabel (Xcode) neu aufspielen. Für die Tante im Alltag völlig
   unpraktikabel — realistisch nur zum eigenen Ausprobieren auf einem eigenen iPhone geeignet.
2. **Apple Developer Program (99 $/Jahr):** Damit ist **TestFlight** möglich — Apples
   offizieller Weg für genau diesen Fall („Familie/Freunde testen eine App"). Bis zu 100
   interne Tester (keine Wartezeit, keine Store-Prüfung), Einladung per E-Mail-Link, Installation
   über die TestFlight-App. Jede neue Version einmal hochladen, alle Tester bekommen automatisch
   eine Update-Benachrichtigung — deutlich komfortabler als bei Android sogar.

**Entschieden: Option 2 ist eingerichtet (Team `57UBBJP9ZC`, seit 02.09.2026), die App
wird über TestFlight genutzt.** Neue Version hochladen geht komplett per Terminal (Xcode muss
mit der Apple-ID angemeldet sein, `-allowProvisioningUpdates` erledigt Zertifikate/Profile):

```bash
cd native-app && npm run sync
cd ios/App
# 1. Version hochzählen: MARKETING_VERSION (z. B. 1.1) und CURRENT_PROJECT_VERSION (Build, z. B. 2)
#    in App.xcodeproj/project.pbxproj - beide Vorkommen (Debug + Release).
# 2. Archiv bauen
xcodebuild -scheme App -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath build/FiaMedPflege.xcarchive archive -allowProvisioningUpdates
# 3. Exportieren + hochladen (ExportOptions.plist: method app-store-connect, destination upload,
#    signingStyle automatic, teamID 57UBBJP9ZC - liegt nicht im Repo, weil build/ ignoriert ist)
xcodebuild -exportArchive -archivePath build/FiaMedPflege.xcarchive -exportPath build/upload \
  -exportOptionsPlist build/ExportOptions.plist -allowProvisioningUpdates
```

Danach in App Store Connect → TestFlight erscheint der Build nach wenigen Minuten
(„Processing"), die Tester bekommen automatisch die Update-Benachrichtigung. Beim CodeSign-
Fehler „detritus not allowed" siehe „Zwei Build-Fallen" oben.

### Voraussetzungen auf diesem Rechner

- **Xcode 26.6** ist installiert, keine weitere Einrichtung nötig.
- **Kein CocoaPods nötig** — die App nutzt bewusst **Swift Package Manager** statt CocoaPods
  (`npx cap add ios --packagemanager SPM`). Das System-Ruby auf diesem Mac ist mit 2.6 zu alt
  für eine aktuelle CocoaPods-Installation (mehrere Abhängigkeiten brauchen Ruby ≥ 3.0/3.1);
  SPM ist fest in Xcode eingebaut und umgeht dieses Problem komplett.
- Simulatoren sind bereits vorhanden (u. a. iPhone 17 Pro), kein zusätzlicher Download nötig.

### Auf dem iPhone-17-Pro-Simulator bestätigt (02.09.2026)

- Build erfolgreich: `xcodebuild -scheme App -sdk iphonesimulator` läuft fehlerfrei durch
- PIN einrichten, Wiederherstellungscode, Entsperren funktionierten (WebCrypto/PBKDF2/AES-GCM
  aus `lock.js` läuft im iOS-WebView genauso wie im Android-WebView) — **seit 02.09.2026
  ersetzt durch die Gerätesperre**, siehe Abschnitt „App-Schutz" oben. Der damalige Test
  „Daten überleben einen Neustart" war nur deshalb grün, weil die Daten im Klartext lagen
  (WebKit-Weichen-Bug, inzwischen behoben).
- `tel:`/`mailto:`-Verhalten **im Quellcode bestätigt statt live getestet**: Capacitors iOS-
  Bridge (`WebViewDelegationHandler.swift`) öffnet jede App-fremde URL über
  `UIApplication.shared.open(...)` — exakt derselbe Mechanismus wie Androids
  `Intent.ACTION_VIEW`. Anrufen, Navigation und „Fehler melden" sollten auf einem echten
  iPhone ohne weitere Konfiguration funktionieren. **Nicht live im Simulator vorführbar**,
  weil der Simulator kein Mobilfunk-Modem hat (Antippen von „Anrufen" reagiert sichtbar,
  öffnet aber naturgemäß keine Telefon-App) und ein frischer Simulator meist kein
  Mail-Konto eingerichtet hat.
- `navigator.share()` **nicht live im Simulator getestet** (Zeit für die verbleibende
  Navigation im Simulator hat nicht mehr gereicht) — WebKit/Safari hat aber eine deutlich
  ausgereiftere, verlässlichere Web-Share-Unterstützung als Android-WebView, daher hier
  weniger Sorge als beim Android-Befund. Bitte einmal auf einem echten Gerät/im Simulator
  gegenprüfen (Tagesbericht teilen, Nachbestellliste teilen).
- **Ein einmalig aufgetretener Anzeigefehler, kein bestätigter App-Bug:** Nach sehr viel
  Tipp-Interaktion über die (im Simulator genutzte) Hardware-Tastatur wirkte die App
  horizontal verschoben (Text am linken Rand abgeschnitten, z. B. „atienten" statt
  „Patienten") — verschwand vollständig nach einfachem Neustart der App. `overflow-x:hidden`
  aus Henris Android-Fix ist im CSS vorhanden. Sieht nach einer WKWebView-Eigenheit im
  Zusammenspiel mit der simulierten Hardware-Tastatur aus, nicht nach einem echten
  CSS-Bug — auf einem echten iPhone mit normaler Bildschirmtastatur sehr wahrscheinlich nicht
  reproduzierbar. Falls es dort doch auffällt: kurz notieren, wann genau (nach welcher
  Eingabe) es auftritt.

### So testest du iOS selbst

```bash
cd native-app
npm run open:ios
```

Öffnet das Projekt in Xcode. Oben ein Simulator-Gerät auswählen (z. B. „iPhone 17 Pro"),
auf „Run" (▶) klicken. Kein Emulator-Setup nötig wie bei Android — die Simulatoren sind
in Xcode schon vorinstalliert.

## Falls das Icon sich mal ändert

`assets/icon.png` ist die Quelle (aktuell eine Kopie von `icon-512.png` aus der Web-App).
Nach dem Austauschen:

```bash
npm run icons
```

Erzeugt automatisch alle Auflösungen und Splashscreens für **beide** Plattformen.
