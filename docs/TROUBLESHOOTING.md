# 🔧 Troubleshooting Guide - Imperia Magic Server

## 🚨 Problem: Benutzerkonto verschwindet nach Server-Neustart

### Symptome:
- Nach einem Server-Neustart sind alle Benutzerkonten weg
- Man muss sich erneut mit dem Lizenz-Code registrieren
- Alle Sessions sind verloren
- Die Anwendung verhält sich wie eine Neuinstallation

### Hauptursache:
Die SQLite-Datenbank wird **nicht persistent gespeichert** und geht bei jedem Neustart verloren.

## 🎯 Lösung:

### 1. Mit Docker Compose (Empfohlen)

Starten Sie den Server mit Docker Compose:

```bash
docker-compose up -d
```

Dies stellt sicher, dass die Volumes korrekt gemountet werden:
- `imperia-data` → `/workspace/data` (für Datenbank)
- `imperia-logs` → `/workspace/logs` (für Logs)

Überprüfen Sie die Volumes:
```bash
docker volume ls | grep imperia
docker volume inspect imperia-data
```

### 2. Ohne Docker

Setzen Sie einen persistenten Datenbankpfad:

```bash
# Option 1: Umgebungsvariable
export DATA_DIR=/var/lib/imperia-magic
# oder
export DB_PATH=/var/lib/imperia-magic/imperia_magic.db

# Verzeichnis erstellen und Berechtigungen setzen
sudo mkdir -p /var/lib/imperia-magic
sudo chown $USER:$USER /var/lib/imperia-magic

# Server starten
node server.js
```

### 3. Systemd Service (für Linux-Server)

Erstellen Sie `/etc/systemd/system/imperia-magic.service`:

```ini
[Unit]
Description=Imperia Magic Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/imperia-magic
Environment="NODE_ENV=production"
Environment="DATA_DIR=/var/lib/imperia-magic"
Environment="PORT=3000"
ExecStart=/usr/bin/node /opt/imperia-magic/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:
```bash
sudo systemctl daemon-reload
sudo systemctl enable imperia-magic
sudo systemctl start imperia-magic
```

## 🔍 Diagnose-Schritte:

### 1. Datenbank-Status prüfen

```bash
# Prüfen ob Datenbank existiert
ls -lh /workspace/data/imperia_magic.db

# Oder mit custom Pfad
ls -lh $DATA_DIR/imperia_magic.db
```

### 2. Logs überprüfen

```bash
# Server-Logs
tail -n 100 /workspace/logs/server-*.log

# Auth-Logs (Login-Versuche)
tail -n 100 /workspace/logs/auth-*.log

# Error-Logs
tail -n 100 /workspace/logs/error-*.log

# Database-Check Log
tail -n 100 /workspace/data/database-check.log
```

### 3. Session-Wiederherstellung prüfen

Im Server-Log sollte beim Start stehen:
```
🔄 Restoring sessions from database...
✅ Restored X active sessions from database
```

Wenn dort "0 active sessions" steht, ist die Datenbank leer/neu.

### 4. Datenbankpfad im Log

Beim Start loggt der Server den verwendeten Datenbankpfad:
```
📁 Using database storage: /workspace/data/imperia_magic.db
🗄️ Database: SQLite (/workspace/data/imperia_magic.db)
```

## 🛡️ Präventive Maßnahmen:

### 1. Regelmäßige Backups

Fügen Sie einen Cron-Job hinzu:
```bash
# Crontab editieren
crontab -e

# Tägliches Backup um 3 Uhr nachts
0 3 * * * cp /workspace/data/imperia_magic.db /backup/imperia_magic_$(date +\%Y\%m\%d).db
```

### 2. Monitoring

Überwachen Sie die Datenbankgröße:
```bash
# Check-Skript
#!/bin/bash
DB_PATH="/workspace/data/imperia_magic.db"
if [ ! -f "$DB_PATH" ]; then
    echo "CRITICAL: Database not found!"
    # Alert senden
fi
```

### 3. Docker Health Check

Fügen Sie in `docker-compose.yml` hinzu:
```yaml
healthcheck:
  test: ["CMD", "test", "-f", "/workspace/data/imperia_magic.db"]
  interval: 5m
  timeout: 10s
  retries: 3
```

## 📝 Wichtige Hinweise:

1. **Frontend-Storage**: `localStorage` wird nur für UX verwendet, die echte Authentifizierung erfolgt über Cookie + Datenbank

2. **Session-Dauer**: Sessions laufen 30 Tage, aber ohne Datenbank-Eintrag können sie nicht wiederhergestellt werden

3. **Entwicklung vs. Produktion**: In der Entwicklung kann die lokale DB verwendet werden, in Produktion MUSS ein persistenter Pfad konfiguriert werden

## 🆘 Notfall-Wiederherstellung:

Falls Sie ein Backup haben:
```bash
# Backup wiederherstellen
cp /backup/imperia_magic_20240815.db /workspace/data/imperia_magic.db

# Server neu starten
docker-compose restart
# oder
systemctl restart imperia-magic
```

## 📞 Support:

Bei weiteren Problemen prüfen Sie:
1. Die vollständigen Server-Logs
2. Die Berechtigungen des data-Verzeichnisses
3. Den verfügbaren Speicherplatz
4. Die Docker-Volume-Konfiguration

---

*Letzte Aktualisierung: August 2024*