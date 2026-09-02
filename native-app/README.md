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

- PIN einrichten funktioniert (WebCrypto/PBKDF2/AES-GCM aus `lock.js` läuft im Android-WebView)
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

**Empfehlung:** Falls die App wirklich bei der Tante im Alltag ankommen soll und sie ein
iPhone hat, führt an Option 2 kaum ein Weg vorbei. Noch nicht eingerichtet — braucht ein
bewusstes Ja von Papa wegen der laufenden Kosten.

### Voraussetzungen auf diesem Rechner

- **Xcode 26.6** ist installiert, keine weitere Einrichtung nötig.
- **Kein CocoaPods nötig** — die App nutzt bewusst **Swift Package Manager** statt CocoaPods
  (`npx cap add ios --packagemanager SPM`). Das System-Ruby auf diesem Mac ist mit 2.6 zu alt
  für eine aktuelle CocoaPods-Installation (mehrere Abhängigkeiten brauchen Ruby ≥ 3.0/3.1);
  SPM ist fest in Xcode eingebaut und umgeht dieses Problem komplett.
- Simulatoren sind bereits vorhanden (u. a. iPhone 17 Pro), kein zusätzlicher Download nötig.

### Auf dem iPhone-17-Pro-Simulator bestätigt (02.09.2026)

- Build erfolgreich: `xcodebuild -scheme App -sdk iphonesimulator` läuft fehlerfrei durch
- PIN einrichten, Wiederherstellungscode, Entsperren funktionieren (WebCrypto/PBKDF2/AES-GCM
  aus `lock.js` läuft im iOS-WebView genauso wie im Android-WebView)
- Daten überleben einen kompletten Neustart der App (PIN musste beim zweiten Start korrekt
  erneut eingegeben werden statt neu eingerichtet zu werden)
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
