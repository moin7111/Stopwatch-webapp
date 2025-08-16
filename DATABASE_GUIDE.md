# 🗄️ Database Guide - Stopwatch Magic Webapp

## 📋 Overview

Das Projekt wurde von JSON-Dateien auf eine **SQLite-Datenbank** umgestellt für bessere Performance, Skalierbarkeit und erweiterte Features wie User Settings und Audit Logging.

## 🏗️ Database Schema

### 📊 **Haupt-Tabellen:**

#### **users** - Benutzer-Authentication
```sql
- id (PRIMARY KEY) - Auto-increment User ID
- username (UNIQUE) - Benutzername (lowercase)
- display_name - Anzeigename für UI
- email - E-Mail (für zukünftige Features)
- password_hash - scrypt-gehashtes Passwort
- salt - Random Salt für Passwort
- created_at / updated_at - Timestamps
- last_login - Letzter Login-Zeitpunkt
- is_active - Account Status
- is_admin - Admin-Berechtigung
```

#### **licenses** - Lizenzcode-Management
```sql
- id (PRIMARY KEY) - License ID
- code (UNIQUE) - 6-stelliger Lizenzcode
- created_at - Erstellungszeitpunkt
- used_at - Zeitpunkt der Nutzung
- used_by_user_id - Welcher User hat den Code verwendet
- is_used - Status (0/1)
- expires_at - Ablaufdatum (für Premium)
- license_type - 'standard', 'premium', etc.
```

#### **tokens** - API-Token für Stoppuhr-Steuerung
```sql
- id (PRIMARY KEY) - Token ID
- token (UNIQUE) - 6-stelliger Token (z.B. CZVOVZ)
- user_id - Besitzer des Tokens
- created_at - Erstellungszeitpunkt
- last_used - Letzte Nutzung
- is_active - Token Status
```

#### **force_queue** - Force-Warteschlange
```sql
- id (PRIMARY KEY) - Queue Entry ID
- token_id - Zu welchem Token gehört die Force
- force_id (UNIQUE) - UUID für die Force
- force_data (JSON) - Komplette Force-Daten
- created_at - Zeitpunkt der Erstellung
- is_processed - Ob Force verarbeitet wurde
- processed_at - Zeitpunkt der Verarbeitung
```

### ⚙️ **Settings-Tabellen:**

#### **user_settings** - Persönliche Einstellungen
```sql
- id (PRIMARY KEY)
- user_id - Benutzer-ID
- setting_key - Name der Einstellung (z.B. 'theme')
- setting_value - Wert (JSON oder String)
- created_at / updated_at
- UNIQUE(user_id, setting_key)
```

#### **webapp_settings** - App-spezifische Einstellungen
```sql
- id (PRIMARY KEY)
- user_id - Benutzer-ID
- app_type - App-Typ ('stopwatch', 'fakebrowser', etc.)
- setting_key - Einstellungs-Name
- setting_value - Wert (JSON oder String)
- created_at / updated_at
- UNIQUE(user_id, app_type, setting_key)
```

### 🔐 **Erweiterte Tabellen:**

#### **sessions** - Session-Management
```sql
- id (PRIMARY KEY)
- session_id (UNIQUE) - UUID für Session
- user_id - Benutzer-ID
- created_at / last_activity - Zeitstempel
- expires_at - Ablaufzeit
- ip_address / user_agent - Client-Info
- is_active - Session Status
```

#### **audit_log** - Sicherheits-Audit
```sql
- id (PRIMARY KEY)
- user_id - Benutzer (optional)
- action - Aktion ('login', 'force_applied', etc.)
- details (JSON) - Zusätzliche Kontext-Daten
- ip_address / user_agent - Client-Info
- created_at - Zeitstempel
```

## 🚀 Setup & Migration

### **Erstinstallation:**
```bash
# Dependencies installieren
npm install

# Database initialisieren
npm run db:test

# Server starten
npm start
```

### **Migration von JSON zu SQL:**
```bash
# Bestehende JSON-Daten migrieren
npm run db:migrate

# Nach erfolgreichem Test: JSON-Backups in data/backup/
```

### **Database-Scripts:**
```bash
npm run db:test      # Database-Verbindung testen
npm run db:migrate   # JSON → SQL Migration
npm run db:backup    # Database-Backup erstellen
```

## 🔌 API-Erweiterungen

### **User Settings API:**

#### **Get User Settings:**
```bash
GET /api/user/settings
Cookie: MAGIC_SESSION=session_id

Response:
{
  "settings": {
    "theme": "dark",
    "notifications": {"email": true, "push": false},
    "language": "de"
  }
}
```

#### **Set User Setting:**
```bash
POST /api/user/settings
Cookie: MAGIC_SESSION=session_id
Content-Type: application/json

Body:
{
  "key": "theme",
  "value": "dark"
}

Response: {"ok": true}
```

### **Webapp Settings API:**

#### **Get Webapp Settings:**
```bash
GET /api/webapp/stopwatch/settings
Cookie: MAGIC_SESSION=session_id

Response:
{
  "settings": {
    "precision": "10",
    "auto_lap_count": "5",
    "display_format": "MM:SS,CC"
  }
}
```

#### **Set Webapp Setting:**
```bash
POST /api/webapp/stopwatch/settings
Cookie: MAGIC_SESSION=session_id
Content-Type: application/json

Body:
{
  "key": "precision",
  "value": "centiseconds"
}

Response: {"ok": true}
```

## 📊 Database-Klasse (database/db.js)

### **Wichtige Methoden:**

#### **User Management:**
```javascript
await db.createUser({username, displayName, email, password})
await db.getUserByUsername(username)
await db.getUserById(id)
await db.updateUserLastLogin(userId)
```

#### **License Management:**
```javascript
await db.createLicenses(count)
await db.getLicenseByCode(code)
await db.useLicense(code, userId)
```

#### **Token Management:**
```javascript
await db.createToken(userId)
await db.getTokenByValue(token)
await db.getTokensByUserId(userId)
```

#### **Force Queue:**
```javascript
await db.addForceToQueue(token, forceId, forceData)
await db.getForceQueue(token)
await db.acknowledgeForce(token, forceId)
```

#### **Settings:**
```javascript
await db.setUserSetting(userId, key, value)
await db.getUserSettings(userId)
await db.setWebappSetting(userId, appType, key, value)
await db.getWebappSettings(userId, appType)
```

#### **Audit & Sessions:**
```javascript
await db.logAction(userId, action, details, ip, userAgent)
await db.createSession(userId, sessionId, expiresAt, ip, userAgent)
await db.getSession(sessionId)
```

## 🔄 Migration Details

### **Was wurde migriert:**
✅ **Alle bestehenden User** (mit Passwort-Hashes)  
✅ **Alle Lizenzcodes** (genutzt + ungenutzt)  
✅ **Alle Tokens** (mit Besitzer-Zuordnung)  
✅ **Force-Queues** (aktive Forces übertragen)

### **Backup-System:**
- **Automatisches Backup** der JSON-Dateien nach `data/backup/`
- **Zeitstempel-basierte Dateinamen** 
- **Originale bleiben erhalten** bis manuelle Löschung

### **Rollback-Möglichkeit:**
Falls Probleme auftreten, können die JSON-Dateien aus `data/backup/` zurückkopiert und der alte Server-Code wiederhergestellt werden.

## ⚡ Performance-Optimierungen

### **Database-Indizes:**
- **Username/Email Lookups** (Login)
- **Token-basierte Zugriffe** (API)
- **Force-Queue-Abfragen** (Polling)
- **Settings-Lookups** (User/Webapp)

### **Prepared Statements:**
- **Alle SQL-Queries** verwenden Parameter-Binding
- **Schutz vor SQL-Injection**
- **Bessere Performance** bei wiederholten Queries

### **Connection Pooling:**
- **Persistente DB-Verbindung** während Server-Laufzeit
- **Graceful Shutdown** bei SIGINT/SIGTERM
- **Error Handling** und Reconnection

## 🔐 Sicherheits-Features

### **Enhanced Session Management:**
- **UUID-basierte Session-IDs**
- **Ablaufzeit-Management** (24h Standard)
- **IP/User-Agent Tracking**
- **Database-persistierte Sessions**

### **Audit Logging:**
- **Alle wichtigen Aktionen** werden geloggt
- **User-Login/Logout**
- **Force-Erstellung/Acknowledgment**
- **Settings-Änderungen**
- **IP/User-Agent-Erfassung**

### **Password Security:**
- **scrypt-Hashing** (weiterhin)
- **Random Salts** pro User
- **Timing-Safe-Vergleiche**

## 🚀 Production-Bereitschaft

### **SQLite → PostgreSQL Upgrade:**
```bash
# Das Schema ist PostgreSQL-kompatibel
# Für Production einfach Database-Klasse erweitern:
# - Connection String anpassen
# - Minor SQL-Anpassungen (AUTOINCREMENT → SERIAL)
```

### **Umgebungsvariablen:**
```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname  # für PostgreSQL
ADMIN_KEY=your-secret-admin-key
NODE_ENV=production
```

### **Monitoring & Backup:**
```bash
# Tägliche Backups
0 2 * * * npm run db:backup

# Database Health Check
curl http://localhost:3000/api/status
```

## 📈 Zukünftige Erweiterungen

### **Geplante Features:**
- **Multi-Tenancy** (Organisation-basierte Isolation)
- **Role-based Access Control** (Admin/User/Viewer)
- **API Rate Limiting** (pro User/Token)
- **Real-time WebSocket** (Push statt Polling)
- **Advanced Analytics** (Force-Usage-Statistiken)

### **Schema-Migration-System:**
```javascript
// database/migrations/001_add_organizations.sql
// database/migrations/002_add_user_roles.sql
// Versionierte Schema-Updates
```

---

## 🆘 Troubleshooting

### **Häufige Probleme:**

#### **"Database not initialized"**
```bash
# Lösung: Server neu starten
npm start
```

#### **"SQLITE_BUSY" Error**
```bash
# Lösung: Andere Connections schließen
pkill -f "node server.js"
npm start
```

#### **Migration schlägt fehl**
```bash
# Backup wiederherstellen
cp data/backup/*_users.json data/users.json
cp data/backup/*_licenses.json data/licenses.json
cp data/backup/*_tokens.json data/tokens.json

# Migration erneut versuchen
npm run db:migrate
```

---

**Status:** ✅ **Production Ready**  
**Version:** 2.0.0 mit SQL Database  
**Letzte Aktualisierung:** Januar 2025