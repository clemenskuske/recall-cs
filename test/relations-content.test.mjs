import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const dir=new URL('../questions/relations/',import.meta.url);
const questions=await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(new URL(f,dir),'utf8'))));

// Independently evaluate the actual displayed first-order formulas. No eval or
// executable question metadata: a small parser accepts only this explicit syntax.
function parseFormula(text){
  const source=[...text.matchAll(/\$([^$]+)\$/g)].at(-1)[1].replace(/\\;/g,'').replace(/\s/g,'');
  const tokens=source.match(/\\(?:forall|exists|neg|land|lor|Rightarrow|Leftrightarrow|ne)|R|[xyz=(),]/g)||[];
  assert.equal(tokens.join(''),source,`unsupported formula: ${text}`);
  let at=0;const peek=()=>tokens[at];
  function primary(){
    if(peek()==='\\forall'||peek()==='\\exists'){
      const op=tokens[at++],v=tokens[at++];assert.match(v,/^[xyz]$/);return {op,v,body:expression(0)};
    }
    if(peek()==='\\neg'){at++;return {op:'not',body:primary()};}
    if(peek()==='('){at++;const v=expression(0);assert.equal(tokens[at++],')');return v;}
    if(peek()==='R'){at++;assert.equal(tokens[at++],'(');const a=tokens[at++];assert.equal(tokens[at++],',');const b=tokens[at++];assert.equal(tokens[at++],')');return {op:'R',a,b};}
    const a=tokens[at++],op=tokens[at++],b=tokens[at++];assert.ok(op==='='||op==='\\ne');return {op,a,b};
  }
  const precedence={'\\Leftrightarrow':1,'\\Rightarrow':2,'\\lor':3,'\\land':4};
  function expression(min){let lhs=primary();while(precedence[peek()]>=min){const op=tokens[at++];lhs={op,lhs,rhs:expression(precedence[op]+1)};}return lhs;}
  const ast=expression(0);assert.equal(at,tokens.length);
  function run(t,m,e){
    if(t.op==='\\forall')return m.A.every(v=>run(t.body,m,{...e,[t.v]:v}));
    if(t.op==='\\exists')return m.A.some(v=>run(t.body,m,{...e,[t.v]:v}));
    if(t.op==='R')return m.r(e[t.a],e[t.b]);
    if(t.op==='=')return e[t.a]===e[t.b];
    if(t.op==='\\ne')return e[t.a]!==e[t.b];
    if(t.op==='not')return !run(t.body,m,e);
    const a=run(t.lhs,m,e),b=run(t.rhs,m,e);
    if(t.op==='\\land')return a&&b;if(t.op==='\\lor')return a||b;
    if(t.op==='\\Rightarrow')return !a||b;if(t.op==='\\Leftrightarrow')return a===b;
    throw Error(t.op);
  }
  return m=>run(ast,m,{});
}
function model(n,bits){
 const A=Array.from({length:n},(_,i)=>i),r=(a,b)=>Boolean(bits&(1<<(a*n+b)));
 const pairs=A.flatMap(a=>A.map(b=>[a,b])),triples=pairs.flatMap(([a,b])=>A.map(c=>[a,b,c]));
 const p={
 reflexive:A.every(a=>r(a,a)),irreflexive:A.every(a=>!r(a,a)),
 symmetric:pairs.every(([a,b])=>r(a,b)===r(b,a)),
 antisymmetric:pairs.every(([a,b])=>a===b||!r(a,b)||!r(b,a)),
 asymmetric:pairs.every(([a,b])=>!r(a,b)||!r(b,a)),
 transitive:triples.every(([a,b,c])=>!r(a,b)||!r(b,c)||r(a,c)),
 antitransitive:triples.every(([a,b,c])=>!r(a,b)||!r(b,c)||!r(a,c)),
 connex:pairs.every(([a,b])=>a===b||r(a,b)||r(b,a)),
 serial:A.every(a=>A.some(b=>r(a,b))),
 'some-loop':A.some(a=>r(a,a)),universal:pairs.every(([a,b])=>r(a,b)),empty:bits===0,
 coreflexive:pairs.every(([a,b])=>!r(a,b)||a===b),
 'strong-connex':pairs.every(([a,b])=>r(a,b)||r(b,a)),
 'right-unique':triples.every(([a,b,c])=>!r(a,b)||!r(a,c)||b===c),
 'right-euclidean':triples.every(([a,b,c])=>!r(a,b)||!r(a,c)||r(b,c)),
 incoming:A.every(b=>A.some(a=>r(a,b))),
 'common-target':A.some(b=>A.every(a=>r(a,b))),
 identity:pairs.every(([a,b])=>r(a,b)===(a===b)),nonempty:bits!==0,
 };
 p['not-reflexive']=!p.reflexive;p['not-symmetric']=!p.symmetric;p['not-transitive']=!p.transitive;
 p.preorder=p.reflexive&&p.transitive;p.equivalence=p.preorder&&p.symmetric;
 p.partial=p.preorder&&p.antisymmetric;p.strict=p.irreflexive&&p.transitive;
 p.total=p.partial&&p.connex;p['strict-total']=p.strict&&p.connex;
 p['total-preorder']=p.preorder&&p.connex;p.tolerance=p.reflexive&&p.symmetric;
 p['partial-equivalence']=p.symmetric&&p.transitive;
 p['strict-weak']=p.strict&&triples.every(([a,b,c])=>r(a,b)||r(b,a)||r(b,c)||r(c,b)||(!r(a,c)&&!r(c,a)));
 return {A,r,p,bits};
}
const models=[];for(let n=0;n<=3;n++)for(let bits=0;bits<2**(n*n);bits++)models.push(model(n,bits));
const labels={
 'Reflexivity':'reflexive','Irreflexivity':'irreflexive','Symmetry':'symmetric','Antisymmetry':'antisymmetric','Asymmetry':'asymmetric','Transitivity':'transitive','Connexity on distinct elements':'connex','Seriality':'serial','Antitransitivity':'antitransitive',
 'Failure of reflexivity':'not-reflexive','Failure of symmetry':'not-symmetric','Failure of transitivity':'not-transitive',
 'Existence of a self-loop':'some-loop','Universality':'universal','Emptiness':'empty','Coreflexivity':'coreflexive',
 'Comparability including equal elements':'strong-connex','Right-uniqueness':'right-unique','The right-Euclidean property':'right-euclidean',
 'Existence of an incoming neighbour for every element':'incoming','Existence of one common outgoing target':'common-target','Nonemptiness':'nonempty','Equality as the entire relation':'identity',
 'Preorders (quasi-orders)':'preorder','Equivalence relations':'equivalence','Strict partial orders':'strict','Symmetric relations':'symmetric','Partial orders':'partial','Total orders':'total','Total preorders':'total-preorder','Tolerance relations':'tolerance','Partial equivalence relations':'partial-equivalence','Strict weak orders':'strict-weak',
};
function sameOnModels(q,predicate,read,subset=models){
 for(const a of q.answers){const candidate=read(a.text);const witness=subset.find(m=>candidate(m)!==predicate(m));assert.equal(!witness,a.correct,`${q.id} ${a.id}: ${witness?`counterexample n=${witness.A.length}, bits=${witness.bits}`:'no distinguishing example'}`);}
}
test('relation terminology and displayed formulas have one correct choice, with finite counterexamples to every distractor',()=>{
 for(const q of questions.filter(q=>Number(q.id.split('-')[1])<=18)){
  const key=q.id.split('-').slice(2,-1).join('-');
  if(q.id.endsWith('-name')){
   const formula=parseFormula(q.prompt);for(const m of models)assert.equal(formula(m),m.p[key],q.id);
   sameOnModels(q,m=>m.p[key],t=>{assert.ok(labels[t.slice(0,-1)],t);return m=>m.p[labels[t.slice(0,-1)]];});
  }else sameOnModels(q,m=>m.p[key],parseFormula);
 }
 for(const [num,target,assumption] of [[23,'total','partial'],[24,'strict-total','strict'],[25,'not-reflexive'],[30,'not-transitive']]){
  const q=questions.find(q=>q.id.startsWith(`relations-${num}-`));
  sameOnModels(q,m=>m.p[target],parseFormula,assumption?models.filter(m=>m.p[assumption]):models);
 }
});
function combination(t){
 // Recognize the few multiword conditions before splitting conjunctions.
 const normalized=t.slice(0,-1).toLowerCase().replace(/failure of reflexivity/g,'not-reflexive').replace(/failure of symmetry/g,'not-symmetric').replace(/not reflexive/g,'not-reflexive').replace(/antisymmetry/g,'antisymmetric').replace(/irreflexivity/g,'irreflexive').replace(/reflexivity/g,'reflexive').replace(/symmetry/g,'symmetric').replace(/transitivity/g,'transitive');
 const keys=normalized.split(/,? and |, /).map(x=>x.trim());
 for(const k of keys)assert.ok(k in models[0].p,`${t}: ${k}`);
 return m=>keys.every(k=>m.p[k]);
}
test('equivalence/order definitions and combined properties distinguish sufficient from equivalent conditions',()=>{
 for(const [num,predicate] of [[19,m=>m.p.equivalence],[21,m=>m.p.partial],[22,m=>m.p.strict],[26,m=>m.p.asymmetric],[28,m=>m.p.symmetric&&m.p.irreflexive]]){
  sameOnModels(questions.find(q=>q.id.startsWith(`relations-${num}-`)),predicate,combination);
 }
 sameOnModels(questions.find(q=>q.id.startsWith('relations-20-')),m=>m.p.preorder,t=>m=>m.p[labels[t.slice(0,-1)]]);
});
test('set formulations of symmetry plus antisymmetry allow arbitrary subsets of the diagonal',()=>{
 const q=questions.find(q=>q.id.startsWith('relations-27-'));
 const candidates={
  '$R\\subseteq\\Delta_A$.':m=>m.p.coreflexive,'$R=\\varnothing$.':m=>m.p.empty,'$R=A\\times A$.':m=>m.p.universal,
  '$R\\cap\\Delta_A=\\varnothing$.':m=>m.p.irreflexive,'$R=\\Delta_A$.':m=>m.p.identity,'$\\Delta_A\\subseteq R$.':m=>m.p.reflexive,
  '$R=R^{-1}$.':m=>m.p.symmetric,'$R\\cap R^{-1}=\\varnothing$.':m=>m.p.asymmetric,'$R\\cap R^{-1}\\subseteq\\Delta_A$.':m=>m.p.antisymmetric,
  '$R\\cup R^{-1}=\\Delta_A$.':m=>m.p.identity,
 };
 sameOnModels(q,m=>m.p.symmetric&&m.p.antisymmetric,t=>{assert.ok(candidates[t],t);return candidates[t];});
});
test('empty-domain boundary has exactly one valid characterization',()=>{
 const q=questions.find(q=>q.id.startsWith('relations-29-'));
 const candidates={
  'Exactly when $A=\\varnothing$.':m=>m.A.length===0,
  'For every domain, by choosing the empty relation.':()=>true,
  'For every domain, by choosing the identity relation.':()=>true,
  'For no domain.':()=>false,
  'Exactly when the relation has no off-diagonal pairs.':m=>m.p.coreflexive,
  'Exactly when $A$ has one element.':m=>m.A.length===1,
  'Exactly when the relation is symmetric.':m=>m.p.symmetric,
  'Exactly when at least one element lacks a loop.':m=>m.p['not-reflexive'],
  'Exactly when the relation is antisymmetric.':m=>m.p.antisymmetric,
  'Exactly when all related elements are distinct.':m=>m.p.irreflexive,
 };
 sameOnModels(q,m=>m.p.reflexive&&m.p.irreflexive,t=>{assert.ok(candidates[t],t);return candidates[t];});
});
