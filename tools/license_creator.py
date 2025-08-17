#!/usr/bin/env python3
"""
License Code Creator für Imperia Magic Webapp v2.0
Für Pythonista iOS App - Updated für SQL Database

Erstellt neue License Codes über die Admin API
Unterstützt das neue SQL-basierte Backend mit erweiterten Features
"""

import requests
import json
from datetime import datetime

# --- Konfiguration ---
BASE_URL = "https://imperia-magic.onrender.com"
ADMIN_KEY = "DevAdmin2025"  # ← Hier deinen Admin Key eintragen

def create_license_codes(count=1):
    """
    Erstellt neue License Codes
    
    Args:
        count (int): Anzahl der zu erstellenden Codes (1-100)
    
    Returns:
        list: Liste der erstellten License Codes
    """
    
    url = f"{BASE_URL}/api/license"
    headers = {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY
    }
    data = {"count": count}
    
    try:
        print(f"🎫 Erstelle {count} License Code(s)...")
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            codes = result.get("created", [])
            
            print(f"✅ Erfolgreich {len(codes)} Code(s) erstellt:")
            for i, code in enumerate(codes, 1):
                print(f"  {i}. {code}")
            
            # Zeige Registrierungs-URL
            print(f"\n🔗 Registrierung: {BASE_URL}/magician/login.html")
            
            return codes
            
        elif response.status_code == 401:
            print("❌ Fehler: Admin Key ungültig")
            print(f"Verwendeter Key: {ADMIN_KEY}")
            print("Überprüfe den ADMIN_KEY in der Konfiguration")
            
        elif response.status_code == 403:
            print("❌ Fehler: Zugriff verweigert")
            print("Admin API ist möglicherweise deaktiviert")
            
        else:
            print(f"❌ Fehler {response.status_code}: {response.text}")
            
    except requests.exceptions.Timeout:
        print("❌ Timeout: Server antwortet nicht (>10s)")
        
    except requests.exceptions.ConnectionError:
        print("❌ Verbindungsfehler: Server nicht erreichbar")
        print(f"URL: {BASE_URL}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Netzwerk-Fehler: {e}")
    
    return []

def list_all_licenses():
    """
    Zeigt alle existierenden License Codes an (SQL Database Version)
    """
    
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print("📋 Lade License Liste...")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            licenses = result.get("licenses", [])
            
            if not licenses:
                print("📋 Keine License Codes vorhanden")
                return
                
            print(f"\n📊 {len(licenses)} License Code(s) gefunden:")
            print("=" * 60)
            
            # Statistiken
            used_count = sum(1 for lic in licenses if lic.get("is_used"))
            available_count = len(licenses) - used_count
            
            print(f"📈 Statistik: {available_count} verfügbar, {used_count} verwendet")
            print("-" * 60)
            
            for lic in licenses:
                code = lic["code"]
                
                if lic.get("is_used"):
                    username = lic.get("used_by_username", "Unknown")
                    used_date = format_date(lic.get("used_at"))
                    status = f"✅ Verwendet von {username}"
                    if used_date:
                        status += f" am {used_date}"
                else:
                    created_date = format_date(lic.get("created_at"))
                    status = f"⏳ Verfügbar (erstellt {created_date})"
                
                license_type = lic.get("license_type", "standard")
                print(f"  {code} - {status} [{license_type}]")
                
        elif response.status_code == 401:
            print("❌ Fehler: Admin Key ungültig für License-Liste")
            
        else:
            print(f"❌ Fehler {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Netzwerk-Fehler: {e}")

def get_system_status():
    """
    Prüft Server-Status und Database-Verbindung (SQL Database Version)
    """
    
    url = f"{BASE_URL}/api/status"
    
    try:
        print("🔍 Prüfe System-Status...")
        
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            status = response.json()
            
            print("✅ Server Status:")
            print(f"  🌐 Server: Online")
            print(f"  🗄️  Database: {status.get('database', 'unknown')}")
            print(f"  ⏱️  Uptime: {format_uptime(status.get('uptime', 0))}")
            print(f"  📅 Timestamp: {status.get('timestamp', 'unknown')}")
            
            return True
            
        else:
            print(f"❌ Server Error {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Server nicht erreichbar: {e}")
        return False

def list_all_users():
    """
    Zeigt alle registrierten User an (Admin only)
    """
    
    url = f"{BASE_URL}/api/users"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print("👥 Lade User Liste...")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            users = result.get("users", [])
            
            if not users:
                print("👥 Keine User registriert")
                return
                
            print(f"\n👥 {len(users)} User registriert:")
            print("-" * 50)
            
            for user in users:
                username = user.get("username", "Unknown")
                display_name = user.get("display_name", username)
                created = format_date(user.get("created_at"))
                last_login = format_date(user.get("last_login"))
                admin_flag = "👑 ADMIN" if user.get("is_admin") else "👤 USER"
                
                print(f"  {username} ({display_name}) - {admin_flag}")
                print(f"    Erstellt: {created}")
                if last_login:
                    print(f"    Letzter Login: {last_login}")
                print()
                
        elif response.status_code == 401:
            print("❌ Fehler: Admin Key ungültig für User-Liste")
            
        else:
            print(f"❌ Fehler {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Netzwerk-Fehler: {e}")

def list_all_tokens():
    """
    Zeigt alle aktiven Tokens an (Admin only)
    """
    
    url = f"{BASE_URL}/api/tokens"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print("🎯 Lade Token Liste...")
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            tokens = result.get("tokens", [])
            
            if not tokens:
                print("🎯 Keine aktiven Tokens")
                return
                
            print(f"\n🎯 {len(tokens)} aktive Token(s):")
            print("-" * 40)
            
            for token_data in tokens:
                token = token_data.get("token", "Unknown")
                owner = token_data.get("owner", "Unknown")
                queued = token_data.get("queued", 0)
                
                print(f"  {token} - {owner} ({queued} Forces in Queue)")
                print(f"    🔗 Spectator URL: {BASE_URL}/spectator.html?token={token}")
                print()
                
        elif response.status_code == 401:
            print("❌ Fehler: Admin Key ungültig für Token-Liste")
            
        else:
            print(f"❌ Fehler {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Netzwerk-Fehler: {e}")

def format_date(timestamp):
    """
    Formatiert Timestamp für Anzeige
    """
    if not timestamp:
        return "Unbekannt"
    
    try:
        if isinstance(timestamp, str):
            # ISO format aus SQL Database
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
            # Unix timestamp (legacy)
            dt = datetime.fromtimestamp(timestamp / 1000)
        
        return dt.strftime("%d.%m.%Y %H:%M")
    except:
        return "Ungültig"

def format_uptime(seconds):
    """
    Formatiert Uptime in lesbare Form
    """
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        return f"{int(seconds/60)}m {int(seconds%60)}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"

def main():
    """
    Hauptfunktion - Interaktives Menü (SQL Database Version)
    """
    
    print("🎩 Imperia Magic v2.0 - License Manager (SQL)")
    print("=" * 50)
    
    # Prüfe Admin Key
    if ADMIN_KEY == "DEIN_ADMIN_KEY_HIER_EINFUEGEN":
        print("⚠️  Bitte setze zuerst deinen ADMIN_KEY in der Konfiguration!")
        print("   Öffne die Datei und ersetze 'DEIN_ADMIN_KEY_HIER_EINFUEGEN'")
        return
    
    # System Status prüfen
    if not get_system_status():
        print("\n⚠️  Server scheint offline zu sein. Trotzdem fortfahren? (j/n)")
        if input().lower() != 'j':
            return
    
    while True:
        print("\n" + "=" * 50)
        print("Was möchtest du tun?")
        print("1. 📝 Einen License Code erstellen")
        print("2. 📝 Mehrere License Codes erstellen")
        print("3. 📋 Alle License Codes anzeigen")
        print("4. 👥 Alle User anzeigen")
        print("5. 🎯 Alle Tokens anzeigen")
        print("6. 🔍 System Status prüfen")
        print("7. ❌ Beenden")
        
        choice = input("\nWähle (1-7): ").strip()
        
        if choice == "1":
            create_license_codes(1)
            
        elif choice == "2":
            try:
                count = int(input("Wie viele Codes erstellen? (max 100): "))
                if 1 <= count <= 100:
                    create_license_codes(count)
                else:
                    print("❌ Bitte Zahl zwischen 1 und 100 eingeben")
            except ValueError:
                print("❌ Ungültige Eingabe")
                
        elif choice == "3":
            list_all_licenses()
            
        elif choice == "4":
            list_all_users()
            
        elif choice == "5":
            list_all_tokens()
            
        elif choice == "6":
            get_system_status()
            
        elif choice == "7":
            print("👋 Bis bald!")
            break
            
        else:
            print("❌ Ungültige Auswahl")

# --- Quick Test Funktion ---
def quick_test():
    """
    Schneller Test: Status prüfen und einen Code erstellen
    """
    print("🚀 Quick Test - SQL Database Version...")
    
    # Status prüfen
    if get_system_status():
        print()
        codes = create_license_codes(1)
        if codes:
            print(f"\n🎫 Dein neuer License Code: {codes[0]}")
            print(f"🔗 Registrierung: {BASE_URL}/magician/login.html")
            print(f"🎮 Spectator Demo: {BASE_URL}/spectator.html")
    else:
        print("❌ Server nicht verfügbar für Quick Test")

if __name__ == "__main__":
    # Für schnellen Test diese Zeile auskommentieren:
    # quick_test()
    
    # Für interaktives Menü:
    main()