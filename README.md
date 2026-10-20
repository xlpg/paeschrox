# Hyrox 12 Wochen

Trainings-App für den 12-Wochen-Hyrox-Plan (Mo Kraft + Schlitten, Mi Laufen + Ergos, Fr Hyrox-Kombi).
Statische PWA: läuft offline, Daten bleiben nur auf dem Handy.

**App:** https://xlpg.github.io/paeschrox/

## Zum Startbildschirm hinzufügen

- **iPhone:** Adresse in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.
- **Android:** Adresse in **Chrome** öffnen → Menü (⋮) → **App installieren** (oder „Zum Startbildschirm hinzufügen“).

Danach die App einmal mit Internet öffnen. Ab dann funktioniert sie auch ohne Netz im Studio.

## Daten

- Alles wird lokal im Browser-Speicher (IndexedDB) des Handys gespeichert. Es gibt keinen Server und keinen Sync.
- **Daten sichern** (unten in der Übersicht) lädt `hyrox-JJJJ-MM-TT.json` herunter. Das ist das Backup, auch für den Umzug auf ein neues Handy.
- **Daten laden** liest so eine Datei wieder ein (auch Exporte aus dem alten Prototyp).
- **Tabelle für Excel** erzeugt eine CSV-Datei (Semikolon-getrennt) mit allen Einträgen.
- Wer die App vom Startbildschirm löscht oder die Website-Daten im Browser löscht, verliert die Einträge. Deshalb regelmäßig sichern.

## Termine

Unter **Termine** lässt sich der Montag von Woche 1 oder der Wettkampftag eintragen. Die Übersicht zeigt dann zu jeder Woche die Tage und markiert die aktuelle Woche.

## Dateien

| Datei | Inhalt |
|---|---|
| `plan.js` | Planinhalt: Wochen, Übungen, Gewichte |
| `app.js` | Oberfläche, Speicherung, Stoppuhr, Export/Import |
| `styles.css` | Design (hell/dunkel) |
| `sw.js` | Service Worker (Offline-Cache) |
| `manifest.webmanifest`, `icons/` | App-Name und Icons |
| `tools/make-icons.js` | erzeugt die Icons neu: `node tools/make-icons.js` |
| `tools/serve.js` | lokaler Testserver: `node tools/serve.js` → http://localhost:8080 |

### Plan ändern

- Übungen in `plan.js` anpassen. Jeder Schritt hat einen **Key** (z. B. `"kreuzheben"`). Gespeicherte Einträge hängen am Key, nicht an der Position. Die Reihenfolge darf sich also ändern, den Key aber nicht umbenennen.
- **Nach jeder Änderung** in `sw.js` die `VERSION` hochzählen (`hyrox-v1` → `hyrox-v2`), sonst behalten die Handys die alte Version. Die App lädt das Update beim nächsten Öffnen automatisch (während einer laufenden Einheit erst beim Zurück zur Übersicht).
