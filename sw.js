/* McGrath High School service worker — makes the site installable and usable offline.
   Pages and _data/*.json are network-first (Content Manager edits show up immediately);
   images and scripts are served from cache and refreshed in the background.
   Bump VERSION to force every visitor onto fresh copies. */
const VERSION = 'mcgrath-v1';
const CORE = [
  '/', '/index.html', '/portal.html', '/events.html', '/highlights.html', '/store.html', '/offline.html',
  '/assets/site.js', '/assets/students.js', '/images/crest.png', '/images/icon-192.png', '/manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                         // form posts etc. go straight to the network
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;               // fonts, CMS, identity widget
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/.netlify/')) return;

  const fresh = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.startsWith('/_data/') || url.pathname === '/';
  e.respondWith(fresh ? networkFirst(req, url) : staleWhileRevalidate(req));
});

async function networkFirst(req, url) {
  const cache = await caches.open(VERSION);
  const key = url.origin + url.pathname;                    // ignore ?v= cache-busters
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key);
    if (hit) return hit;
    if (req.mode === 'navigate') return cache.match('/offline.html');
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || update;
}
