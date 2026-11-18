import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const question=async id=>JSON.parse(await readFile(new URL(`../questions/dense-graph-classes/${id}.json`,import.meta.url),'utf8'));
const status=bits=>bits.every(Boolean)?'B':bits.every(x=>!x)?'N':'R';

test('displayed contraction-rule choices are checked against all concrete 2-by-2 adjacency patterns',async()=>{
  const q=await question('dense-10-twin-red-update');
  const cases=[];
  // U,V,X each have two original vertices. Enumerate all U-X and V-X pairs.
  for(let mask=0;mask<256;mask++){
    const u=Array.from({length:4},(_,i)=>Boolean(mask&(1<<i)));
    const v=Array.from({length:4},(_,i)=>Boolean(mask&(1<<(4+i))));
    cases.push([status(u),status(v),status([...u,...v])]);
  }
  assert.equal(new Set(cases.map(([a,b])=>a+b)).size,9);
  for(const answer of q.answers){
    const rules=new Map([...answer.text.matchAll(/([BNR])([BNR])\\mapsto ([BNR])/g)].flatMap(([,a,b,c])=>[[a+b,c],[b+a,c]]));
    const differs=cases.some(([a,b,actual])=>{
      if(answer.text.startsWith('Every status pair'))return actual!=='R';
      if(answer.text.startsWith('Equal statuses'))return actual!==a;
      if(rules.has(a+b))return actual!==rules.get(a+b);
      // Partial alternatives are already disproved by their explicit mappings.
      return false;
    });
    assert.equal(!differs,answer.correct,answer.id);
  }
});

test('the half-graph separating dependence and stability has the stated three-label construction',()=>{
  for(let n=1;n<=12;n++){
    const vertices=[],edges=new Set();
    for(let j=1;j<=n;j++){
      vertices.push({name:`a${j}`,label:'A'},{name:`b${j}`,label:'B-new'});
      for(const a of vertices.filter(v=>v.label==='A'))for(const b of vertices.filter(v=>v.label==='B-new'))edges.add(`${a.name}:${b.name}`);
      for(const v of vertices)if(v.label==='B-new')v.label='B-done';
    }
    for(let i=1;i<=n;i++)for(let j=1;j<=n;j++)assert.equal(edges.has(`a${i}:b${j}`),i<=j);
    assert.equal(edges.size,n*(n+1)/2);
  }
});

test('explicit height-one/two tree-models validate the nine non-separating classes in the shrubdepth card',()=>{
  // A height-two leaf is represented by its root-child group and colour.
  // Half-distance is 1 within a group, 2 between groups. Height-one examples
  // use a single group, so every pair has half-distance 1.
  const examples=[
    {name:'cliques',verts:Array.from({length:8},(_,i)=>({g:0,c:0,i})),sig:()=>true,edge:()=>true},
    {name:'edgeless',verts:Array.from({length:8},(_,i)=>({g:0,c:0,i})),sig:()=>false,edge:()=>false},
    {name:'complete bipartite',verts:Array.from({length:8},(_,i)=>({g:0,c:i<3?0:1,i})),sig:(a,b)=>a!==b,edge:(a,b)=>(a.i<3)!==(b.i<3)},
    {name:'stars',verts:Array.from({length:8},(_,i)=>({g:0,c:i===0?0:1,i})),sig:(a,b)=>a!==b,edge:(a,b)=>a.i===0||b.i===0},
    {name:'matching',verts:Array.from({length:9},(_,i)=>({g:Math.floor(i/2),c:0,i})),sig:(a,b,l)=>l===1,edge:(a,b)=>Math.floor(a.i/2)===Math.floor(b.i/2)},
    {name:'cluster graphs',verts:Array.from({length:12},(_,i)=>({g:Math.floor(i/3),c:0,i})),sig:(a,b,l)=>l===1,edge:(a,b)=>Math.floor(a.i/3)===Math.floor(b.i/3)},
    {name:'complement of matching',verts:Array.from({length:9},(_,i)=>({g:Math.floor(i/2),c:0,i})),sig:(a,b,l)=>l===2,edge:(a,b)=>Math.floor(a.i/2)!==Math.floor(b.i/2)},
    {name:'star forest',verts:Array.from({length:12},(_,i)=>({g:Math.floor(i/4),c:i%4===0?0:1,i})),sig:(a,b,l)=>l===1&&a!==b,edge:(a,b)=>Math.floor(a.i/4)===Math.floor(b.i/4)&&((a.i%4===0)!==(b.i%4===0))},
    {name:'complete multipartite',verts:Array.from({length:12},(_,i)=>({g:Math.floor(i/3),c:0,i})),sig:(a,b,l)=>l===2,edge:(a,b)=>Math.floor(a.i/3)!==Math.floor(b.i/3)},
  ];
  for(const {name,verts,sig,edge} of examples)for(let i=0;i<verts.length;i++)for(let j=i+1;j<verts.length;j++){
    const a=verts[i],b=verts[j];assert.equal(sig(a.c,b.c,a.g===b.g?1:2),edge(a,b),name);
  }
});
