# Performance-Audit

Stand: 28. Juli 2026

## Ergebnis

| Messwert | Vorher | Nachher | Veränderung |
|---|---:|---:|---:|
| Arbeitskopie ohne `.git` und lokale Tools | 85.537.828 B | 18.258.945 B | −78,7 % |
| Durch den ersten Preloader blockierte Frames | 100 | 6 | −94 % |
| Kritische lokale Datenmenge bis zur Freigabe | 6.833.642 B | 1.273.813 B | −81,4 % |
| Maximal gleichzeitig decodierte Frames (Desktop) | 100 | 28 | −72 % |
| Maximal gleichzeitig decodierte Frames (Mobile) | 8 | 8 | unverändert; Blob-Cache begrenzt |
| Frame-Anzahl und Auflösung | 100 × 1280 × 720 | 100 × 1280 × 720 | unverändert |

Die kritische Datenmenge umfasst HTML, CSS, JavaScript, Hero, Logo, beide lokalen Fonts und die vom Preloader priorisierten Frames. Netzwerkzeit hängt vom Endgerät, Cache und Anschluss ab; deshalb werden hier reproduzierbare Dateimengen statt eines nicht reproduzierbaren Einzel-Lighthouse-Laufs dokumentiert.

## Engpässe und Maßnahmen

| Engpass | Ursache | Maßnahme |
|---|---|---|
| Späte Freigabe der Startseite | Alle 100 Frames waren Teil des Preloaders | Nur Hero, Logo, Fonts und sechs frühe Frames blockieren; Sicherheitslimit 5 s |
| Hoher Desktop-Speicher | 100 decodierte 1280×720-Bilder plus vollständiger Blob-Cache | LRU-artiger Cache mit 28 decodierten Frames und 28 Blobs; `ImageBitmap.close()` beim Entfernen |
| Hoher Mobile-Speicher | Vollständiger Blob-Cache trotz begrenzter Decodes | 8 decodierte Frames, höchstens 12 Blobs, außerhalb der Sequenz aggressives Freigeben |
| Unnötige Last direkt beim Laden | MP4-Metadaten und Sequenz wurden sofort angefordert | Video-Fallback `preload="none"`; Sequenz erst in Abschnittsnähe und in Leerlaufphasen |
| Große Arbeitskopie / Pages-Artefakt | Nicht referenzierte PNG-Quellderivate und veraltete WebP-Motive | 12 nachweislich nicht verwendete Bilddateien entfernt |
| Fehlende automatische Kontrolle | Frame-Lücken und kaputte lokale Referenzen konnten unbemerkt veröffentlicht werden | Abhängigkeitsfreie Validierung vor jedem Pages-Deployment |

## Frame-Ladestrategie

1. Der Preloader lädt sechs frühe Frames mit echten Fortschrittswerten und gibt die Seite spätestens nach fünf Sekunden frei.
2. Sobald die Cinematic-Sektion in die Nähe des Viewports kommt, werden strategisch verteilte Schlüsselbilder mit begrenzter Parallelität geladen.
3. Weitere Frames folgen über `requestIdleCallback`; der Fallback nutzt kurze `setTimeout`-Intervalle.
4. Beim Scrollen erhalten Zielframe und direkte Nachbarn Vorrang.
5. Ein fehlender Frame wird einmal erneut angefordert. Danach bleibt der nächstgelegene verfügbare Frame sichtbar.
6. Bereits laufende Requests werden dedupliziert. Der Blob- und Bitmap-Cache ist auf Mobile und Desktop getrennt begrenzt.

## Qualitätsvergleich der Frames

Die vorhandene Qualitätsstufe 68 wurde gegen zwei vollständige, temporär erzeugte Sequenzen verglichen:

| WebP-Stufe | Gesamtgröße | Ersparnis | mittleres PSNR gegenüber Bestand | Entscheidung |
|---|---:|---:|---:|---|
| 68 (Bestand) | 6.106.130 B | – | Referenz | beibehalten |
| 66 | 5.765.380 B | 5,6 % | 35,61 dB | verworfen |
| 64 | 5.644.430 B | 7,6 % | 35,52 dB | verworfen |

Die geringe zusätzliche Ersparnis rechtfertigt den messbaren Generationsverlust nicht. Reihenfolge, Abmessungen und 100-Frame-Scroll-Mapping bleiben deshalb vollständig unverändert.

## Reproduzierbare Prüfung

```bash
node scripts/validate-site.mjs
python -m http.server 8000
```

Danach prüfen:

- 1904 × 873, 1366 × 768 und 390 × 844 Pixel
- erster Besuch: Preloader sichtbar, echte Fortschrittsanzeige, sichere Freigabe
- Reload in derselben Sitzung: kein erneuter Preloader
- langsames und schnelles Scrollen durch alle 100 Frames vorwärts und rückwärts
- Navigation, Dropdown, Mobile-Menü, Kontaktformular und alle vier Leistungsseiten
- `prefers-reduced-motion: reduce`: statisches Cinematic-Bild, keine komplexe Bewegung
- Browserkonsole ohne Fehler und kein horizontaler Überlauf

## GitHub Pages und Cache

GitHub Pages steuert die HTTP-Cache-Header. Die Website nutzt deshalb versionierte CSS-/JavaScript-URLs für sichere Aktualisierungen und stabile Dateinamen für wiederverwendbare Bilder und Frames. Es gibt keinen Service Worker und damit keinen zweiten, schwer invalidierbaren Cache. Der Workflow validiert die Site vor dem Upload; der bestehende Pages-Deployweg bleibt unverändert.

## Bewusst unveränderte Bereiche

- Das 57-KB-Stylesheet bleibt eine einzelne renderkritische Datei. Eine Aufteilung würde einen weiteren Request, zusätzlichen Pflegeaufwand und FOUC-Risiko erzeugen, ohne für diese Seitengröße einen belastbaren Vorteil zu liefern.
- Die sichtbare Gestaltung, Media Queries, Scroll-Distanzen und Animationskurven wurden nicht verändert.
- Der MP4-Clip bleibt als bestehender Fallback im Repository, wird aber nicht mehr vorsorglich geladen.
- GitHub Pages erlaubt in diesem Setup keine projektspezifische Cache-Control-Konfiguration. Versionsparameter an CSS und JavaScript übernehmen deshalb die Invalidierung.

## Referenzen

- [web.dev: Browser-level image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading)
- [web.dev: Preload critical assets](https://web.dev/articles/preload-critical-assets)
- [web.dev: Optimize resource loading](https://web.dev/learn/performance/optimize-resource-loading)
