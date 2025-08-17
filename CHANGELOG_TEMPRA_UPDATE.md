# Tempra/Tempral System Update - Änderungsdokumentation

**Datum**: 2024-01-15  
**Entwickler**: AI Assistant

## Übersicht

Komplette Überarbeitung des Stoppuhr-Systems von MainTick/ModulTick zu Tempra/Tempral mit Behebung von Funktionsfehlern und Implementierung neuer Features.

## 1. Namensänderungen und Struktur

### Alte Struktur (ENTFERNT)
- **MainTick**: Haupt-Stoppuhr für Zauberer → `/maintick/`
- **ModulTick**: Zuschauer-Stoppuhr → `/modultick/` bzw. `/imperia-modul/`

### Neue Struktur
- **Tempra**: Haupt-Stoppuhr für Zauberer → `/imperia/tempra/`
- **Tempral**: Zuschauer-Stoppuhr → `/imperia-modul/tempral.html`

## 2. Behobene Probleme

### 2.1 Weiter-Button funktionierte nicht korrekt

**Problem**: Nach dem Stoppen der Stoppuhr setzte der "Weiter"-Button die Rundenzeit nicht korrekt fort.

**Ursache**: Die aktuelle Rundenzeit wurde beim Stoppen nicht korrekt gespeichert für das spätere Fortsetzen.

**Lösung**:
- Neue Variable `currentLapElapsed` in `StopwatchCore` eingeführt
- Speichert die verstrichene Zeit der aktuellen Runde beim Stoppen
- Beim "Weiter" wird diese Zeit verwendet, um die Runde korrekt fortzusetzen

```javascript
// In stopStopwatch():
this.currentLapElapsed = lapDuration; // Speichere für Resume

// In startStopwatch() bei Resume:
this.currentLapStartTime = this.startTime - this.currentLapElapsed;
```

### 2.2 Service Worker Cache-Probleme

**Problem**: Alte JavaScript-Dateien wurden aus dem Cache geladen, neue Funktionen waren nicht verfügbar.

**Lösung**:
- Service Worker Version erhöht auf `v5-2024-01-15`
- JavaScript und CSS werden bevorzugt frisch vom Server geladen
- Aggressivere Cache-Löschung implementiert
- Cache-Busting durch Versionsnummern in URLs (`?v=2024011501`)

### 2.3 API Type-Probleme

**Problem**: Tempra verwendete noch den alten Type `'maintick'`, wodurch API-Funktionen nicht funktionierten.

**Lösung**:
- Tempra verwendet jetzt Type `'tempra'`
- Tempral verwendet Type `'tempral'`
- API-Funktionen akzeptieren beide Types mit unterschiedlichen Berechtigungen

## 3. Implementierte Features

### 3.1 Force-System (Vollständig implementiert)

Drei Force-Modi sind verfügbar:

1. **MS-Force (Millisekunden)**
   - Setzt die Millisekunden auf einen bestimmten Wert
   - Beispiel: Force 10 → Zeit wird 00:04,10

2. **S-Force (Summe/Quersumme)**
   - Ändert nur die Millisekunden, um die gewünschte Quersumme zu erreichen
   - Beispiel: Force 20 → Zeit wird 00:02,18 (2+1+8=11... sucht passende MS)
   - Wenn keine passende Millisekunde gefunden wird, findet kein Force statt

3. **FT-Force (Full Time)**
   - Setzt die komplette Zeit im SSCC Format
   - Beispiel: Force 2443 → Zeit wird 00:24,43

### 3.2 Manual Input

- **Aktivierung**: Triple-Click auf die Zeitanzeige
- **Funktionsweise**: 
  - Zahlen können sequenziell eingegeben werden
  - Enter fügt zur Liste hinzu
  - Auswahl des Force-Modus (MS, S, FT)
  - Forces werden der Reihe nach angewendet
- **Verfügbar in**: Sowohl Tempra als auch Tempral

### 3.3 Preset-System mit Bedingungen

**Features**:
- Presets können in Tempra erstellt und gespeichert werden
- Komplexe Sequenzen mit mehreren Forces
- Bedingungen:
  - Nach X Sekunden
  - Nach X Stops
  - Nach X Runden
  - Nach X Resets
- Trigger-Optionen:
  - Stop
  - Runde
  - Egal (beide)

**Tempral-Zugriff**:
- Triple-Click auf Wecker öffnet Preset-Auswahl (Read-Only)
- Kann Presets nur aktivieren, nicht bearbeiten

### 3.4 API-Verbindung

- Tempra und Tempral kommunizieren über die API
- Tempral empfängt Echtzeit-Updates von Tempra
- Bidirektionale Kommunikation für zukünftige Features vorbereitet

## 4. Code-Änderungen im Detail

### 4.1 JavaScript-Dateien

**`/public/js/stopwatch-core.js`**:
- Kommentare von "MainTick und ModulTick" zu "Tempra" geändert
- `currentLapElapsed` Variable hinzugefügt für korrektes Resume
- Triple-Click Handler bleibt unverändert

**`/public/js/stopwatch-api.js`**:
- Default Type von `'modultick'` auf `'tempra'` geändert
- API-Endpoints von `/maintick/` auf `/tempra/` geändert
- Type-Checks für Tempral hinzugefügt (eingeschränkte Rechte)
- Token-Parameter modernisiert (primaryToken/secondaryToken)

**`/public/js/manual-input.js`**:
- Type-Checks entfernt (funktioniert jetzt für alle)

**`/public/js/preset-manager.js`**:
- `showReadOnly()` Methode für Tempral hinzugefügt
- `openReadOnly()` statische Methode implementiert

### 4.2 HTML-Dateien

**`/public/imperia/tempra/stopwatch.html`**:
- Manifest-Link korrigiert auf `/imperia/manifest.json`
- Service Worker auf `/imperia/sw.js` geändert
- Remote-Mode Code entfernt (wird nicht mehr benötigt)
- Token-Speicherung im localStorage hinzugefügt

**`/public/imperia-modul/tempral.html`**:
- Komplett neu erstellt als eigenständige Zuschauer-App
- Eigenes Manifest und Service Worker
- Keine Kontrollen, nur Anzeige
- Triple-Click Features aktiviert

**Control System Updates**:
- `routines.html`: Token-Handling verbessert, localStorage-Support
- `instructions.html`: Dokumentation aktualisiert
- `settings.html`: URLs von MainTick/ModulTick auf Tempra/Tempral geändert

### 4.3 Manifest und Service Worker

**`/public/imperia/manifest.json`**:
- Bereits korrekt konfiguriert für IMPERIA Control System

**`/public/imperia-modul/manifest.json`**:
- Neu erstellt für Tempral als eigenständige PWA

**Service Worker**:
- Beide Service Worker mit aggressiverem Caching
- JavaScript/CSS Bypass für frische Versionen

## 5. Entfernte Komponenten

- `/public/imperia-modul/` Verzeichnis (alte ModulTick Version)
- Remote-Mode aus Tempra (durch Tempral ersetzt)
- Alle MainTick/ModulTick Referenzen

## 6. Token-Management

**Verbesserungen**:
1. Token wird im localStorage gespeichert bei:
   - Automatischer Verbindung über URL
   - Manueller Eingabe

2. Routines-Seite:
   - Prüft zuerst localStorage
   - Falls nicht vorhanden, holt von API
   - Speichert für zukünftige Verwendung
   - Leitet zu Login wenn kein Token verfügbar

## 7. Bekannte Einschränkungen

1. **Tempral** (Zuschauer-App):
   - Kann keine Forces senden
   - Kann keine Presets erstellen/bearbeiten
   - Nur Anzeige und Preset-Aktivierung

2. **Force-System**:
   - S-Force kann fehlschlagen wenn keine passende MS-Kombination existiert
   - FT-Force akzeptiert nur 4-stellige Zahlen (SSCC Format)

## 8. Test-Empfehlungen

1. **Cache leeren**: `/imperia/tempra/force-update.html` aufrufen
2. **Grundfunktionen testen**:
   - Start/Stop/Weiter/Runde/Löschen
   - Triple-Click für Manual Input
   - Triple-Click auf Wecker für Presets
3. **Force-Modi testen**: Alle drei Modi durchprobieren
4. **Token-Persistenz**: Seite neu laden, Token sollte gespeichert sein

## 9. Migration von alten Installationen

Nutzer mit alten MainTick/ModulTick Installationen sollten:
1. Alle Browser-Caches leeren
2. Service Worker deregistrieren
3. Neue URLs verwenden:
   - Tempra: `/imperia/tempra/stopwatch.html`
   - Tempral: `/imperia-modul/tempral.html`
4. Apps neu als PWA installieren

## 10. Zukünftige Verbesserungen

- [ ] Preset-Synchronisation zwischen Geräten
- [ ] Erweiterte Bedingungen für Presets
- [ ] Statistiken und Verlauf
- [ ] Offline-Synchronisation