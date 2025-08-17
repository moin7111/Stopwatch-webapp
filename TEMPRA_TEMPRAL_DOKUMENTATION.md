# Tempra und Tempral - Vollständige System-Dokumentation

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Tempra - Die Haupt-Stoppuhr](#tempra---die-haupt-stoppuhr)
3. [Tempral - Die Zuschauer-App](#tempral---die-zuschauer-app)
4. [Architektur und Aufbau](#architektur-und-aufbau)
5. [Force-System](#force-system)
6. [Preset-System](#preset-system)
7. [API und Kommunikation](#api-und-kommunikation)
8. [UI-Code Dokumentation](#ui-code-dokumentation)

---

## Übersicht

**Tempra** und **Tempral** bilden zusammen ein professionelles Stoppuhr-System für Zauberer und Mentalisten. Das System ermöglicht es, Zeiten präzise zu manipulieren und vorherzusagen.

### Hauptmerkmale:
- **Tempra**: Hauptanwendung mit voller Kontrolle (für den Zauberer)
- **Tempral**: Zuschauer-Anwendung mit eingeschränktem Zugriff (für Assistenten/Publikum)
- **Force-System**: Drei Modi zur Zeitmanipulation (MS, S, FT)
- **Preset-Manager**: Vordefinierte Sequenzen mit Bedingungen
- **Echtzeit-Synchronisation**: Über API zwischen Geräten

### URLs:
- Tempra: `/imperia/tempra/stopwatch.html`
- Tempral: `/imperia-modul/tempral.html`
- Force Update: `/imperia/tempra/force-update.html`

---

## Tempra - Die Haupt-Stoppuhr

### Funktionen

Tempra ist die Hauptanwendung mit vollständigen Kontrollfunktionen:

1. **Stoppuhr-Funktionen**:
   - Start/Stop (rechter Button oder Leertaste)
   - Runde/Löschen (linker Button)
   - Weiter (Resume nach Stop)
   - Zeitanzeige im Format MM:SS,CC

2. **Force-Kontrolle**:
   - Direkter Zugriff auf alle Force-Modi
   - Manual Input über Triple-Click auf Zeitanzeige
   - Force-Queue-Verwaltung

3. **Preset-Verwaltung**:
   - Erstellen, Bearbeiten und Löschen von Presets
   - Aktivierung über Triple-Click auf Wecker-Icon
   - Komplexe Bedingungen und Sequenzen

4. **Navigation**:
   - Triple-Click auf Weltuhr → Routines-Bereich
   - Triple-Click auf Wecker → Preset Manager
   - Triple-Click auf Zeit → Manual Input

### Berechtigungen

Als Tempra-Nutzer hat man:
- Vollzugriff auf alle Funktionen
- Force senden und empfangen
- Presets erstellen und verwalten
- API-Token generieren
- Stoppuhr steuern

---

## Tempral - Die Zuschauer-App

### Funktionen

Tempral ist die eingeschränkte Zuschauer-Version:

1. **Anzeige-Funktionen**:
   - Echtzeit-Synchronisation mit Tempra
   - Anzeige der aktuellen Zeit
   - Anzeige von Runden (wenn vorhanden)
   - Statusmeldungen

2. **Eingeschränkte Interaktion**:
   - Manual Input (Triple-Click auf Zeit) - kann Forces eingeben
   - Preset-Auswahl (Triple-Click auf Wecker) - nur aktivieren, nicht bearbeiten
   - Keine Stoppuhr-Kontrolle (Start/Stop/Runde)

3. **Verbindung**:
   - Benötigt Token in URL (`?token=XXXXXX`)
   - Automatische Verbindung bei Start
   - Readonly-Modus

### Einschränkungen

- Kann keine Forces an Server senden
- Kann keine Presets erstellen/bearbeiten
- Keine Stoppuhr-Steuerung
- Nur Lese-Zugriff auf API

---

## Architektur und Aufbau

### Komponenten-Übersicht

```
┌─────────────────┐     ┌─────────────────┐
│     Tempra      │     │     Tempral     │
│  (Hauptapp)     │     │   (Zuschauer)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  API-Kommunikation    │
         └───────────┬───────────┘
                     │
              ┌──────┴──────┐
              │   Server    │
              │  (Node.js)  │
              └─────────────┘
```

### JavaScript-Module

1. **StopwatchCore** (`/js/stopwatch-core.js`):
   - Kernlogik der Stoppuhr
   - Zeit-Berechnungen
   - Force-Verarbeitung
   - UI-Updates

2. **StopwatchAPI** (`/js/stopwatch-api.js`):
   - API-Kommunikation
   - Polling für Updates
   - Force-Übertragung
   - Token-Verwaltung

3. **ManualInput** (`/js/manual-input.js`):
   - Modal für Force-Eingabe
   - Validierung der Eingaben
   - Unterstützt alle Force-Modi

4. **PresetManager** (`/js/preset-manager.js`):
   - Preset-Verwaltung
   - Bedingungen und Trigger
   - UI für Erstellung/Bearbeitung

### Dateistruktur

```
/public/
├── imperia/
│   └── tempra/
│       ├── stopwatch.html      # Tempra Hauptapp
│       ├── force-update.html   # Cache-Clear
│       └── dashboard.html      # Admin Dashboard
├── imperia-modul/
│   ├── tempral.html           # Tempral Zuschauer-App
│   ├── manifest.json          # PWA Manifest
│   └── sw.js                  # Service Worker
└── js/
    ├── stopwatch-core.js      # Kern-Funktionalität
    ├── stopwatch-api.js       # API-Kommunikation
    ├── manual-input.js        # Force-Eingabe
    └── preset-manager.js      # Preset-Verwaltung
```

---

## Force-System

Das Force-System ist das Herzstück der Zeitmanipulation. Es gibt drei Modi:

### 1. MS-Force (Millisekunden)

**Funktion**: Setzt die Millisekunden (Centisekunden) auf einen bestimmten Wert.

**Format**: 0-99

**Beispiele**:
- Force 10 → Zeit wird XX:XX,10
- Force 43 → Zeit wird XX:XX,43
- Force 00 → Zeit wird XX:XX,00

**Verwendung**: Für präzise Vorhersagen der letzten zwei Ziffern.

### 2. S-Force (Summe/Quersumme)

**Funktion**: Manipuliert nur die Millisekunden, um eine bestimmte Quersumme zu erreichen.

**Format**: Beliebige Zahl (Zielsumme)

**Beispiele**:
- Bei Zeit 00:12,34 und Force 20:
  - Aktuelle Quersumme: 0+0+1+2+3+4 = 10
  - System sucht nächste MS für Quersumme 20
  - Könnte z.B. 00:12,47 werden (0+0+1+2+4+7 = 14... weitersuchen)

**Besonderheit**: Kann fehlschlagen, wenn keine passende MS-Kombination in den nächsten 5 Sekunden gefunden wird.

### 3. FT-Force (Full Time)

**Funktion**: Setzt die komplette Zeit im SSCC Format.

**Format**: 4-stellige Zahl (SSCC)
- SS = Sekunden (00-59)
- CC = Centisekunden (00-99)

**Beispiele**:
- Force 2443 → Zeit wird 00:24,43
- Force 0512 → Zeit wird 00:05,12
- Force 5999 → Zeit wird 00:59,99

**Verwendung**: Für komplette Zeitvorhersagen.

### Force-Verarbeitung

1. **Force-Queue**: Forces werden in einer Warteschlange gespeichert
2. **Trigger-Bedingungen**: 
   - Stop: Force wird bei Stop ausgeführt
   - Runde: Force wird bei Rundenzeit ausgeführt
   - Egal: Force wird bei beiden ausgeführt
3. **Priorität**: First-In-First-Out (FIFO)

---

## Preset-System

Presets sind vordefinierte Force-Sequenzen mit optionalen Bedingungen.

### Preset-Struktur

```javascript
{
  name: "Lotterie-Vorhersage",
  forces: [
    { mode: "ms", target: 43 },
    { mode: "s", target: 20 },
    { mode: "ft", target: "2443" }
  ],
  condition: {
    type: "stops",      // oder "sekunden", "runden", "loeschen"
    value: 3,          // Nach 3 Stops
    trigger: "stop"    // oder "lap", "egal"
  }
}
```

### Bedingungstypen

1. **Zeitbasiert**: Nach X Sekunden
2. **Aktionsbasiert**:
   - Nach X Stops
   - Nach X Runden
   - Nach X Resets (Löschen)

### Trigger-Optionen

- **Stop**: Preset wird nur bei Stop-Aktion aktiviert
- **Runde**: Preset wird nur bei Runden-Aktion aktiviert
- **Egal**: Preset wird bei beiden Aktionen aktiviert

### Verwaltung

**In Tempra**:
- Vollzugriff auf Preset-Erstellung
- Bearbeiten und Löschen möglich
- Import/Export-Funktionen

**In Tempral**:
- Nur Lese-Zugriff
- Kann Presets aktivieren
- Keine Bearbeitung möglich

---

## API und Kommunikation

### Endpoints

Die API verwendet Token-basierte Authentifizierung:

1. **Daten abrufen**:
   ```
   GET /api/stopwatch/{type}/data/{token}
   ```
   - `type`: "tempra" oder "tempral"
   - Liefert aktuelle Forces und Presets

2. **Force senden** (nur Tempra):
   ```
   POST /api/stopwatch/tempra/force/{token}
   Body: { force: {...} }
   ```

3. **Manual Force** (beide):
   ```
   POST /api/stopwatch/{type}/manual-force/{token}
   Body: { force: {...} }
   ```

4. **Force bestätigen**:
   ```
   POST /api/stopwatch/{type}/ack/{token}
   Body: { forceId: "..." }
   ```

### Polling-Mechanismus

- Interval: 400ms
- Automatische Reconnection
- Force-Deduplizierung über localStorage
- Optimistisches UI-Update

### Token-Verwaltung

- Token wird in localStorage gespeichert
- Format: 6-stelliger Code (z.B. "CZVOVZ")
- Automatische Übernahme aus URL-Parameter
- Cross-App-Sharing möglich

---

## UI-Code Dokumentation

### Tempra UI (`/public/imperia/tempra/stopwatch.html`)

**Struktur**:
```html
<!DOCTYPE html>
<html lang="de">
<head>
    <!-- Meta Tags für PWA -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#000000">
    
    <!-- Manifest und Icons -->
    <link rel="manifest" href="/imperia/manifest.json">
    <link rel="icon" href="/icon-192x192.png">
    
    <!-- Styles -->
    <link rel="stylesheet" href="/css/stopwatch-ui.css?v=2024011501">
</head>
<body>
    <!-- Status Bar -->
    <div class="status-bar">
        <div id="statusText">&nbsp;</div>
    </div>

    <!-- Hauptcontainer -->
    <div class="stopwatch-container">
        <!-- Zeitanzeige (Triple-Click für Manual Input) -->
        <div class="time-display" id="timeDisplay">00:00,00</div>

        <!-- Steuerung -->
        <div class="controls">
            <button id="leftButton">Runde</button>
            <button id="rightButton">Start</button>
        </div>

        <!-- Rundenliste -->
        <div class="laps-container" id="lapsContainer"></div>
    </div>

    <!-- Navigation -->
    <div class="bottom-nav">
        <!-- Weltuhr (Triple-Click → Routines) -->
        <div class="nav-item" id="worldClockNavItem">...</div>
        
        <!-- Wecker (Triple-Click → Presets) -->
        <div class="nav-item" id="alarmNavItem">...</div>
        
        <!-- Stoppuhr (aktiv) -->
        <div class="nav-item active">...</div>
        
        <!-- Timer -->
        <div class="nav-item">...</div>
    </div>

    <!-- Dev Panel (versteckt, ?dev=1 zum Anzeigen) -->
    <div class="dev-panel" id="devPanel">
        <input id="tokenInput" placeholder="Token">
        <button id="connectBtn">Verbinden</button>
        <button id="clearBtn">Trennen</button>
    </div>

    <!-- Scripts -->
    <script src="/js/stopwatch-core.js?v=2024011501"></script>
    <script src="/js/manual-input.js?v=2024011501"></script>
    <script src="/js/stopwatch-api.js?v=2024011501"></script>
    <script src="/js/preset-manager.js?v=2024011501"></script>
    <script>
        // Initialisierung und Event-Handler
    </script>
</body>
</html>
```

**Wichtige Features**:

1. **Triple-Click Handler**:
   - Zeitanzeige → Manual Input
   - Wecker → Preset Manager
   - Weltuhr → Routines

2. **Auto-Connect**: 
   - URL-Parameter `?token=XXX`
   - Dev-Panel mit `?dev=1`

3. **PWA-Features**:
   - Service Worker Registration
   - Fullscreen-Support
   - Anti-Scroll/Zoom

### Tempral UI (`/public/imperia-modul/tempral.html`)

**Struktur**:
```html
<!DOCTYPE html>
<html lang="de">
<head>
    <!-- Ähnliche Meta-Tags wie Tempra -->
    <meta name="apple-mobile-web-app-title" content="Tempral">
    <link rel="manifest" href="/imperia-modul/manifest.json">
</head>
<body>
    <!-- Status Bar -->
    <div class="status-bar">
        <div id="statusText">&nbsp;</div>
    </div>

    <!-- Hauptcontainer (keine Kontrollen) -->
    <div class="stopwatch-container">
        <!-- Zeitanzeige (Triple-Click funktioniert) -->
        <div class="time-display" id="timeDisplay">00:00,00</div>

        <!-- Info Text -->
        <div class="view-only-info">
            <p>Zuschauer-Modus</p>
        </div>
    </div>

    <!-- Ergebnisse (wenn vorhanden) -->
    <div class="results-container" id="resultsContainer">
        <h2>Runden</h2>
        <div class="laps-list" id="lapsContainer"></div>
    </div>

    <!-- Navigation (eingeschränkt) -->
    <nav class="bottom-nav">
        <a href="#" id="worldClockNav">🌍 Weltuhr</a>
        <a href="#" id="alarmNavItem">⏰ Wecker</a>
        <a href="#" class="active">⏱️ Stoppuhr</a>
        <a href="#" id="timerNav">⏲️ Timer</a>
    </nav>

    <!-- Scripts (gleiche wie Tempra) -->
    <script>
        // Reduzierte Initialisierung
        // Nur Anzeige und eingeschränkte Features
    </script>
</body>
</html>
```

**Unterschiede zu Tempra**:

1. **Keine Steuertasten**: Dummy-Buttons für Initialisierung
2. **Readonly-Modus**: API-Type "tempral"
3. **Eingeschränkte Navigation**: Nur Wecker funktioniert
4. **Zuschauer-Info**: Visueller Hinweis auf Modus

### CSS-Klassen (wichtigste)

```css
.time-display {
    font-size: 80px;
    font-weight: 200;
    text-align: center;
    cursor: pointer; /* Für Triple-Click */
}

.control-button {
    /* Dynamische Klassen */
    .left-idle { opacity: 0.5; }
    .left-lap { background: #007AFF; }
    .left-reset { background: #FF453A; }
    .right-start { background: #30D058; }
    .right-stop { background: #FF453A; }
    .right-resume { background: #007AFF; }
}

.preset-modal,
.manual-input-modal {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
}

.preset-modal.show,
.manual-input-modal.show {
    opacity: 1;
    visibility: visible;
}
```

### JavaScript-Initialisierung

**Tempra**:
```javascript
// Vollständige Initialisierung
const stopwatch = new StopwatchCore();
let api = null;

// UI-Elemente verbinden
stopwatch.initUI({
    timeDisplay: document.getElementById('timeDisplay'),
    leftButton: document.getElementById('leftButton'),
    rightButton: document.getElementById('rightButton'),
    lapsContainer: document.getElementById('lapsContainer'),
    statusText: document.getElementById('statusText')
});

// Triple-Click Handler
// API-Verbindung
// Service Worker
```

**Tempral**:
```javascript
// Reduzierte Initialisierung
const stopwatch = new StopwatchCore();

// Dummy-Buttons für Kompatibilität
const dummyButton = document.createElement('button');
dummyButton.style.display = 'none';

stopwatch.initUI({
    timeDisplay: document.getElementById('timeDisplay'),
    leftButton: dummyButton,  // Dummy
    rightButton: dummyButton, // Dummy
    lapsContainer: document.getElementById('lapsContainer'),
    statusText: document.getElementById('statusText')
});

// Nur API-Polling, keine Kontrolle
if (tokenParam) {
    api = new StopwatchAPI(tokenParam, 'tempral');
    api.startPolling(stopwatch);
}
```

---

## Zusammenfassung

Das Tempra/Tempral-System ist eine ausgeklügelte Lösung für professionelle Zeitmanipulation:

- **Tempra** bietet volle Kontrolle für den Performer
- **Tempral** ermöglicht sichere Zuschauer-Teilnahme
- **Force-System** mit drei flexiblen Modi
- **Preset-Manager** für komplexe Sequenzen
- **Echtzeit-Synchronisation** über moderne Web-APIs
- **PWA-Fähigkeiten** für App-ähnliche Erfahrung

Das System ist modular aufgebaut und kann leicht erweitert werden. Die klare Trennung zwischen Haupt- und Zuschauer-App gewährleistet Sicherheit und verhindert unbeabsichtigte Manipulation.