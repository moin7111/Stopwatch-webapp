#!/usr/bin/env python3
"""
License Code Creator für Imperia Magic Webapp v3.0
Für Pythonista iOS App - Enhanced Admin Management Tool

Aktualisiert, um mit dem aktuellen Backend kompatibel zu sein:
- Endpunkte abgeglichen (keine /api/audit-log oder /api/stats Endpunkte)
- ADMIN_KEY und Basis-URL über Umgebungsvariablen konfigurierbar
- Token- und Lizenz-Schema angepasst
"""

import requests
import json
from datetime import datetime
import csv
import os
import time

# --- Konfiguration ---
# Kann per Umgebungsvariablen überschrieben werden:
#   - IMPERIA_BASE_URL: Basis-URL des Servers
#   - ADMIN_KEY: Admin-Schlüssel für Admin-Endpunkte
BASE_URL = os.environ.get("IMPERIA_BASE_URL", "https://imperia-magic.onrender.com")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "DevAdmin2025")


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
    """Farbige Ausgabe (funktioniert in vielen Terminals)"""
    try:
        return f"{color}{text}{Colors.RESET}"
    except Exception:
        return text


def create_license_codes(count: int = 1):
    """Erstellt neue License Codes.

    Args:
        count: Anzahl der zu erstellenden Codes (1-100)

    Returns:
        Liste der erstellten License Codes
    """
    url = f"{BASE_URL}/api/license"
    headers = {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
    }
    data = {"count": count}

    try:
        print(colored(f"🎫 Erstelle {count} License Code(s)...", Colors.YELLOW))
        response = requests.post(url, headers=headers, json=data, timeout=10)

        if response.status_code == 200:
            result = response.json()
            codes = result.get("created", [])

            print(colored(f"✅ Erfolgreich {len(codes)} Code(s) erstellt:", Colors.GREEN))
            for i, code in enumerate(codes, 1):
                print(f"  {i}. {colored(code, Colors.BOLD)}")

            # Zeige Registrierungs-URL
            print(f"\n🔗 Registrierung: {colored(BASE_URL + '/imperia/control/register.html', Colors.CYAN)}")

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
    """Exportiert License Codes in eine CSV-Datei."""
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


def export_all_licenses():
    """Exportiert alle Lizenzen in eine CSV-Datei."""
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
                        lic.get('license_type', 'standard'),
                    ])

            print(colored(f"✅ {len(licenses)} Lizenzen exportiert nach: {filename}", Colors.GREEN))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except Exception as e:
        print(colored(f"❌ Export fehlgeschlagen: {e}", Colors.RED))


def format_date(timestamp):
    """Formatiert Timestamp für Anzeige."""
    if not timestamp:
        return "Unbekannt"
    try:
        if isinstance(timestamp, str):
            # ISO-String oder Datumstext
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                return timestamp
        else:
            # Unix-Millisekunden
            dt = datetime.fromtimestamp(timestamp / 1000)
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return "Ungültig"


def format_uptime(seconds: float):
    """Formatiert Uptime in lesbare Form."""
    try:
        seconds = float(seconds)
    except Exception:
        return str(seconds)
    days = int(seconds / 86400)
    hours = int((seconds % 86400) / 3600)
    minutes = int((seconds % 3600) / 60)

    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m {int(seconds % 60)}s"


def list_all_licenses():
    """Zeigt alle verfügbaren Lizenzen an."""
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
                code = lic.get("code", "?")
                license_type = lic.get("license_type", "standard")
                created = format_date(lic.get("created_at"))
                if lic.get("is_used"):
                    username = lic.get("used_by_username", "Unknown")
                    print(f"🔴 {code} ({license_type}) - Verwendet von {username} seit {created}")
                else:
                    print(f"🟢 {code} ({license_type}) - Verfügbar seit {created}")
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def list_all_users():
    """Zeigt alle Benutzer an."""
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
                last_login = format_date(user.get("last_login"))
                role = "👑 Admin" if is_admin else "👤 User"
                print(f"{role} {username} (ID: {user_id})")
                print(f"    Erstellt: {created}")
                print(f"    Letzter Login: {last_login}")
                print()
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def list_all_tokens():
    """Zeigt alle aktiven Tokens an."""
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
                token_value = token.get("token", "N/A")
                owner = token.get("owner", "Unknown")
                queued = token.get("queued", 0)
                print(f"🔑 Token {token_value} - {owner} (Queued: {queued})")
                print()
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def get_database_stats():
    """Zeigt Basis-Statistiken (abgeleitet), da kein /api/stats Endpoint existiert."""
    try:
        headers = {"x-admin-key": ADMIN_KEY}

        users_resp = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=10)
        users = users_resp.json().get("users", []) if users_resp.status_code == 200 else []

        licenses_resp = requests.get(f"{BASE_URL}/api/licenses", headers=headers, timeout=10)
        licenses = licenses_resp.json().get("licenses", []) if licenses_resp.status_code == 200 else []

        tokens_resp = requests.get(f"{BASE_URL}/api/tokens", headers=headers, timeout=10)
        tokens = tokens_resp.json().get("tokens", []) if tokens_resp.status_code == 200 else []

        stats = {
            "users": {
                "total": len(users),
                "admins": sum(1 for u in users if u.get("is_admin")),
                "regular": sum(1 for u in users if not u.get("is_admin")),
            },
            "licenses": {
                "total": len(licenses),
                "used": sum(1 for l in licenses if l.get("is_used")),
                "available": sum(1 for l in licenses if not l.get("is_used")),
            },
            "tokens": {"active": len(tokens)},
            # Sessions/Force Queue werden serverseitig nicht aggregiert angeboten
            "sessions": {},
            "forces": {},
        }

        print(colored("\n📊 DATENBANK STATISTIKEN", Colors.BOLD))
        print("=" * 50)
        print(colored("\n👥 BENUTZER:", Colors.CYAN))
        print(f"  Gesamt: {stats['users']['total']}")
        print(f"  Admins: {stats['users']['admins']}")
        print(f"  Regular: {stats['users']['regular']}")

        print(colored("\n🎫 LIZENZEN:", Colors.CYAN))
        print(f"  Gesamt: {stats['licenses']['total']}")
        print(f"  Verwendet: {stats['licenses']['used']}")
        print(f"  Verfügbar: {stats['licenses']['available']}")

        print(colored("\n🔑 TOKENS:", Colors.CYAN))
        print(f"  Aktiv: {stats['tokens']['active']}")

        return stats
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))
    except Exception as e:
        print(colored(f"❌ Fehler beim Laden der Statistiken: {e}", Colors.RED))
    return None


def view_audit_log(limit: int = 50, user_id=None):
    """Audit-Log Anzeige (nicht verfügbar)."""
    print(colored("❌ Audit-Log Endpoint ist im Backend nicht verfügbar.", Colors.RED))


def manage_user(username: str):
    """Zeigt detaillierte Infos zu einem User und ermöglicht Verwaltung."""
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

            print(colored(f"\n👤 USER DETAILS: {username}", Colors.BOLD))
            print("=" * 50)
            print(f"ID: {user.get('id')}")
            print(f"Display Name: {user.get('display_name')}")
            print(f"Email: {user.get('email', 'Nicht angegeben')}")
            print(f"Admin: {'Ja' if user.get('is_admin') else 'Nein'}")
            print(f"Erstellt: {format_date(user.get('created_at'))}")
            print(f"Letzter Login: {format_date(user.get('last_login'))}")

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
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def deactivate_user(user_id):
    """Deaktiviert einen User (nicht unterstützt)."""
    print(colored("❌ User-Deaktivierung wird vom Backend derzeit nicht unterstützt.", Colors.RED))


def revoke_license(code: str):
    """Widerruft eine Lizenz (nicht unterstützt)."""
    print(colored("❌ Lizenz-Widerruf wird vom Backend derzeit nicht unterstützt.", Colors.RED))


def search_licenses(search_term: str):
    """Sucht nach Lizenzen nach Code oder Benutzername."""
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            licenses = response.json().get("licenses", [])
            found = []
            for lic in licenses:
                code = lic.get("code", "")
                used_by = lic.get("used_by_username", "") or ""
                if search_term.upper() in code or search_term.lower() in used_by.lower():
                    found.append(lic)

            if found:
                print(colored(f"\n🔍 {len(found)} Lizenz(en) gefunden:", Colors.GREEN))
                for lic in found:
                    code = lic.get("code", "?")
                    if lic.get("is_used"):
                        username = lic.get("used_by_username", "Unknown")
                        print(f"  {code} - Verwendet von {username}")
                    else:
                        print(f"  {code} - Verfügbar")
            else:
                print(colored(f"❌ Keine Lizenzen für '{search_term}' gefunden", Colors.YELLOW))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def batch_operations():
    """Batch-Operationen Menü."""
    print(colored("\n🔧 BATCH-OPERATIONEN", Colors.BOLD))
    print("=" * 50)
    print("1. 📤 Lizenzen aus CSV importieren (nicht verfügbar)")
    print("2. 📥 Alle Lizenzen exportieren")
    print("3. 🗑️  Alle ungenutzten Lizenzen löschen (nicht verfügbar)")
    print("4. 📊 Vollständiger Datenbank-Export (nicht verfügbar)")
    print("5. ↩️  Zurück")

    choice = input("\nWähle (1-5): ").strip()
    if choice == "1":
        print(colored("❌ CSV-Import wird vom Backend derzeit nicht unterstützt.", Colors.RED))
    elif choice == "2":
        export_all_licenses()
    elif choice == "3":
        print(colored("❌ Löschen ungenutzter Lizenzen wird derzeit nicht unterstützt.", Colors.RED))
    elif choice == "4":
        print(colored("❌ Vollständiger DB-Export wird derzeit nicht unterstützt.", Colors.RED))


def get_system_status():
    """Prüft den System-Status."""
    url = f"{BASE_URL}/api/status"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(colored("✅ Server ist online", Colors.GREEN))
            if "uptime" in status:
                uptime = format_uptime(status["uptime"]) if status.get("uptime") is not None else "—"
                print(f"⏰ Uptime: {uptime}")
            if "database" in status:
                print(f"🗄️  Database: {status['database']}")
            return True
        else:
            print(colored(f"❌ Server Fehler {response.status_code}", Colors.RED))
            return False
    except requests.exceptions.RequestException:
        print(colored("❌ Server ist offline", Colors.RED))
        return False


def license_menu():
    """License Management Untermenü."""
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
            try:
                count = int(input("Anzahl (1-100): ") or "1")
            except ValueError:
                count = 1
            create_license_codes(count)
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
    """User Management Untermenü."""
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
    """Statistiken Untermenü."""
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
    """Generiert einen Nutzungsbericht basierend auf aggregierten Statistiken."""
    stats = get_database_stats()
    if stats:
        print(colored("\n📈 NUTZUNGSBERICHT", Colors.BOLD))
        print("=" * 50)
        licenses = stats.get("licenses", {})
        total = licenses.get('total', 0)
        used = licenses.get('used', 0)
        if total > 0:
            usage_rate = (used / max(total, 1)) * 100.0
            print(f"License-Nutzungsrate: {colored(f'{usage_rate:.1f}%', Colors.CYAN)}")
        print(f"Aktive Tokens: {stats.get('tokens', {}).get('active', 0)}")


def live_monitoring():
    """Live-Monitoring der Serveraktivität."""
    print(colored("\n🔄 LIVE MONITORING (Drücke Ctrl+C zum Beenden)", Colors.YELLOW))
    print("=" * 50)
    try:
        while True:
            stats = get_database_stats()
            if stats:
                # Bildschirm "leeren"
                print("\033[2J\033[H")
                print(colored("🔄 LIVE MONITORING", Colors.BOLD))
                print(f"Zeit: {datetime.now().strftime('%H:%M:%S')}")
                print("-" * 30)
                print(f"Users: {stats.get('users', {}).get('total', 0)}")
                print(f"Lizenzen gesamt: {stats.get('licenses', {}).get('total', 0)}")
                print(f"Lizenzen verwendet: {stats.get('licenses', {}).get('used', 0)}")
                print(f"Aktive Tokens: {stats.get('tokens', {}).get('active', 0)}")
            time.sleep(5)
    except KeyboardInterrupt:
        print(colored("\n✅ Monitoring beendet", Colors.GREEN))


def main():
    """Hauptfunktion - Erweitertes interaktives Menü."""
    print(colored("🎩 Imperia Magic v3.0 - Enhanced Admin Tool", Colors.BOLD))
    print("=" * 50)

    # Hinweis, falls kein Admin-Key konfiguriert ist
    if not ADMIN_KEY:
        print(colored("⚠️  Kein ADMIN_KEY gesetzt. Admin-Endpunkte könnten ungeschützt sein.", Colors.YELLOW))

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


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
License Code Creator für Imperia Magic Webapp v3.0
Für Pythonista iOS App - Enhanced Admin Management Tool

Aktualisiert, um mit dem aktuellen Backend kompatibel zu sein:
- Endpunkte abgeglichen (keine /api/audit-log oder /api/stats Endpunkte)
- ADMIN_KEY und Basis-URL über Umgebungsvariablen konfigurierbar
- Token- und Lizenz-Schema angepasst
"""

import requests
import json
from datetime import datetime
import csv
import os
import time

# --- Konfiguration ---
# Kann per Umgebungsvariablen überschrieben werden:
#   - IMPERIA_BASE_URL: Basis-URL des Servers
#   - ADMIN_KEY: Admin-Schlüssel für Admin-Endpunkte
BASE_URL = os.environ.get("IMPERIA_BASE_URL", "https://imperia-magic.onrender.com")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "DevAdmin2025")


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
    """Farbige Ausgabe (funktioniert in vielen Terminals)"""
    try:
        return f"{color}{text}{Colors.RESET}"
    except Exception:
        return text


def create_license_codes(count: int = 1):
    """Erstellt neue License Codes.

    Args:
        count: Anzahl der zu erstellenden Codes (1-100)

    Returns:
        Liste der erstellten License Codes
    """
    url = f"{BASE_URL}/api/license"
    headers = {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
    }
    data = {"count": count}

    try:
        print(colored(f"🎫 Erstelle {count} License Code(s)...", Colors.YELLOW))
        response = requests.post(url, headers=headers, json=data, timeout=10)

        if response.status_code == 200:
            result = response.json()
            codes = result.get("created", [])

            print(colored(f"✅ Erfolgreich {len(codes)} Code(s) erstellt:", Colors.GREEN))
            for i, code in enumerate(codes, 1):
                print(f"  {i}. {colored(code, Colors.BOLD)}")

            # Zeige Registrierungs-URL
            print(f"\n🔗 Registrierung: {colored(BASE_URL + '/imperia/control/register.html', Colors.CYAN)}")

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
    """Exportiert License Codes in eine CSV-Datei."""
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


def export_all_licenses():
    """Exportiert alle Lizenzen in eine CSV-Datei."""
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
                        lic.get('license_type', 'standard'),
                    ])

            print(colored(f"✅ {len(licenses)} Lizenzen exportiert nach: {filename}", Colors.GREEN))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except Exception as e:
        print(colored(f"❌ Export fehlgeschlagen: {e}", Colors.RED))


def format_date(timestamp):
    """Formatiert Timestamp für Anzeige."""
    if not timestamp:
        return "Unbekannt"
    try:
        if isinstance(timestamp, str):
            # ISO-String oder Datumstext
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                return timestamp
        else:
            # Unix-Millisekunden
            dt = datetime.fromtimestamp(timestamp / 1000)
        return dt.strftime("%d.%m.%Y %H:%M")
    except Exception:
        return "Ungültig"


def format_uptime(seconds: float):
    """Formatiert Uptime in lesbare Form."""
    try:
        seconds = float(seconds)
    except Exception:
        return str(seconds)
    days = int(seconds / 86400)
    hours = int((seconds % 86400) / 3600)
    minutes = int((seconds % 3600) / 60)

    if days > 0:
        return f"{days}d {hours}h {minutes}m"
    if hours > 0:
        return f"{hours}h {minutes}m"
    return f"{minutes}m {int(seconds % 60)}s"


def list_all_licenses():
    """Zeigt alle verfügbaren Lizenzen an."""
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
                code = lic.get("code", "?")
                license_type = lic.get("license_type", "standard")
                created = format_date(lic.get("created_at"))
                if lic.get("is_used"):
                    username = lic.get("used_by_username", "Unknown")
                    print(f"🔴 {code} ({license_type}) - Verwendet von {username} seit {created}")
                else:
                    print(f"🟢 {code} ({license_type}) - Verfügbar seit {created}")
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def list_all_users():
    """Zeigt alle Benutzer an."""
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
                last_login = format_date(user.get("last_login"))
                role = "👑 Admin" if is_admin else "👤 User"
                print(f"{role} {username} (ID: {user_id})")
                print(f"    Erstellt: {created}")
                print(f"    Letzter Login: {last_login}")
                print()
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def list_all_tokens():
    """Zeigt alle aktiven Tokens an."""
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
                token_value = token.get("token", "N/A")
                owner = token.get("owner", "Unknown")
                queued = token.get("queued", 0)
                print(f"🔑 Token {token_value} - {owner} (Queued: {queued})")
                print()
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def get_database_stats():
    """Zeigt Basis-Statistiken (abgeleitet), da kein /api/stats Endpoint existiert."""
    try:
        headers = {"x-admin-key": ADMIN_KEY}

        users_resp = requests.get(f"{BASE_URL}/api/users", headers=headers, timeout=10)
        users = users_resp.json().get("users", []) if users_resp.status_code == 200 else []

        licenses_resp = requests.get(f"{BASE_URL}/api/licenses", headers=headers, timeout=10)
        licenses = licenses_resp.json().get("licenses", []) if licenses_resp.status_code == 200 else []

        tokens_resp = requests.get(f"{BASE_URL}/api/tokens", headers=headers, timeout=10)
        tokens = tokens_resp.json().get("tokens", []) if tokens_resp.status_code == 200 else []

        stats = {
            "users": {
                "total": len(users),
                "admins": sum(1 for u in users if u.get("is_admin")),
                "regular": sum(1 for u in users if not u.get("is_admin")),
            },
            "licenses": {
                "total": len(licenses),
                "used": sum(1 for l in licenses if l.get("is_used")),
                "available": sum(1 for l in licenses if not l.get("is_used")),
            },
            "tokens": {"active": len(tokens)},
            # Sessions/Force Queue werden serverseitig nicht aggregiert angeboten
            "sessions": {},
            "forces": {},
        }

        print(colored("\n📊 DATENBANK STATISTIKEN", Colors.BOLD))
        print("=" * 50)
        print(colored("\n👥 BENUTZER:", Colors.CYAN))
        print(f"  Gesamt: {stats['users']['total']}")
        print(f"  Admins: {stats['users']['admins']}")
        print(f"  Regular: {stats['users']['regular']}")

        print(colored("\n🎫 LIZENZEN:", Colors.CYAN))
        print(f"  Gesamt: {stats['licenses']['total']}")
        print(f"  Verwendet: {stats['licenses']['used']}")
        print(f"  Verfügbar: {stats['licenses']['available']}")

        print(colored("\n🔑 TOKENS:", Colors.CYAN))
        print(f"  Aktiv: {stats['tokens']['active']}")

        return stats
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))
    except Exception as e:
        print(colored(f"❌ Fehler beim Laden der Statistiken: {e}", Colors.RED))
    return None


def view_audit_log(limit: int = 50, user_id=None):
    """Audit-Log Anzeige (nicht verfügbar)."""
    print(colored("❌ Audit-Log Endpoint ist im Backend nicht verfügbar.", Colors.RED))


def manage_user(username: str):
    """Zeigt detaillierte Infos zu einem User und ermöglicht Verwaltung."""
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

            print(colored(f"\n👤 USER DETAILS: {username}", Colors.BOLD))
            print("=" * 50)
            print(f"ID: {user.get('id')}")
            print(f"Display Name: {user.get('display_name')}")
            print(f"Email: {user.get('email', 'Nicht angegeben')}")
            print(f"Admin: {'Ja' if user.get('is_admin') else 'Nein'}")
            print(f"Erstellt: {format_date(user.get('created_at'))}")
            print(f"Letzter Login: {format_date(user.get('last_login'))}")

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
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def deactivate_user(user_id):
    """Deaktiviert einen User (nicht unterstützt)."""
    print(colored("❌ User-Deaktivierung wird vom Backend derzeit nicht unterstützt.", Colors.RED))


def revoke_license(code: str):
    """Widerruft eine Lizenz (nicht unterstützt)."""
    print(colored("❌ Lizenz-Widerruf wird vom Backend derzeit nicht unterstützt.", Colors.RED))


def search_licenses(search_term: str):
    """Sucht nach Lizenzen nach Code oder Benutzername."""
    url = f"{BASE_URL}/api/licenses"
    headers = {"x-admin-key": ADMIN_KEY}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            licenses = response.json().get("licenses", [])
            found = []
            for lic in licenses:
                code = lic.get("code", "")
                used_by = lic.get("used_by_username", "") or ""
                if search_term.upper() in code or search_term.lower() in used_by.lower():
                    found.append(lic)

            if found:
                print(colored(f"\n🔍 {len(found)} Lizenz(en) gefunden:", Colors.GREEN))
                for lic in found:
                    code = lic.get("code", "?")
                    if lic.get("is_used"):
                        username = lic.get("used_by_username", "Unknown")
                        print(f"  {code} - Verwendet von {username}")
                    else:
                        print(f"  {code} - Verfügbar")
            else:
                print(colored(f"❌ Keine Lizenzen für '{search_term}' gefunden", Colors.YELLOW))
        else:
            print(colored(f"❌ Fehler {response.status_code}", Colors.RED))
    except requests.exceptions.RequestException as e:
        print(colored(f"❌ Netzwerk-Fehler: {e}", Colors.RED))


def batch_operations():
    """Batch-Operationen Menü."""
    print(colored("\n🔧 BATCH-OPERATIONEN", Colors.BOLD))
    print("=" * 50)
    print("1. 📤 Lizenzen aus CSV importieren (nicht verfügbar)")
    print("2. 📥 Alle Lizenzen exportieren")
    print("3. 🗑️  Alle ungenutzten Lizenzen löschen (nicht verfügbar)")
    print("4. 📊 Vollständiger Datenbank-Export (nicht verfügbar)")
    print("5. ↩️  Zurück")

    choice = input("\nWähle (1-5): ").strip()
    if choice == "1":
        print(colored("❌ CSV-Import wird vom Backend derzeit nicht unterstützt.", Colors.RED))
    elif choice == "2":
        export_all_licenses()
    elif choice == "3":
        print(colored("❌ Löschen ungenutzter Lizenzen wird derzeit nicht unterstützt.", Colors.RED))
    elif choice == "4":
        print(colored("❌ Vollständiger DB-Export wird derzeit nicht unterstützt.", Colors.RED))


def get_system_status():
    """Prüft den System-Status."""
    url = f"{BASE_URL}/api/status"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(colored("✅ Server ist online", Colors.GREEN))
            if "uptime" in status:
                uptime = format_uptime(status["uptime"]) if status.get("uptime") is not None else "—"
                print(f"⏰ Uptime: {uptime}")
            if "database" in status:
                print(f"🗄️  Database: {status['database']}")
            return True
        else:
            print(colored(f"❌ Server Fehler {response.status_code}", Colors.RED))
            return False
    except requests.exceptions.RequestException:
        print(colored("❌ Server ist offline", Colors.RED))
        return False


def license_menu():
    """License Management Untermenü."""
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
            try:
                count = int(input("Anzahl (1-100): ") or "1")
            except ValueError:
                count = 1
            create_license_codes(count)
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
    """User Management Untermenü."""
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
    """Statistiken Untermenü."""
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
    """Generiert einen Nutzungsbericht basierend auf aggregierten Statistiken."""
    stats = get_database_stats()
    if stats:
        print(colored("\n📈 NUTZUNGSBERICHT", Colors.BOLD))
        print("=" * 50)
        licenses = stats.get("licenses", {})
        total = licenses.get('total', 0)
        used = licenses.get('used', 0)
        if total > 0:
            usage_rate = (used / max(total, 1)) * 100.0
            print(f"License-Nutzungsrate: {colored(f'{usage_rate:.1f}%', Colors.CYAN)}")
        print(f"Aktive Tokens: {stats.get('tokens', {}).get('active', 0)}")


def live_monitoring():
    """Live-Monitoring der Serveraktivität."""
    print(colored("\n🔄 LIVE MONITORING (Drücke Ctrl+C zum Beenden)", Colors.YELLOW))
    print("=" * 50)
    try:
        while True:
            stats = get_database_stats()
            if stats:
                # Bildschirm "leeren"
                print("\033[2J\033[H")
                print(colored("🔄 LIVE MONITORING", Colors.BOLD))
                print(f"Zeit: {datetime.now().strftime('%H:%M:%S')}")
                print("-" * 30)
                print(f"Users: {stats.get('users', {}).get('total', 0)}")
                print(f"Lizenzen gesamt: {stats.get('licenses', {}).get('total', 0)}")
                print(f"Lizenzen verwendet: {stats.get('licenses', {}).get('used', 0)}")
                print(f"Aktive Tokens: {stats.get('tokens', {}).get('active', 0)}")
            time.sleep(5)
    except KeyboardInterrupt:
        print(colored("\n✅ Monitoring beendet", Colors.GREEN))


def main():
    """Hauptfunktion - Erweitertes interaktives Menü."""
    print(colored("🎩 Imperia Magic v3.0 - Enhanced Admin Tool", Colors.BOLD))
    print("=" * 50)

    # Hinweis, falls kein Admin-Key konfiguriert ist
    if not ADMIN_KEY:
        print(colored("⚠️  Kein ADMIN_KEY gesetzt. Admin-Endpunkte könnten ungeschützt sein.", Colors.YELLOW))

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


if __name__ == "__main__":
    main()

