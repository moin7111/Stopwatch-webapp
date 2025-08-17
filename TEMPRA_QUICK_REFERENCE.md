# Tempra/Tempral - Schnellreferenz

## URLs

- **Tempra** (Haupt-App): `/imperia/tempra/stopwatch.html`
- **Tempral** (Zuschauer): `/imperia-modul/tempral.html`
- **Force Update**: `/imperia/tempra/force-update.html`

## Triple-Click Funktionen

| Element | Tempra | Tempral |
|---------|--------|---------|
| Zeitanzeige | Manual Input (Force eingeben) | Manual Input (Force eingeben) |
| Wecker-Icon | Preset Manager (erstellen/bearbeiten) | Preset Auswahl (nur aktivieren) |
| Weltuhr-Icon | Routines öffnen | - |

## Force-Modi

1. **MS-Force**: Millisekunden setzen (0-99)
   - Beispiel: 10 → 00:04,10

2. **S-Force**: Quersumme durch MS-Änderung
   - Beispiel: 20 → sucht passende MS für Quersumme 20

3. **FT-Force**: Komplette Zeit (SSCC)
   - Beispiel: 2443 → 00:24,43

## Preset-Bedingungen

- **Zeitbasiert**: Nach X Sekunden
- **Aktionsbasiert**: Nach X Stops/Runden/Resets
- **Trigger**: Stop, Runde oder Egal (beide)

## API Types

- `'tempra'` - Volle Rechte (Force senden, Presets verwalten)
- `'tempral'` - Nur Lesen (Anzeige und Preset-Aktivierung)

## Tastenkombinationen

- **Start/Stop**: Rechter Button oder Leertaste
- **Runde/Löschen**: Linker Button
- **Manual Input**: Triple-Click auf Zeit
- **Presets**: Triple-Click auf Wecker

## Token-Speicherung

Token wird automatisch im localStorage als `tempra_token` gespeichert für:
- Schnellzugriff über Routines
- Wiederverbindung nach Reload
- Cross-App-Kommunikation