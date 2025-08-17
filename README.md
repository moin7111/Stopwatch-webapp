# 🎩 IMPERIA Magic System - Professional Magic Performance PWA

**Version 4.0.0** | Production-Ready | PWA Enabled

IMPERIA ist ein professionelles Magic Control System für Bühnenzauberer und Mentalisten. Das System bietet fortschrittliche Force-Technologie mit Enterprise-Level Backend.

---

## ✨ Features

### 🎪 **Magic Performance System**
- **Secret Force Technology**: Unsichtbare Manipulation für magische Effekte
- **Professional Control Interface**: Modernes, intuitives Design
- **Real-time Control**: Sofortige Anwendung von Forces
- **Enterprise Backend**: SQLite-Datenbank mit voller API

### 🔐 **Enterprise Security**
- **License-Based Registration**: Geschützter Zugang
- **Token Authentication**: Sichere API-Kommunikation
- **Session Management**: 30-Tage Cookie-Sessions
- **Admin Protection**: Umgebungsbasierte Sicherheit

### 📱 **Progressive Web App**
- **Offline-Fähig**: Funktioniert ohne Internetverbindung
- **Installierbar**: Wie eine native App
- **Push-Ready**: Vorbereitet für Benachrichtigungen
- **Responsive**: Perfekt auf allen Geräten

---

## 🚀 Quick Start

### **Für Endnutzer (Magier)**
```
1. Öffne: https://imperia-magic.onrender.com
2. Registriere dich mit deinem Lizenzcode
3. Erhalte automatisch deinen Token
4. Beginne mit deinen magischen Performances
```

### **Für Entwickler**
```bash
# Repository klonen
git clone https://github.com/moin7111/Imperia-webapp.git
cd Imperia-webapp

# Dependencies installieren
npm install

# Datenbank initialisieren
npm run db:init

# Development Server starten
npm run dev

# Öffne: http://localhost:3000
```

---

## 🔧 API Documentation

### **Authentication**
```http
POST /auth/register
Content-Type: application/json

{
  "code": "LICENSE-CODE",
  "username": "magician",
  "password": "secret"
}
```

### **Force Queue**
```http
POST /api/data/YOUR_TOKEN
Content-Type: application/json

{
  "mode": "ms",
  "target": 42,
  "app": "imperia"
}

GET /api/data/YOUR_TOKEN
```

---

## 📁 Project Structure

```
├── 🌐 Frontend (PWA)
│   ├── 📱 IMPERIA Control (public/imperia/control/)
│   ├── ⚙️ Service Worker (public/imperia/sw.js)
│   └── 📄 Manifest (public/imperia/manifest.json)
│
├── 🚀 Backend (Node.js)
│   ├── 🖥️ Express Server (server.js)
│   ├── 🗄️ SQLite Database (database/db.js)
│   └── 🔐 Auth System
│
└── 📦 Configuration
    ├── package.json
    ├── .env (production)
    └── .gitignore
```

---

## 🛡️ Security Features

### **License Management**
- Eindeutige Lizenzcodes für Registrierung
- Admin-API für Lizenzverwaltung
- Automatische Token-Generierung

### **Session Security**
- HTTPOnly Cookies
- 30-Tage Gültigkeit
- Automatische Bereinigung

### **API Protection**
- Token-basierte Authentifizierung
- Rate Limiting ready
- CORS konfiguriert

---

## 🌐 Deployment

### **Render.com Setup**
1. Fork das Repository
2. Verbinde mit Render
3. Setze Umgebungsvariablen:
   - `NODE_ENV=production`
   - `ADMIN_KEY=your-secret-key`
4. Deploy!

### **Environment Variables**
```env
NODE_ENV=production
PORT=3000
ADMIN_KEY=your-admin-key
```

---

## 📊 Database Schema

- **users**: Benutzerkonten
- **licenses**: Lizenzcode-System  
- **tokens**: API-Authentifizierung
- **force_queue**: Force-Verwaltung
- **sessions**: Aktive Sitzungen
- **settings**: Benutzereinstellungen

---

## 🔨 NPM Scripts

- `npm start` - Production Server
- `npm run dev` - Development mit Nodemon
- `npm run db:init` - Datenbank Setup
- `npm run db:backup` - Datenbank Backup
- `npm test` - Tests ausführen

---

## 🎯 Live URLs

- **🌐 Production**: https://imperia-magic.onrender.com
- **🎩 Login**: https://imperia-magic.onrender.com/imperia/control/login.html

## 🛠️ Development Setup

### **Lokale Entwicklung**
```bash
# Install dependencies
npm install

# Setup database
npm run db:init

# Start dev server
npm run dev

# Access at http://localhost:3000
```

### **Production Build**
```bash
# Set environment
export NODE_ENV=production
export ADMIN_KEY=your-key

# Start server
npm start
```

---

## 📈 Version History

- **v4.0.0**: Complete rewrite as IMPERIA Magic System
- **v3.0.0**: Enhanced Force Types & Presets
- **v2.0.0**: SQL Database Migration
- **v1.0.0**: Initial Release

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the magic community**
