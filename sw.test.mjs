import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('the installed app can serve its imported artist code without a connection', async () => {
  const listeners={};
  const cached=new Map();
  const cache={
    addAll:async paths=>{for(const path of paths)cached.set(path,new Response(path))},
    put:async(request,response)=>cached.set(new URL(request.url).pathname,response)
  };
  const caches={
    open:async()=>cache,
    match:async request=>cached.get(typeof request==='string'?request:new URL(request.url).pathname),
    keys:async()=>[],delete:async()=>true
  };
  const context={self:{addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:()=>{},clients:{claim:()=>{}}},
    caches,fetch:async()=>{throw Error('offline')},location:{origin:'https://music-atlas.vercel.app'},URL,Response,Promise};
  vm.runInNewContext(readFileSync(new URL('./sw.js',import.meta.url),'utf8'),context);
  let installing;
  listeners.install({waitUntil:promise=>installing=promise});
  await installing;
  let response;
  listeners.fetch({request:{url:'https://music-atlas.vercel.app/artist-data.mjs',method:'GET'},respondWith:promise=>response=promise});
  assert.equal((await response).status,200);
  assert.equal(await (await response).text(),'/artist-data.mjs');
  listeners.fetch({request:{url:'https://music-atlas.vercel.app/biography.mjs',method:'GET'},respondWith:promise=>response=promise});
  assert.equal(await (await response).text(),'/biography.mjs');
});
