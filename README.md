# Stopwatch Magic Webapp (PWA)

**Kurz**: PWA zur Steuerung einer Zuschauer-Stoppuhr per Token. Magier registrieren sich mit Lizenzcodes, erhalten automatisch einen Token und können Forces über API senden.

## Features
- 🎯 **PWA**: Vollbild-App, offline-fähig, "Zum Homebildschirm hinzufügen"  
- 🔐 **Auto-Token**: Automatische Token-Generierung bei Registrierung
- 📱 **iOS Shortcuts**: Direct API-Integration für Magier
- 🎩 **Invisible Control**: Zuschauer sehen nur die Stoppuhr
- ⚡ **Real-time**: 400ms Polling für Forces

## Quickstart (dev)
1. `npm install`
2. `node server.js`
3. Öffne `http://localhost:3000/magician/login.html`
4. Teste PWA: `http://localhost:3000/spectator.html?token=ABC`

## API (wichtig)
- POST /auth/register (auto-creates token)
- POST /auth/login (ensures token)
- GET /api/user/tokens (shows token + API examples)
- POST /api/data/:token (push force)
- GET /api/data/:token (poll queue)
- POST /api/ack/:token (acknowledge)

## PWA Installation
1. Öffne App in Safari/Chrome
2. "Zum Homebildschirm hinzufügen"  
3. App startet im Vollbild-Modus
