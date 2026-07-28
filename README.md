# BG Bauland Website

Hochwertige, vollständig responsive Unternehmenswebsite für BG Bauland in Hockenheim. Die statische Website stellt Leistungen, Arbeitsweise und Kontaktmöglichkeiten vor und enthält genau eine scrollgesteuerte, aus 100 WebP-Frames aufgebaute Baufortschritts-Sequenz.

Öffentliche Website: https://bgbauland.github.io/bg-bauland/

Repository: https://github.com/bgbauland/bg-bauland

## Technologien

- Semantisches HTML5
- Modernes responsives CSS ohne Framework
- Vanilla JavaScript
- Canvas-Image-Sequence mit 100 WebP-Frames
- Statische WebP-Bilder und ein optimierter MP4-Fallback
- GitHub Pages mit offiziellem Actions-Workflow

## Projektstruktur

```text
.
├── index.html
├── impressum.html
├── datenschutz.html
├── styles.css
├── app.js
├── robots.txt
├── sitemap.xml
├── .nojekyll
├── .github/workflows/deploy.yml
└── assets
    ├── images
    │   ├── hero-bg-bauland.webp
    │   ├── construction-anchor.webp
    │   ├── demolition.webp
    │   ├── drywall.webp
    │   ├── paving.webp
    │   ├── reinforcement.webp
    │   ├── around-house.webp
    │   ├── contact-project.webp
    │   └── og-bg-bauland.webp
    ├── videos/transformation.mp4
    └── frames/transformation/frame_0001.webp … frame_0100.webp
```

## Lokale Vorschau

Im Projektverzeichnis ausführen:

```bash
python -m http.server 8000
```

Danach `http://localhost:8000` öffnen. Die Website sollte nicht direkt über das Dateisystem geöffnet werden, damit Canvas-Frames und Medien unter realistischen Bedingungen geladen werden.

## Veröffentlichung mit GitHub Pages

Der Workflow `.github/workflows/deploy.yml` veröffentlicht bei jedem Push auf `main` den Repository-Inhalt. In den Repository-Einstellungen muss unter **Pages** als Quelle **GitHub Actions** gewählt sein. Die Zieladresse lautet `https://bgbauland.github.io/bg-bauland/`.

## Firmendaten ändern

Adresse, Telefon, E-Mail und sichtbare Unternehmenstexte stehen in `index.html`, `impressum.html` und `datenschutz.html`. Strukturierte Unternehmensdaten befinden sich als JSON-LD im `<head>` von `index.html`. Bei Änderungen müssen Canonical-URL, Open-Graph-URL und `sitemap.xml` konsistent bleiben.

## Bilder austauschen

Neue statische Bilder als WebP mit 16:9-Seitenverhältnis und vorzugsweise 1920 × 1080 Pixeln unter demselben Dateinamen in `assets/images/` ablegen. So sind keine Quellcodeänderungen erforderlich. KI-generierte Motive dürfen nicht als echte Kundenreferenzen bezeichnet werden.

## Transformationsvideo und Frames austauschen

1. Den neuen, komprimierten H.264-Clip als `assets/videos/transformation.mp4` ablegen.
2. Genau 100 WebP-Frames mit vollständiger Nummerierung `frame_0001.webp` bis `frame_0100.webp` erzeugen.
3. Die Frames unter `assets/frames/transformation/` ablegen.
4. Gesamtgröße, Reihenfolge und Darstellung lokal prüfen.

Beispiel mit FFmpeg bei einem 12-Sekunden-Clip:

```bash
ffmpeg -i transformation.mp4 -vf "fps=100/12,scale=1280:-2:flags=lanczos" -frames:v 100 -c:v libwebp -quality 68 -compression_level 6 assets/frames/transformation/frame_%04d.webp
```

## Kontaktformular

GitHub Pages stellt kein Formular-Backend bereit. Das Formular validiert die Pflichtfelder im Browser und öffnet anschließend per `mailto:` das lokale E-Mail-Programm mit einem vorbereiteten Nachrichtentext. Die Website speichert oder übermittelt selbst keine Formulardaten und zeigt keine irreführende Versandbestätigung.

## Impressum und Datenschutz

Die rechtlichen Seiten sind ausdrücklich vorläufig. Vor dem endgültigen geschäftlichen Einsatz müssen sie anhand der tatsächlichen Unternehmenssituation rechtlich geprüft und ergänzt werden.

Noch zu ergänzen sind insbesondere:

- vollständig ausgeschriebener Name des Inhabers
- Rechtsform
- Handelsregisterangaben, falls vorhanden
- Umsatzsteuer-ID und Wirtschafts-ID, falls vorhanden
- endgültig geprüfte Impressumsangaben und Datenschutzerklärung

## Performance

- Hero-Bild wird priorisiert geladen.
- Bilder unterhalb des sichtbaren Bereichs verwenden Lazy Loading.
- Die Canvas-Frames werden mit vier begrenzten parallelen Downloads gestaffelt vorgeladen.
- Der mobile Videoclip lädt zunächst nur Metadaten.
- Bei `prefers-reduced-motion: reduce` wird ein statisches Schlüsselbild gezeigt.
- Sämtliche Assets sind lokal eingebunden; es gibt keine externen Fonts oder JavaScript-Abhängigkeiten.

