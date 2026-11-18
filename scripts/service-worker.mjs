import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(path) {
  const out = [];
  for (const item of await readdir(path,{withFileTypes:true})) {
    const p = `${path}/${item.name}`;
    out.push(...(item.isDirectory() ? await walk(p) : [p]));
  }
  return out;
}
const paths = (await walk('dist')).filter(p => !p.endsWith('/sw.js'));
const hash = createHash('sha256');
for (const p of paths) hash.update(await readFile(p));
const version = hash.digest('hex').slice(0,12);
await writeFile('dist/sw.js',`const CACHE = 'recall-${version}';
const ASSETS = ${JSON.stringify(paths.map(p => './'+p.slice(5)))};
self.addEventListener('install',event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate',event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('recall-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch',event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL('index.html',self.registration.scope)))); return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
`);
console.log(`Offline cache: ${paths.length} files, ${version}.`);
