# Lösung für das Datenbank-Persistenz-Problem

## Problem
Nach dem Neustart des Host-Servers verschwinden Benutzerkonten und man muss sich komplett neu mit einem Lizenzcode anmelden.

## Ursache
Die Hauptursache des Problems ist, dass die SQLite-Datenbank (`imperia_magic.db`) nicht persistent gespeichert wird. Bei jedem Neustart des Servers/Containers wird die Datenbank neu erstellt, wodurch alle Benutzerdaten verloren gehen.

Zusätzlich wurde festgestellt:
- Das Log-Verzeichnis existiert nicht, wodurch keine Logs geschrieben werden
- Die Datenbank wird im lokalen Dateisystem gespeichert, das bei Container-Neustarts verloren geht

## Implementierte Lösung

### 1. Persistente Datenspeicherung
- Neues Verzeichnis `/workspace/data` für persistente Daten
- Datenbank wird jetzt unter `/workspace/data/imperia_magic.db` gespeichert
- Automatische Migration von bestehenden Datenbanken

### 2. Datenbank-Check-Skript (`/workspace/scripts/check-database.sh`)
Dieses Skript:
- Prüft beim Start, ob eine persistente Datenbank existiert
- Stellt die Datenbank aus dem persistenten Speicher wieder her
- Erstellt automatische Backups
- Protokolliert alle Aktionen

### 3. Backup/Restore-System (`/workspace/scripts/backup-restore.sh`)
Funktionen:
- `./backup-restore.sh backup` - Erstellt manuelles Backup
- `./backup-restore.sh restore` - Stellt Datenbank aus Backup wieder her
- `./backup-restore.sh list` - Zeigt alle verfügbaren Backups
- `./backup-restore.sh auto-backup` - Für automatische Backups (Cron)

### 4. Docker-Unterstützung
- Docker Compose Konfiguration mit persistenten Volumes
- Dockerfile mit allen notwendigen Abhängigkeiten
- Startup-Skript für automatische Initialisierung

### 5. Modifizierte Datenbank-Klasse
Die `Database` Klasse nutzt jetzt automatisch den persistenten Speicherort, wenn verfügbar.

## Verwendung

### Für Docker/Container-Umgebungen:
```bash
# Mit Docker Compose starten
docker-compose up -d

# Die Daten bleiben in Docker Volumes erhalten:
# - imperia-data (für Datenbank)
# - imperia-logs (für Log-Dateien)
```

### Für normale Server:
```bash
# Server mit Startup-Skript starten
./scripts/startup.sh

# Oder direkt:
node server.js
```

### Backup erstellen:
```bash
./scripts/backup-restore.sh backup
```

### Backup wiederherstellen:
```bash
./scripts/backup-restore.sh restore
```

## Automatische Features

1. **Startup-Checks**: Bei jedem Start wird die Datenbank-Persistenz überprüft
2. **Auto-Migration**: Bestehende Datenbanken werden automatisch migriert
3. **Backup-Rotation**: Alte Backups werden automatisch gelöscht (behält die letzten 10)
4. **Logging**: Alle Aktionen werden protokolliert in `/workspace/data/database-check.log`

## Wichtige Verzeichnisse

- `/workspace/data/` - Persistente Daten (Datenbank, Backups)
- `/workspace/data/backups/` - Datenbank-Backups
- `/workspace/logs/` - Server-Logs (wenn aktiviert)

## Empfehlungen

1. **Regelmäßige Backups**: Richten Sie einen Cron-Job ein:
   ```bash
   0 2 * * * /workspace/scripts/backup-restore.sh auto-backup
   ```

2. **Volume-Backups**: Sichern Sie regelmäßig das `/workspace/data` Verzeichnis

3. **Monitoring**: Überwachen Sie die Log-Dateien auf Fehler

## Fehlerbehebung

Falls die Datenbank trotzdem verloren geht:
1. Prüfen Sie die Backups: `./scripts/backup-restore.sh list`
2. Stellen Sie das neueste Backup wieder her
3. Überprüfen Sie die Logs in `/workspace/data/database-check.log`
4. Stellen Sie sicher, dass die Docker Volumes korrekt gemountet sind