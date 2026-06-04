# Wärmepumpen Rechner

Web-App Rechner ab wann sich eine Wärmepumpe lohnt

## Funktionen

- Vergleich "Alte Heizung" & "WP Später"
- Ab 2045 Gas/Öl Abschaltung - Umstieg auf Wärmepumpe modellierbar

## Tech-Stack

- Vue 3: (global build, per CDN) - kein Build-Schritt
- Tailwind CSS: (Play-CDN)
- Chart.js: (CDN)


## Projektstruktur

```
index.html   - Oberfläche (Vue-Templates, Tailwind)
calc.js      - Berechnungslogik (auch unter Node testbar)
app.js       - Vue-App, Diagramm, Formatierung
tools/       - Hilfsskripte (ODS einlesen, Berechnung testen)
```

## Development

- Kein Build benötigt. 
- wegen `file://`-Einschränkungen getrennten JS-Dateien

```bash
python3 -m http.server 8000
# in Browser http://localhost:8000
```

### Berechnung testen (optional, Node)

```bash
node tools/test_calc.js
```

### ODS-Datei neu einlesen (optional, Python)

Basiert auf einem Excel-Tool.
Falls die `.ods`-Quelle erneut analysiert werden soll:

```bash
python3 -m venv .venv
.venv/bin/pip install pandas odfpy
.venv/bin/python tools/read_ods.py
```

## Rechenmodell & Annahmen

Pro Jahr `i` (ab Startjahr):
- `Brennstoffpreis = Preis × (1 + Preissteigerung)^i`
- `Strompreis = Strompreis × (1 + Preissteigerung)^i`
- **Nutzwärmebedarf** = `Jahresverbrauch × Wirkungsgrad`
  (z. B. 20 000 kWh Gas × 0,8 = 16 000 kWh Wärme).
- **Bestehende Heizung:** `Jahresverbrauch × Brennstoffpreis` (im Startjahr zzgl. Kaufpreis Heizung).
- **Wärmepumpe:** `Nutzwärmebedarf / JAZ × Strompreis`; im Einbaujahr zzgl. `Kaufpreis × (1 - Förderung)`.
- **Vorteil gesamt** = kumulierte Kosten „Alt" - kumulierte Kosten „WP Sofort".
- **Gas zu Öl**: Faktor `10,9`. 1 Liter Öl --> `10,9kWh`

- **Prozent-Eingaben:** Raten/Anteile in Prozent (2 % = `0.02`). 
- **Späterer WP-Einbau (Checkbox):** Standardmäßig deaktiviert. Modelliert den Gas-/Öl-Ausstieg ab 2045.
- **Wärmebedarf aus Verbrauch:** Wärmebedarf = `Jahresverbrauch × Wirkungsgrad`.
- **Neuer Wärmebedarf (optional):** Für „WP Später" kann ein abweichender Wärmebedarf (kWh) angegeben werden (z. B. nach Dämmung). Leer = wie heute.
- **Förderung** Anteil 55% (`0.55` = 55 %).
- **Zinsen:** Anlagezins auf die jährliche Differenz. Mit `0` (Standard) bleibt der Effekt aus und die App entspricht exakt der ODS-Tabelle. Werte > 0 verzinsen die bisher gesparten/mehr ausgegebenen Beträge (Opportunitätskosten).
- **Preise** pro kWh und Liter in €; ohne Mehrwertsteuer-Sonderfälle.
- **Heizungsart**: Label

Alle Angaben ohne Gewähr.
