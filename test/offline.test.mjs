import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
test('offline cache serves a coherent shell and module assets under a Pages subpath despite Vary: Origin',async()=>{
  const root=await mkdtemp(join(tmpdir(),'recall-offline-'));
  try{
    await mkdir(join(root,'dist/assets'),{recursive:true});
    await writeFile(join(root,'dist/index.html'),'<script type="module" crossorigin src="./assets/app.js"></script>');
    await writeFile(join(root,'dist/assets/app.js'),'APP');
    execFileSync(process.execPath,[new URL('../scripts/service-worker.mjs',import.meta.url).pathname],{cwd:root});
    const source=await readFile(join(root,'dist/sw.js'),'utf8');
    const scope='https://example.test/recall-cs/';
    const events={},entries=new Map();let networkCalls=0;
    const cache={addAll:async paths=>{for(const path of paths)entries.set(new URL(path,scope).href,path.endsWith('index.html')?'SHELL':'APP');},match:async(request,options)=>{const url=request.url||String(request);if(request.headers?.Origin&&!options?.ignoreVary)return undefined;return entries.get(url);}};
    vm.runInNewContext(source,{URL,caches:{open:async()=>cache,keys:async()=>[],delete:async()=>true},self:{location:{origin:'https://example.test'},registration:{scope},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,handler)=>events[name]=handler},fetch:async()=>{networkCalls++;throw new Error('offline');}});
    let installed;events.install({waitUntil:promise=>installed=promise});await installed;
    let response;events.fetch({request:{method:'GET',mode:'navigate',url:scope},respondWith:promise=>response=promise});assert.equal(await response,'SHELL');
    events.fetch({request:{method:'GET',mode:'cors',url:scope+'assets/app.js',headers:{Origin:'https://example.test'}},respondWith:promise=>response=promise});assert.equal(await response,'APP');assert.equal(networkCalls,0);
    let intercepted=false;events.fetch({request:{method:'GET',mode:'cors',url:'https://api.github.com/repos/example'},respondWith:()=>intercepted=true});assert.equal(intercepted,false);
  }finally{await rm(root,{recursive:true,force:true});}
});
