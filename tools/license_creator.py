#!/usr/bin/env python3
"""
License Code Creator für Imperia Magic Webapp v3.0
Für Pythonista iOS App - Enhanced Admin Management Tool

Erweiterte Features:
- Vollständige Benutzerverwaltung
- License-Verwaltung mit Export/Import
- Audit-Log-Anzeige
- Datenbank-Statistiken
- Remote Session Management
- Backup & Export Funktionen
"""

import requests
import json
from datetime import datetime
import csv
import os
import time

# --- Konfiguration ---
BASE_URL = "https://imperia-magic.onrender.com"
ADMIN_KEY = "DevAdmin2025"  # ← Hier deinen Admin Key eintragen

# Farben für Terminal (optional)
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def colored(text, color):
    """Farbige Ausgabe (funktioniert in Pythonista)"""
    try:
        return f"{color}{text}{Colors.RESET}"
    except:
        return text

def create_license_codes(count=1, license_type="standard"):
    """
    Erstellt neue License Codes mit Typ-Auswahl
    
    Args:
        count (int): Anzahl der zu erstellenden Codes (1-100)
        license_type (str): Typ der Lizenz (standard, premium, etc.)
    
    Returns:
        list: Liste der erstellten License Codes
    """
    
    url = f"{BASE_URL}/api/license"
    headers = {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY
    }
    data = {
        "count": count,
        "type": license_type
    }
    
    try:
        print(colored(f"🎫 Erstelle {count} {license_type} License Code(s)...", Colors.YELLOW))
        
        response = requests.post(url, headers=headers, json=data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            codes = result.get("created", [])
            
            print(colored(f"✅ Erfolgreich {len(codes)} Code(s) erstellt:", Colors.GREEN))
            for i, code in enumerate(codes, 1):
                print(f"  {i}. {colored(code, Colors.BOLD)}")
            
            # Zeige Registrierungs-URL
            print(f"\n🔗 Registrierung: {colored(BASE_URL + '/imperia/control/', Colors.CYAN)}")
            
            # Export Option
            if len(codes) > 5:
                export_choice = input("\n💾 Codes exportieren? (j/n): ").lower()
                if export_choice == 'j':
                    export_licenses(codes)
            
            return codes
            
        elif response.status_code == 401:
            print(colored("❌ Fehler: Admin Key ungültig", Colors.RED))
            print(f"Verwendeter Key: {ADMIN_KEY}")
            
        else:
            print(colored(f"❌ Fehler {response.status_code}: {response.text}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))
    
    return []

def export_licenses(codes):
    """Exportiert License Codes in eine CSV-Datei"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"licenses_{timestamp}.csv"
    
    try:
        with open(filename, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['License Code', 'Created At', 'Status'])
            
            for code in codes:
                writer.writerow([code, datetime.now().strftime("%Y-%m-%d %H:%M"), 'Available'])
        
        print(colored(f"✅ Codes exportiert nach: {filename}", Colors.GREEN))
    except Exception as e:
        print(colored(f"❌ Export fehlgeschlagen: {e}", Colors.RED))

def get_database_stats():
    """Zeigt detaillierte Datenbank-Statistiken"""
    url = f"{BASE_URL}/api/stats"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print(colored("📊 Lade Datenbank-Statistiken...", Colors.YELLOW))
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            stats = response.json().get("stats", {})
            
            print(colored("\n📊 DATENBANK STATISTIKEN", Colors.BOLD))
            print("=" * 50)
            
            # User Statistiken
            users = stats.get("users", {})
            print(colored("\n👥 BENUTZER:", Colors.CYAN))
            print(f"  Gesamt: {users.get('total', 0)}")
            print(f"  Admins: {users.get('admins', 0)}")
            print(f"  Regular: {users.get('regular', 0)}")
            
            # License Statistiken
            licenses = stats.get("licenses", {})
            print(colored("\n🎫 LIZENZEN:", Colors.CYAN))
            print(f"  Gesamt: {licenses.get('total', 0)}")
            print(f"  Verwendet: {licenses.get('used', 0)}")
            print(f"  Verfügbar: {licenses.get('available', 0)}")
            
            # Token Statistiken
            tokens = stats.get("tokens", {})
            print(colored("\n🔑 TOKENS:", Colors.CYAN))
            print(f"  Aktiv: {tokens.get('active', 0)}")
            
            # Session Statistiken
            sessions = stats.get("sessions", {})
            print(colored("\n🌐 SESSIONS:", Colors.CYAN))
            print(f"  Aktiv: {sessions.get('active', 0)}")
            
            # Force Queue Statistiken
            forces = stats.get("forces", {})
            print(colored("\n⚡ FORCE QUEUE:", Colors.CYAN))
            print(f"  In Warteschlange: {forces.get('queued', 0)}")
            print(f"  Verarbeitet: {forces.get('processed', 0)}")
            print(f"  Gesamt: {forces.get('total', 0)}")
            
            return stats
            
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))
    
    return None

def view_audit_log(limit=50, user_id=None):
    """Zeigt das Audit-Log an"""
    url = f"{BASE_URL}/api/audit-log"
    headers = {"x-admin-key": ADMIN_KEY}
    params = {"limit": limit}
    
    if user_id:
        params["userId"] = user_id
    
    try:
        print(colored("📋 Lade Audit-Log...", Colors.YELLOW))
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            logs = response.json().get("logs", [])
            
            if not logs:
                print("📋 Keine Log-Einträge gefunden")
                return
            
            print(colored(f"\n📋 AUDIT LOG (Letzte {len(logs)} Einträge)", Colors.BOLD))
            print("=" * 70)
            
            for log in logs:
                timestamp = format_date(log.get("created_at"))
                action = log.get("action", "Unknown")
                username = log.get("username", "System")
                details = log.get("details", {})
                
                # Farbcode basierend auf Aktion
                if "failed" in action:
                    color = Colors.RED
                elif "success" in action or "created" in action:
                    color = Colors.GREEN
                else:
                    color = Colors.YELLOW
                
                print(f"\n{timestamp} - {colored(action.upper(), color)}")
                print(f"  User: {username}")
                
                if isinstance(details, dict) and details:
                    print(f"  Details: {json.dumps(details, indent=2)}")
                    
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def manage_user(username):
    """Zeigt detaillierte Infos zu einem User und ermöglicht Verwaltung"""
    # Hole User-Liste
    url = f"{BASE_URL}/api/users"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            users = response.json().get("users", [])
            user = next((u for u in users if u.get("username") == username), None)
            
            if not user:
                print(colored(f"❌ User '{username}' nicht gefunden", Colors.RED))
                return
            
            # Zeige User-Details
            print(colored(f"\n👤 USER DETAILS: {username}", Colors.BOLD))
            print("=" * 50)
            print(f"ID: {user.get('id')}")
            print(f"Display Name: {user.get('display_name')}")
            print(f"Email: {user.get('email', 'Nicht angegeben')}")
            print(f"Admin: {'Ja' if user.get('is_admin') else 'Nein'}")
            print(f"Erstellt: {format_date(user.get('created_at'))}")
            print(f"Letzter Login: {format_date(user.get('last_login'))}")
            
            # Management-Optionen
            print(colored("\n⚙️  AKTIONEN:", Colors.YELLOW))
            print("1. Audit-Log anzeigen")
            print("2. User deaktivieren")
            print("3. Zurück")
            
            choice = input("\nWähle (1-3): ").strip()
            
            if choice == "1":
                view_audit_log(50, user.get('id'))
            elif choice == "2":
                confirm = input(colored(f"\n⚠️  User '{username}' wirklich deaktivieren? (j/n): ", Colors.RED))
                if confirm.lower() == 'j':
                    deactivate_user(user.get('id'))
                    
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def deactivate_user(user_id):
    """Deaktiviert einen User"""
    url = f"{BASE_URL}/api/users/{user_id}"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.delete(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(colored("✅ User erfolgreich deaktiviert", Colors.GREEN))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def revoke_license(code):
    """Widerruft eine Lizenz"""
    url = f"{BASE_URL}/api/licenses/{code}"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.delete(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            print(colored(f"✅ Lizenz {code} erfolgreich widerrufen", Colors.GREEN))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def search_licenses(search_term):
    """Sucht nach Lizenzen"""
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            licenses = response.json().get("licenses", [])
            
            # Filtere nach Suchbegriff
            found = []
            for lic in licenses:
                if (search_term.upper() in lic.get("code", "") or
                    search_term in lic.get("used_by_username", "")):
                    found.append(lic)
            
            if found:
                print(colored(f"\n🔍 {len(found)} Lizenz(en) gefunden:", Colors.GREEN))
                for lic in found:
                    code = lic["code"]
                    if lic.get("is_used"):
                        username = lic.get("used_by_username", "Unknown")
                        print(f"  {code} - Verwendet von {username}")
                    else:
                        print(f"  {code} - Verfügbar")
            else:
                print(colored(f"❌ Keine Lizenzen für '{search_term}' gefunden", Colors.YELLOW))
                
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def batch_operations():
    """Batch-Operationen Menü"""
    print(colored("\n🔧 BATCH-OPERATIONEN", Colors.BOLD))
    print("=" * 50)
    print("1. 📤 Lizenzen aus CSV importieren")
    print("2. 📥 Alle Lizenzen exportieren")
    print("3. 🗑️  Alle ungenutzten Lizenzen löschen")
    print("4. 📊 Vollständiger Datenbank-Export")
    print("5. ↩️  Zurück")
    
    choice = input("\nWähle (1-5): ").strip()
    
    if choice == "1":
        filename = input("CSV-Dateiname: ").strip()
        import_licenses_from_csv(filename)
    elif choice == "2":
        export_all_licenses()
    elif choice == "3":
        cleanup_unused_licenses()
    elif choice == "4":
        export_database_dump()

def export_all_licenses():
    """Exportiert alle Lizenzen in eine CSV-Datei"""
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            licenses = response.json().get("licenses", [])
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"all_licenses_{timestamp}.csv"
            
            with open(filename, 'w', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(['Code', 'Status', 'Used By', 'Used At', 'Created At', 'Type'])
                
                for lic in licenses:
                    writer.writerow([
                        lic.get('code'),
                        'Used' if lic.get('is_used') else 'Available',
                        lic.get('used_by_username', ''),
                        format_date(lic.get('used_at')),
                        format_date(lic.get('created_at')),
                        lic.get('license_type', 'standard')
                    ])
            
            print(colored(f"✅ {len(licenses)} Lizenzen exportiert nach: {filename}", Colors.GREEN))
            
    except Exception as e:
        print(colored(f"❌ Export fehlgeschlagen: {e}", Colors.RED))

def format_date(timestamp):
    """Formatiert Timestamp für Anzeige"""
    if not timestamp:
        return "Unbekannt"
    
    try:
        if isinstance(timestamp, str):
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        else:
            dt = datetime.fromtimestamp(timestamp / 1000)
        
        return dt.strftime("%d.%m.%Y %H:%M")
    except:
        return "Ungültig"

def format_uptime(seconds):
    """Formatiert Uptime in lesbare Form"""
    days = int(seconds / 86400)
    hours = int((seconds % 86400) / 3600)
    minutes = int((seconds % 3600) / 60)
    
    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    elif hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m {int(seconds%60)}s"

def list_all_licenses():
    """Zeigt alle verfügbaren Lizenzen an"""
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print(colored("📋 Lade alle Lizenzen...", Colors.YELLOW))
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            licenses = response.json().get("licenses", [])
            
            print(colored(f"\n📋 {len(licenses)} LIZENZEN GEFUNDEN", Colors.BOLD))
            print("=" * 50)
            
            for lic in licenses:
                code = lic["code"]
                license_type = lic.get("type", "standard")
                
                if lic.get("is_used"):
                    username = lic.get("used_by_username", "Unknown")
                    created = format_date(lic.get("created_at"))
                    print(f"🔴 {code} ({license_type}) - Verwendet von {username} seit {created}")
                else:
                    created = format_date(lic.get("created_at"))
                    print(f"🟢 {code} ({license_type}) - Verfügbar seit {created}")
                    
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def list_all_users():
    """Zeigt alle Benutzer an"""
    url = f"{BASE_URL}/api/users"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print(colored("👥 Lade alle Benutzer...", Colors.YELLOW))
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            users = response.json().get("users", [])
            
            print(colored(f"\n👥 {len(users)} BENUTZER GEFUNDEN", Colors.BOLD))
            print("=" * 50)
            
            for user in users:
                username = user.get("username", "Unknown")
                user_id = user.get("id", "N/A")
                is_admin = user.get("is_admin", False)
                created = format_date(user.get("created_at"))
                last_seen = format_date(user.get("last_seen"))
                
                role = "👑 Admin" if is_admin else "👤 User"
                print(f"{role} {username} (ID: {user_id})")
                print(f"    Erstellt: {created}")
                print(f"    Zuletzt gesehen: {last_seen}")
                print()
                    
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def list_all_tokens():
    """Zeigt alle aktiven Tokens an"""
    url = f"{BASE_URL}/api/tokens"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        print(colored("🔑 Lade alle Tokens...", Colors.YELLOW))
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            tokens = response.json().get("tokens", [])
            
            print(colored(f"\n🔑 {len(tokens)} TOKENS GEFUNDEN", Colors.BOLD))
            print("=" * 50)
            
            for token in tokens:
                token_id = token.get("id", "N/A")
                username = token.get("username", "Unknown")
                created = format_date(token.get("created_at"))
                last_used = format_date(token.get("last_used"))
                
                print(f"🔑 Token {token_id} - {username}")
                print(f"    Erstellt: {created}")
                print(f"    Zuletzt verwendet: {last_used}")
                print()
                    
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
            
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))

def get_system_status():
    """Prüft den System-Status"""
    url = f"{BASE_URL}/api/status"
    headers = {"x-admin-key": ADMIN_KEY}
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            status = response.json()
            print(colored("✅ Server ist online", Colors.GREEN))
            
            if "uptime" in status:
                uptime = format_uptime(status["uptime"])
                print(f"⏰ Uptime: {uptime}")
                
            if "version" in status:
                print(f"📦 Version: {status['version']}")
                
            return True
            
        else:
            print(colored(f"❌ Server Fehler {response.status_code}", Colors.RED))
            return False
            
    except requests.exceptions.RequestException:
        print(colored("❌ Server ist offline", Colors.RED))
        return False

def main():
    """Hauptfunktion - Erweitertes interaktives Menü"""
    
    print(colored("🎩 Imperia Magic v3.0 - Enhanced Admin Tool", Colors.BOLD))
    print("=" * 50)
    
    # Prüfe Admin Key
    if ADMIN_KEY == "DEIN_ADMIN_KEY_HIER_EINFUEGEN":
        print(colored("⚠️  Bitte setze zuerst deinen ADMIN_KEY!", Colors.RED))
        return
    
    # System Status prüfen
    if not get_system_status():
        print(colored("\n⚠️  Server offline. Trotzdem fortfahren? (j/n)", Colors.YELLOW))
        if input().lower() != 'j':
            return
    
    while True:
        print(colored("\n🎯 HAUPTMENÜ", Colors.BOLD))
        print("=" * 50)
        print("1. 🎫 License Management")
        print("2. 👥 User Management")
        print("3. 📊 Statistiken & Reports")
        print("4. 🔧 Batch-Operationen")
        print("5. 📋 Audit Log")
        print("6. 🔍 System Status")
        print("7. ❌ Beenden")
        
        choice = input("\nWähle (1-7): ").strip()
        
        if choice == "1":
            license_menu()
        elif choice == "2":
            user_menu()
        elif choice == "3":
            stats_menu()
        elif choice == "4":
            batch_operations()
        elif choice == "5":
            view_audit_log()
        elif choice == "6":
            get_system_status()
            time.sleep(2)
        elif choice == "7":
            print(colored("👋 Auf Wiedersehen!", Colors.GREEN))
            break
        else:
            print(colored("❌ Ungültige Auswahl", Colors.RED))

def license_menu():
    """License Management Untermenü"""
    while True:
        print(colored("\n🎫 LICENSE MANAGEMENT", Colors.BOLD))
        print("=" * 50)
        print("1. 📝 Neue Lizenz erstellen")
        print("2. 📋 Alle Lizenzen anzeigen")
        print("3. 🔍 Lizenz suchen")
        print("4. 🗑️  Lizenz widerrufen")
        print("5. ↩️  Zurück")
        
        choice = input("\nWähle (1-5): ").strip()
        
        if choice == "1":
            count = int(input("Anzahl (1-100): ") or "1")
            license_type = input("Typ (standard/premium): ") or "standard"
            create_license_codes(count, license_type)
        elif choice == "2":
            list_all_licenses()
        elif choice == "3":
            search_term = input("Suchbegriff: ")
            search_licenses(search_term)
        elif choice == "4":
            code = input("License Code: ")
            revoke_license(code)
        elif choice == "5":
            break

def user_menu():
    """User Management Untermenü"""
    while True:
        print(colored("\n👥 USER MANAGEMENT", Colors.BOLD))
        print("=" * 50)
        print("1. 📋 Alle User anzeigen")
        print("2. 🔍 User Details")
        print("3. 🎯 Alle Tokens anzeigen")
        print("4. ↩️  Zurück")
        
        choice = input("\nWähle (1-4): ").strip()
        
        if choice == "1":
            list_all_users()
        elif choice == "2":
            username = input("Username: ")
            manage_user(username)
        elif choice == "3":
            list_all_tokens()
        elif choice == "4":
            break

def stats_menu():
    """Statistiken Untermenü"""
    while True:
        print(colored("\n📊 STATISTIKEN & REPORTS", Colors.BOLD))
        print("=" * 50)
        print("1. 📊 Datenbank-Statistiken")
        print("2. 📈 Nutzungs-Report")
        print("3. 🔄 Live-Monitoring")
        print("4. ↩️  Zurück")
        
        choice = input("\nWähle (1-4): ").strip()
        
        if choice == "1":
            get_database_stats()
        elif choice == "2":
            generate_usage_report()
        elif choice == "3":
            live_monitoring()
        elif choice == "4":
            break

def generate_usage_report():
    """Generiert einen Nutzungsbericht"""
    stats = get_database_stats()
    if stats:
        print(colored("\n📈 NUTZUNGSBERICHT", Colors.BOLD))
        print("=" * 50)
        
        # Berechne Prozentsätze
        users = stats.get("users", {})
        licenses = stats.get("licenses", {})
        
        if licenses.get('total', 0) > 0:
            usage_rate = (licenses.get('used', 0) / licenses.get('total', 1)) * 100
            print(f"License-Nutzungsrate: {colored(f'{usage_rate:.1f}%', Colors.CYAN)}")
        
        print(f"Aktive User-Sessions: {stats.get('sessions', {}).get('active', 0)}")
        print(f"Force-Queue Aktivität: {stats.get('forces', {}).get('queued', 0)} ausstehend")

def live_monitoring():
    """Live-Monitoring der Serveraktivität"""
    print(colored("\n🔄 LIVE MONITORING (Drücke Ctrl+C zum Beenden)", Colors.YELLOW))
    print("=" * 50)
    
    try:
        while True:
            stats = get_database_stats()
            if stats:
                # Clear screen (funktioniert in Pythonista)
                print("\033[2J\033[H")
                
                print(colored("🔄 LIVE MONITORING", Colors.BOLD))
                print(f"Zeit: {datetime.now().strftime('%H:%M:%S')}")
                print("-" * 30)
                
                print(f"Sessions: {stats.get('sessions', {}).get('active', 0)}")
                print(f"Queue: {stats.get('forces', {}).get('queued', 0)}")
                print(f"Users: {stats.get('users', {}).get('total', 0)}")
                
            time.sleep(5)  # Update alle 5 Sekunden
            
    except KeyboardInterrupt:
        print(colored("\n✅ Monitoring beendet", Colors.GREEN))

if __name__ == "__main__":
    main()