import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const noteFailure = (message) => failures.push(message);
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (entry.isDirectory() && ['.git', '.tools'].includes(entry.name)) return [];
  const target = join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});

const siteFiles = walk(root);
const textFiles = siteFiles.filter((file) => ['.html', '.css', '.js', '.mjs', '.xml'].includes(extname(file)));
const mojibake = /(?:\u00c3.|\u00c2.|\u00e2\u20ac|\ufffd)/;

for (const file of textFiles) {
  const content = readFileSync(file, 'utf8');
  if (mojibake.test(content)) noteFailure(`Fehlerhafte UTF-8-Darstellung in ${relative(root, file)}`);
}

const frameDirectory = join(root, 'assets', 'frames', 'transformation');
const expectedFrames = Array.from({ length: 100 }, (_, index) => `frame_${String(index + 1).padStart(4, '0')}.webp`);
const actualFrames = readdirSync(frameDirectory).filter((name) => name.endsWith('.webp')).sort();
if (actualFrames.length !== 100 || actualFrames.some((name, index) => name !== expectedFrames[index])) {
  noteFailure('Die Cinematic-Sequenz muss exakt frame_0001.webp bis frame_0100.webp enthalten.');
}
for (const frame of expectedFrames) {
  const target = join(frameDirectory, frame);
  if (!existsSync(target) || statSync(target).size === 0) noteFailure(`Fehlender oder leerer Frame: ${frame}`);
}

const htmlFiles = siteFiles.filter((file) => extname(file) === '.html');
const attributeReference = /\b(?:src|href|poster)=["']([^"']+)["']/g;
const hrefReference = /\bhref=["']([^"']+)["']/g;
const htmlIds = new Map(htmlFiles.map((file) => {
  const content = readFileSync(file, 'utf8');
  return [file, new Set(Array.from(content.matchAll(/\bid=["']([^"']+)["']/g), (match) => match[1]))];
}));

const resolveLocalTarget = (sourceFile, reference) => {
  const pathPart = reference.split(/[?#]/)[0];
  let target = pathPart ? resolve(dirname(sourceFile), pathPart) : sourceFile;
  if (pathPart.endsWith('/')) target = join(target, 'index.html');
  return target;
};

for (const file of htmlFiles) {
  const content = readFileSync(file, 'utf8');
  for (const [, rawReference] of content.matchAll(attributeReference)) {
    const reference = rawReference.split(/[?#]/)[0];
    if (!reference || /^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
    const target = resolveLocalTarget(file, rawReference);
    if (!existsSync(target)) noteFailure(`Fehlende lokale Referenz in ${relative(root, file)}: ${rawReference}`);
  }

  for (const [, rawHref] of content.matchAll(hrefReference)) {
    if (/^(?:https?:|mailto:|tel:|javascript:)/.test(rawHref)) continue;
    const hashIndex = rawHref.indexOf('#');
    if (hashIndex < 0 || hashIndex === rawHref.length - 1) continue;
    const target = resolveLocalTarget(file, rawHref);
    if (!existsSync(target) || extname(target) !== '.html') continue;
    let anchor;
    try { anchor = decodeURIComponent(rawHref.slice(hashIndex + 1)); }
    catch { noteFailure(`Ungültig codierter Anker in ${relative(root, file)}: ${rawHref}`); continue; }
    if (!htmlIds.get(target)?.has(anchor)) {
      noteFailure(`Fehlender Zielanker in ${relative(root, file)}: ${rawHref}`);
    }
  }
}

const appPath = join(root, 'app.js');
const app = readFileSync(appPath, 'utf8');
try { new Function(app); } catch (error) { noteFailure(`app.js ist syntaktisch ungültig: ${error.message}`); }
for (const marker of ['requestIdleCallback', 'IntersectionObserver', 'createImageBitmap', 'frameBlobCacheLimit']) {
  if (!app.includes(marker)) noteFailure(`Performance-Mechanismus fehlt in app.js: ${marker}`);
}
if (!app.includes('loadAllFrames')) noteFailure('Der Preloader muss alle 100 Frames vor der Freigabe vorbereiten.');
if (!app.includes('frameBlobCacheLimit = 100')) noteFailure('Der vollständige komprimierte Frame-Cache fehlt.');

const index = readFileSync(join(root, 'index.html'), 'utf8');
if (!index.includes('preload="none"')) noteFailure('Der versteckte Video-Fallback darf nicht initial vorgeladen werden.');

const runtimeAssets = walk(join(root, 'assets')).filter((file) => !file.endsWith('.txt'));
const runtimeBytes = runtimeAssets.reduce((sum, file) => sum + statSync(file).size, 0);
const frameBytes = actualFrames.reduce((sum, frame) => sum + statSync(join(frameDirectory, frame)).size, 0);
if (runtimeBytes > 22 * 1024 * 1024) noteFailure(`Runtime-Assets überschreiten 22 MiB: ${(runtimeBytes / 1024 / 1024).toFixed(2)} MiB`);
if (frameBytes > 7 * 1024 * 1024) noteFailure(`Frame-Sequenz überschreitet 7 MiB: ${(frameBytes / 1024 / 1024).toFixed(2)} MiB`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validierung erfolgreich: ${htmlFiles.length} HTML-Seiten, 100 Frames, ${(runtimeBytes / 1024 / 1024).toFixed(2)} MiB Runtime-Assets.`);
}
