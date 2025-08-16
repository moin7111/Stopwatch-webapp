# 🚀 MainTick/ModulTick Update Guide (v2)

## 📋 Übersicht

Dieses Update bringt umfassende Verbesserungen und neue Funktionen:

### 🎯 Wichtige Änderungen
- **Umbenennung**: Magician → MainTick, Spectator → ModulTick
- **Neue Force-Typen**: MS-Force, S-Force (Summe), FT-Force (Full Time)
- **Manuelle Eingabe**: Triple-Click für spontane Sequenzen
- **Presets**: Speicherbare Voreinstellungen mit Bedingungen
- **Erweiterte API**: Neue Endpunkte für alle Funktionen

## 🛠️ Update-Schritte

### 1. Backup erstellen
```bash
npm run db:backup
```

### 2. Code aktualisieren
```bash
git pull origin main
npm install
```

### 3. Datenbank-Migration ausführen
```bash
npm run db:update-v2
```

### 4. Server neu starten
```bash
npm start
```

## 🆕 Neue Funktionen

### Force-Typen

1. **MS-Force (Millisekunden)**
   - Setzt spezifische Millisekunden
   - Beispiel: 42 → 00:15,42

2. **S-Force (Summe)**
   - Quersumme der Zeit als Millisekunden
   - Beispiel: Force 20 → 00:02,18 (Summe=20)

3. **FT-Force (Full Time)**
   - Gesamte Zeit als Zahl
   - Beispiel: Force 2443 → 00:24,43

### Manuelle Eingabe
- **Triple-Click** auf Stoppuhr-Display
- Sequenzen eingeben (z.B. 11,22,33,44,55)
- Sofortige Anwendung ohne API

### Presets (Voreinstellungen)
- **MainTick**: Triple-Click auf "Löschen"-Button
- **ModulTick**: Triple-Click auf "Löschen"-Button (nur Auswahl)
- Speicherbare Sequenzen mit Bedingungen
- Auslöseverzögerungen (Sekunden, Stops, Runden, etc.)

### Bedingungen
- Nach X Sekunden
- Nach X Stops
- Nach X Runden
- Nach X mal Löschen
- Trigger: Stop, Runde oder Egal

## 📱 Neue URLs

- **MainTick Login**: `/maintick/login.html`
- **MainTick Dashboard**: `/maintick/dashboard.html`
- **MainTick Stopwatch**: `/maintick/stopwatch.html?token=TOKEN`
- **ModulTick**: `/modultick.html?token=TOKEN`

## 🔧 API-Änderungen

### Neue Endpunkte

```bash
# Presets erstellen
POST /api/presets
{
  "name": "Lotterie",
  "forceType": "ms",
  "forceSequence": [11,22,33,44,55],
  "conditions": {
    "type": "stops",
    "value": 2,
    "trigger": "stop"
  }
}

# Presets abrufen (für ModulTick)
GET /api/presets/TOKEN

# Force mit neuem Format
POST /api/data/TOKEN
{
  "force_type": "ft",
  "value": 2443,
  "trigger": "stop",
  "conditions": {
    "type": "seconds",
    "value": 5
  }
}
```

### Erweiterte Force-Daten
- `force_type`: "ms", "s", oder "ft"
- `value`: Force-Wert
- `trigger`: "stop", "lap", oder "both"
- `conditions`: Optionale Bedingungen
- `preset_name`: Preset per Name aktivieren

## ⚠️ Breaking Changes

1. **URLs geändert**: `/magician/*` → `/maintick/*`
2. **App-Parameter**: `app: "stopwatch"` → `app: "maintick"` oder `app: "modultick"`
3. **Force-Format**: `mode` → `force_type`, `target` → `value`

## 🔍 Fehlerbehebung

### Problem: Alte URLs funktionieren nicht
- Lösung: Verwende die neuen `/maintick/` und `/modultick.html` URLs

### Problem: Forces werden nicht angewendet
- Prüfe den `app` Parameter (maintick/modultick)
- Prüfe die Bedingungen (conditions)
- Stelle sicher, dass der richtige Trigger verwendet wird

### Problem: Presets werden nicht angezeigt
- Erstelle erst Presets in MainTick
- Prüfe ob der Token korrekt ist
- Lade die Seite neu

## 📚 Weitere Informationen

- **Hauptdokumentation**: README.md
- **Datenbankschema**: DATABASE_GUIDE.md
- **Projektstruktur**: PROJECT_STRUCTURE.md

---

Bei Fragen oder Problemen, bitte ein Issue auf GitHub erstellen!