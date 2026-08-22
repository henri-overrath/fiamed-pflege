# FiaMed Pflege online veröffentlichen

## Einfachste Variante: Netlify

1. Bei [Netlify Drop](https://app.netlify.com/drop) anmelden oder ein kostenloses Konto erstellen.
2. Den gesamten Ordner **FiaMed-Pflege-App** in das Upload-Feld ziehen.
3. Nach wenigen Sekunden zeigt Netlify einen Link an, zum Beispiel `https://fiamed-pflege.netlify.app`.
4. Den Link auf Android oder iPhone in Chrome beziehungsweise Safari öffnen.
5. Im Browser-Menü **Zum Startbildschirm hinzufügen** wählen.

## Alternative: GitHub Pages

1. Auf GitHub ein neues, leeres Repository erstellen.
2. Den vollständigen Inhalt des Ordners **FiaMed-Pflege-App** in dieses Repository hochladen. Der Ordner selbst darf dabei nicht noch einmal als Unterordner angelegt werden.
3. In GitHub unter **Settings → Pages** bei **Source** die Option **GitHub Actions** wählen.
4. Der vorbereitete Ablauf veröffentlicht die App automatisch. Den Link findest du danach unter **Actions** oder **Settings → Pages**.

## Wichtiger Hinweis zu Daten

Patienten-, Tour- und Materialdaten werden nur im Browser-Speicher des jeweiligen Geräts gesichert. Sie werden nicht über den Link zwischen Geräten synchronisiert. Für ein neues Gerät bitte die Funktion **Daten exportieren** und anschließend **Daten importieren** verwenden.
