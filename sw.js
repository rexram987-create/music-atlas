const CACHE='music-atlas-shell-v29';
const SHELL=['/','/index.html','/app.js','/artist-data.mjs','/manifest.webmanifest','/icon.svg','/icon-192.png','/icon-512.png'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting()
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim()
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&SHELL.includes(url.pathname)){
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))
    }
    return response
  }).catch(async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    if(event.request.mode==='navigate')return caches.match('/index.html');
    return Response.error()
  }))
});
