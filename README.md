# 🎩 Stopwatch Magic - Professional Magic Performance PWA

**Version 2.1.0** | Production-Ready | PWA Enabled

Eine professionelle Progressive Web App für Bühnenzauberer mit geheimer Force-Technologie zur Manipulation von Stoppuhr-Zeiten während Live-Performances.

## ✨ Features

### 🎪 **Magic Performance System**
- **Secret Force Technology**: Unsichtbare Manipulation von Stoppuhr-Zeiten
- **Dual Interface**: Magician Dashboard + Spectator Stopwatch
- **Real-time Control**: Forces werden sofort beim nächsten Button-Klick angewendet
- **Professional UI**: iOS-like Design für maximale Glaubwürdigkeit

### 📱 **Progressive Web App**
- **Vollbild-Modus**: Immersive Performance-Erfahrung
- **Offline-fähig**: Service Worker für zuverlässige Funktion
- **Installierbar**: "Zum Homebildschirm hinzufügen" auf allen Geräten
- **Touch-optimiert**: Perfekt für mobile Performances

### 🔐 **Enterprise-Level Backend**
- **SQL Database**: Robuste SQLite-Basis (PostgreSQL-ready)
- **User Management**: Sichere Registrierung mit Lizenzcodes
- **Token System**: Automatische Token-Generierung pro Nutzer
- **Session Management**: Persistent sessions mit UUID-Cookies
- **Audit Logging**: Vollständige Nachverfolgung aller Aktionen

### ⚡ **Force System (Vereinfacht)**
- **Sofortige Anwendung**: Forces werden beim nächsten Button-Klick angewendet
- **Zwei Modi**: 
  - `ms`: Forciere spezifische Centisekunden (z.B. 42 → 00:15,42)
  - `total`: Forciere Quersumme der angezeigten Zeit
- **Stop-Force**: Manipuliert die Hauptzeit
- **Lap-Force**: Manipuliert nur die aktuelle Runde

## 🚀 Quick Start

### **Für Endnutzer (Magier)**
```
1. Öffne: https://stopwatch-webapp-1.onrender.com
2. Registriere dich mit deinem Lizenzcode
3. Erhalte automatisch deinen Token
4. Installiere als PWA: "Zum Homebildschirm hinzufügen"
5. Ready für Live-Performance!
```

### **Für Entwickler**
```bash
# Repository klonen
git clone https://github.com/moin7111/Stopwatch-webapp.git
cd Stopwatch-webapp

# Dependencies installieren
npm install

# Database initialisieren
npm run db:migrate

# Server starten
npm start
```

## 📋 API Reference

### **Authentication**
```bash
# Registrierung (erstellt automatisch Token)
POST /auth/register
{
  "code": "LICENSE_CODE",
  "username": "magician",
  "password": "secret123",
  "displayName": "Magic Mike"
}

# Login (stellt Token sicher)
POST /auth/login
{
  "username": "magician",
  "password": "secret123"
}
```

### **Force Management**
```bash
# Force erstellen (vereinfacht - sofortige Anwendung)
POST /api/data/:token
{
  "mode": "ms",
  "target": 42,
  "app": "stopwatch"
}

# Queue abrufen
GET /api/data/:token

# Force bestätigen
POST /api/ack/:token
{
  "forceId": "uuid"
}
```

### **Admin Operations**
```bash
# Lizenzcode erstellen
POST /api/license
Header: x-admin-key: YOUR_ADMIN_KEY
{
  "count": 5
}

# Alle Nutzer anzeigen
GET /api/users
Header: x-admin-key: YOUR_ADMIN_KEY
```

## 🏗️ Architecture

```
├── 🌐 Frontend (PWA)
│   ├── 📱 Spectator Stopwatch (public/spectator.html)
│   ├── 🎩 Magician Dashboard (public/magician/)
│   └── ⚙️ Service Worker (public/sw.js)
│
├── 🔧 Backend (Node.js/Express)
│   ├── 🗄️ Database Layer (database/)
│   ├── 🔐 Authentication & Sessions
│   ├── 🎯 Force Management API
│   └── 👨‍💼 Admin Operations
│
└── 🛠️ Tools & Scripts
    ├── 🐍 License Creator (tools/license_creator.py)
    └── 📊 Database Migration (database/migrate.js)
```

## 🗄️ Database Schema

```sql
-- Benutzer mit sicherer Authentifizierung
users (id, username, display_name, password_hash, salt, ...)

-- Lizenzcode-Management
licenses (id, code, is_used, used_by_username, ...)

-- Token-System (ein Token pro User)
tokens (id, token, owner_username, created_at, ...)

-- Force-Queue für Live-Performances
force_queue (id, token, force_id, force_data, ...)

-- Audit-Logging für Sicherheit
audit_log (id, user_id, action, details, ip_address, ...)
```

## 🔧 Scripts

```bash
# Database Operations
npm run db:migrate    # JSON → SQL Migration
npm run db:test      # Database Verbindung testen
npm run db:backup    # Backup erstellen

# Development
npm start            # Server starten (Port 3000)
npm run dev          # Development mit Auto-Reload

# Production
npm run deploy       # Production Deployment
```

## 🌐 Deployment (Render.com)

### **Environment Variables**
```bash
# Production (Required)
ADMIN_KEY=your-strong-secret-key-here
NODE_ENV=production

# Optional
PORT=3000  # Render setzt automatisch
```

### **Deployment Steps**
1. **GitHub Integration**: Repository mit Render verbinden
2. **Environment Setup**: ADMIN_KEY und NODE_ENV setzen
3. **Auto-Deploy**: Jeder Git-Push triggert Deployment
4. **Database**: SQLite wird automatisch initialisiert

## 🔐 Security Features

- **🔒 Password Hashing**: scrypt mit Salt
- **🛡️ Admin Protection**: ADMIN_KEY für alle Admin-APIs
- **🍪 Secure Sessions**: UUID-basierte Session-Cookies
- **📝 Audit Logging**: Alle kritischen Aktionen werden geloggt
- **🚫 Input Validation**: Sichere API-Parameter-Validierung
- **🔐 SQL Injection Protection**: Prepared Statements überall

## 📱 PWA Installation

### **iOS (Safari)**
1. Öffne die App in Safari
2. Teilen-Button → "Zum Home-Bildschirm"
3. App startet im Vollbild-Modus

### **Android (Chrome)**
1. Öffne die App in Chrome
2. Menü → "App installieren"
3. Bestätigen und verwenden

## 🎯 Live URLs

- **🌐 Production**: https://stopwatch-webapp-1.onrender.com
- **🎩 Magician Login**: https://stopwatch-webapp-1.onrender.com/magician/login.html
- **📱 Spectator**: https://stopwatch-webapp-1.onrender.com/spectator.html?token=YOUR_TOKEN

## 🛠️ Development Setup

### **Requirements**
- Node.js 18+
- npm 9+
- SQLite3 (included)

### **Local Development**
```bash
# Environment Setup
echo "ADMIN_KEY=DevAdmin2025" > .env
echo "NODE_ENV=development" >> .env

# Database Setup
npm run db:migrate

# Start Development Server
npm start
```

### **Testing**
```bash
# Health Check
curl http://localhost:3000/health

# Create License (Admin)
curl -X POST http://localhost:3000/api/license \
  -H "Content-Type: application/json" \
  -H "x-admin-key: DevAdmin2025" \
  -d '{"count":1}'

# Test Force
curl -X POST http://localhost:3000/api/data/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"mode":"ms","target":42,"app":"stopwatch"}'
```

## 📊 Performance

- **⚡ Real-time**: ~400ms Force-Polling-Intervall
- **📱 PWA**: Offline-fähig, <2s Ladezeit
- **🔄 Database**: SQLite → PostgreSQL migrierbar
- **📈 Scalability**: Multi-user ready, session-persistent

## 🔄 Version History

- **v2.1.0**: Vereinfachtes Force-System, sofortige Anwendung
- **v2.0.0**: SQL Database Migration, Enterprise Features
- **v1.5.0**: PWA Implementation, Service Worker
- **v1.0.0**: Initial Magic Stopwatch System

## 🤝 Contributing

1. Fork das Repository
2. Erstelle Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Push zum Branch (`git push origin feature/amazing-feature`)
5. Öffne Pull Request

## 📄 License

MIT License - siehe [LICENSE](LICENSE) für Details

## 👨‍💻 Support

- **🐛 Issues**: GitHub Issues
- **📧 Contact**: [Deine Email]
- **📚 Docs**: Siehe `DATABASE_GUIDE.md` und `PROJECT_OVERVIEW.md`

---

**🎩 Magic happens when technology meets performance art.** ✨
