# Prognos-inspiriertes Projektmanagement-Tool

Ein leichtgewichtiges, kollaboratives PM-Tool mit Fokus auf:
- **übersichtliche Zeitpläne (Roadmap/Gantt-ähnlich)**
- **Aufgabenverwaltung mit Zuständigkeiten**
- **gleichzeitige Bearbeitung über einen gemeinsamen Serverstand**

## Funktionen
- Projektname und Beschreibung pflegen
- Aufgaben mit Titel, Verantwortlich, Start/Ende, Status, Priorität und Notizen anlegen/löschen
- Roadmap-Ansicht als visuelle Zeitachsen-Balken
- Kollaboration über zentralen Zustand (`/api/state`) mit Revisionskontrolle (Konflikterkennung)
- Präsenzindikator für aktive Bearbeiter:innen

## Start
```bash
npm start
```
Danach im Browser öffnen: `http://localhost:3000`

## Hinweise zur Kollaboration
- Das Tool nutzt einen gemeinsamen In-Memory-Stand auf dem Node.js-Server.
- Mehrere Nutzer im gleichen Netzwerk/auf demselben Server sehen gemeinsame Daten.
- Bei Konflikten (parallel speichern) wird der Konflikt gemeldet und der aktuelle Stand neu geladen.
