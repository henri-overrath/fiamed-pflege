# Marktumfeld & rechtlicher Rahmen

Recherchestand: 22.08.2026. Zweck dieser Datei: Wer an FiaMed baut (Mensch oder KI), soll
verstehen, **warum** bestimmte Grenzen in `CLAUDE.md` stehen und in welche Richtung sich die
App sinnvoll entwickelt. **Das Ziel ist kein Startup**, sondern eine App, die im Alltag von
Henris Tante und ggf. ihrer Chefin wirklich hilft. Diese Datei liefert nur den Kontext dafür.

## Der Markt in Zahlen

- **15.549 ambulante Pflegedienste** in Deutschland (Destatis, Pflegestatistik 2023),
  Ø 28,7 Beschäftigte, 68,5 % privat geführt, 1,1 Mio. betreute Pflegebedürftige.
- **Rund die Hälfte hat unter ~20 Mitarbeitende** — für dieses Segment sind die großen
  Branchensysteme zu teuer und zu schwer. Es ist der am schlechtesten bediente Teil des Marktes.
- Bedarf wächst schneller als Personal (betreute Personen +5,1 %, Personal +0,8 % in zwei Jahren).
- **Die Kunden haben kaum Geld:** Personalkostenquote 72 % (2023, steigend), sinkende
  Abschreibungsquote (= Investitionsstopp), Banken stufen die Branche als Risikobranche ein.
- **Preisdecke:** Vollsysteme *inklusive Abrechnung* ab 59,99 €/Monat (DMRZ), 149 €/Monat
  (meinpflegedienst.com). Fach-Apps für Wunddoku: 28–47 €/Monat (WUNDERA), DRACO WundDoku kostenlos.

## Was das für FiaMed bedeutet

- **Die Fachkraft benutzt, die Pflegedienstleitung kauft.** Das ist der Grund, warum die
  Fachkraft-Apps der Marktführer so schlecht sind — MediFox' „Doku-CarePad" steht bei
  **2,4 von 5 Sternen** im App Store. Wer nur die Fachkraft glücklich macht, hat ein gutes
  Werkzeug, aber keinen Käufer.
- **Ein Dienst kauft kein zweites System.** Jeder Dienst hat ein Pflichtsystem für die
  Abrechnung. Alles, was daneben steht und Doppeleingabe erzeugt, fliegt nach vier Wochen raus.
- **Das erfolgreiche Muster** (voize: 2020 aus einer WG gegründet, heute ~1.100 Einrichtungen,
  50 Mio. $ Series A): **neben** dem Pflichtsystem sitzen, genau eine Aufgabe lösen, keine
  Abrechnungsregulatorik anfassen. Die Gescheiterten (Kenbi: 60 Mio. € → Insolvenz 2025,
  Pflegetiger) wollten alle den Pflegedienst *selbst betreiben*.
- **Die eigentliche Lücke** in kleinen Diensten: Die großen Systeme haben Tourenplanung —
  kleine Dienste benutzen sie nicht, sie benutzen WhatsApp. Genau das ist der Alltag von
  Henris Tante: Die Chefin wirft abends unsortiert Patienten per WhatsApp rüber, zwei
  Fachkräfte handeln aus, wer wen nimmt. **Diesen Teil löst die App heute nicht.**

## Die rechtlichen Grenzen — und warum sie in CLAUDE.md stehen

### Keine Abrechnung
Sobald Software Daten für die Kassenabrechnung erzeugt, braucht **der Hersteller** eine
unabhängige Softwareprüfung durch die ITSG (Vereinbarung nach § 105 Abs. 2 S. 2 SGB XI,
Technische Anlage 1 Anhang 4). Ergebnis ist eine PROD-/MOD-ID, die in jeden Leistungsnachweis
eingefügt wird — ohne gültige ID wird die gesamte Abrechnungsdatei zurückgewiesen. Dazu elf
zwingende Anforderungen an den elektronischen Leistungsnachweis, KIM/TI als einziger
Transportweg, plus Landesrahmenverträge je Bundesland. Das ist kein Feature, das ist ein
Compliance-Programm. Frist für den vollelektronischen Leistungsnachweis: **01.10.2027**
(verschoben — viele Quellen nennen weiterhin fälschlich 12/2026).

### Keine Wundvermessung oder -bewertung
Nach MDR 2017/745 und MDCG 2019-11 Rev. 1 gilt: Ein elektronischer Patientenakten-Ersatz ist
**kein** Medizinprodukt. Software, die „über Speichern, Archivieren, Kommunizieren und einfache
Suche hinaus" handelt, kann eines sein.

| Funktion | Einordnung |
|---|---|
| Foto aufnehmen, speichern, chronologisch anzeigen | kein Medizinprodukt |
| Freitext-Wundverlauf ohne Auswertung | kein Medizinprodukt |
| Manuelles Ausmessen mit Referenzmarker | Graubereich |
| **Automatische Wundsegmentierung/-vermessung** | **Medizinprodukt, Regel 11 ⇒ ab Klasse IIa** |
| **Wundklassifikation, Heilungsprognose, Verbandmittelempfehlung** | **Medizinprodukt IIa–IIb** |

Ab Klasse IIa ist eine Benannte Stelle einzubinden — Monate und fünfstellige Beträge.
Deshalb: Fotos ja, Auswertung nein.

### Local-first ist ein Vorteil, kein Rückstand
§ 393 SGB V regelt Cloud-Einsatz im Gesundheitswesen: seit 01.07.2025 ist ein
**C5-Typ-2-Testat** erforderlich, und zwar nach herrschender Auslegung für den SaaS-Anbieter
selbst (ein C5 des Hyperscalers genügt nicht). Verarbeitung nur in DE/EU, Niederlassung im
Inland. **Solange die App rein lokal läuft, entfällt das komplett.** Wer einen Server
einführt, holt sich diesen ganzen Block ins Haus — deshalb ist „erst Server, dann sehen wir"
die falsche Reihenfolge.

Hinzu kommt: 30 % des Marktes sind kirchliche Träger (Caritas/Diakonie) — die unterliegen
KDG bzw. DSG-EKD statt DSGVO, dort genügt ein DSGVO-AVV formal nicht.

### Wer ist verantwortlich?
Wenn eine Pflegekraft die App **beruflich mit echten Patientendaten** nutzt, ist der
**Pflegedienst** der datenschutzrechtlich Verantwortliche — nicht der Entwickler. Deshalb
gehört vor jeden Schritt Richtung „mehrere Nutzer" ein Gespräch mit der Pflegedienstleitung.

## Falls es doch mal größer werden soll

- **Förderung § 8 Abs. 8 SGB XI:** bis **12.000 €** einmaliger Zuschuss je zugelassener
  Einrichtung (40 % der Investition), ausdrücklich für Pflegedokumentationssoftware und
  mobile Datenerfassung. Läuft bis 31.12.2030, erst zu ~40 % abgerufen. Starker Vertriebshebel.
- **Regulatorischer Rückenwind:** TI-Anbindungspflicht seit 07/2025 (rund die Hälfte der
  Einrichtungen noch nicht angebunden), neue Maßstäbe und Grundsätze nach § 113 SGB XI ab
  07/2026, eigenverantwortliche Wundversorgung durch Pflegefachpersonen ab 01.01.2026.
- **Realistische Größenordnung** als Nebengeschäft: 20–50 kleine Dienste à 50–100 €/Monat.
  Für ein finanziertes Startup zu wenig, für ein Familienprojekt sehr viel.
- **Der nächste Schritt wäre nicht Code, sondern Gespräche:** Der Markt veröffentlicht keine
  Preise. Was ein kleiner Dienst wofür zahlen würde, erfährt man nur im Gespräch mit
  Pflegedienstleitungen — und genau diesen Zugang hat die Familie über Tante und Chefin bereits.
