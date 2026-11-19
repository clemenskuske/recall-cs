import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileBank } from '../scripts/content.mjs';
import { freshState, reviewQuestion, queueFor, validateState, stateFor } from '../src/learning.js';
import { validatePrerequisites, questionUnlocked, successfulReviewCounts } from '../src/prerequisites.js';
const actual=await compileBank(), base=actual.questions[0];
const card=(id,prerequisites=[])=>({...base,id,topic:'fixture',prerequisites});
const bankOf=questions=>({topics:[{id:'fixture',title:'Fixture',description:'Test',color:'sage'}],questions});
const now=new Date('2026-11-19T12:00:00Z');
const correct=q=>q.answers.find(a=>a.correct), wrong=q=>q.answers.find(a=>!a.correct);
function answer(q,state,good=true,guessed=false){
  const at=stateFor(q,state)?.card.due||now;
  return reviewQuestion(q,state,good?correct(q):wrong(q),guessed,new Date(at));
}

test('each prerequisite needs two correct non-guessed answers; misses do not erase successes',()=>{
 const a=card('a'),b=card('b'),c=card('c',['a','b']),bank=bankOf([a,b,c]),s=freshState();
 assert.deepEqual(queueFor(bank,s,now,()=>0).fresh.map(q=>q.id).sort(),['a','b']);
 assert.deepEqual(queueFor(bank,s,now).locked.map(q=>q.id),['c']);
 answer(a,s);assert.equal(questionUnlocked(c,bank,s),false);
 answer(a,s,false);answer(a,s,true,true);
 assert.equal(successfulReviewCounts(bank,s).get('a'),1);
 answer(a,s);answer(b,s);assert.equal(questionUnlocked(c,bank,s),false,'one success on b is insufficient');
 answer(b,s);assert.equal(questionUnlocked(c,bank,s),true);
 assert.equal(s.cards.b.mastery,1,'two answers on the same day count even though distractor mastery advances once');
 answer(a,s,false);assert.equal(questionUnlocked(c,bank,s),true,'successes need not be consecutive');
 const restored=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(questionUnlocked(c,bank,restored),true,'existing exported history supplies unlock credit');
});

test('current revisions supply unlock credit and started questions keep their review schedule',()=>{
 const a=card('a'),b=card('b',['a']),bank=bankOf([a,b]),s=freshState();
 answer(a,s);answer(a,s);
 const revisedA={...a,revision:a.revision+1}, updated=bankOf([revisedA,b]);
 assert.equal(questionUnlocked(b,updated,s),false,'old prerequisite revisions must not unlock unseen questions');
 answer(b,s);const due=new Date(s.cards.b.card.due);
 assert.equal(questionUnlocked(b,updated,s),true,'already-started dependent remains unlocked');
 assert.ok(queueFor(updated,s,due).due.some(q=>q.id==='b'));
 const revisedB={...b,revision:b.revision+1}, bothRevised=bankOf([revisedA,revisedB]);
 assert.equal(questionUnlocked(revisedB,bothRevised,s),false,'a revised dependent starts anew');
 answer(revisedA,s);answer(revisedA,s);
 assert.equal(questionUnlocked(revisedB,bothRevised,s),true);
});

test('unlocking respects daily limits, pauses, selected topics, and normal review timing',()=>{
 const a=card('a'),b=card('b',['a']),bank=bankOf([a,b]),s=freshState();s.settings.newPerDay=1;
 answer(a,s);const firstDue=new Date(s.cards.a.card.due);
 assert.equal(queueFor(bank,s,now).due.length,0,'do not force an early review to unlock questions');
 assert.equal(queueFor(bank,s,now).fresh.length,0);
 answer(a,s);const later=new Date(firstDue.getTime()+1);
 assert.equal(questionUnlocked(b,bank,s),true);
 assert.equal(queueFor(bank,s,later).fresh.length,0,'unlocking does not bypass the daily new-card allowance');
 s.settings.newPerDay=2;
 assert.deepEqual(queueFor(bank,s,later).fresh.map(q=>q.id),['b']);
 s.suspended.b=b.revision;assert.equal(queueFor(bank,s,later).fresh.length,0);
 delete s.suspended.b;s.settings.selectedTopics=[];assert.equal(queueFor(bank,s,later).fresh.length,0);
 // A prerequisite need not still be selected for its past successes to count.
 const other={...a,topic:'other'},cross={topics:[...bank.topics,{id:'other'}],questions:[other,b]};
 s.settings.selectedTopics=['fixture'];assert.equal(questionUnlocked(b,cross,s),true);
});

test('legacy cards without prerequisites remain available and histories need no migration',()=>{
 const q=card('legacy');delete q.prerequisites;
 const bank=bankOf([q]),s=validateState(JSON.parse(JSON.stringify(freshState())));
 assert.equal(questionUnlocked(q,bank,s),true);
 assert.deepEqual(queueFor(bank,s,now).fresh.map(q=>q.id),['legacy']);
 assert.deepEqual(queueFor(bank,s,now).locked,[]);
 assert.equal(s.version,1);
});

test('shared browser/build validation rejects invalid or impossible prerequisite graphs',()=>{
 for(const prerequisites of [null,'a',[null],[3],['bad id'],['a','a']])assert.throws(()=>validatePrerequisites([card('a'),{...card('b'),prerequisites}]),/prerequisites/);
 assert.throws(()=>validatePrerequisites([card('a',['a'])]),/itself/);
 assert.throws(()=>validatePrerequisites([card('a',['missing'])]),/missing/);
 assert.throws(()=>validatePrerequisites([{...card('a'),status:'retired'},card('b',['a'])]),/retired/);
 assert.throws(()=>validatePrerequisites([card('a',['b']),card('b',['c']),card('c',['a'])]),/cycle/);
 assert.doesNotThrow(()=>validatePrerequisites([card('a'),card('b',['a']),card('c',['a']),card('d',['b','c'])]));
});

test('content compilation enforces prerequisite validation before publishing',async()=>{
 const root=await mkdtemp(join(tmpdir(),'recall-prerequisites-'));
 try{
  await mkdir(join(root,'questions','fixture'),{recursive:true});
  await writeFile(join(root,'topics.json'),JSON.stringify(bankOf([]).topics));
  await writeFile(join(root,'questions','fixture','a.json'),JSON.stringify(card('a',['missing'])));
  await assert.rejects(compileBank(root),/missing prerequisite/);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('the published curriculum has independent entry points and every question can eventually unlock',()=>{
 const s=freshState();s.settings.selectedTopics=actual.topics.map(t=>t.id);
 const initial=actual.questions.filter(q=>questionUnlocked(q,actual,s));
 assert.equal(initial.length,20);assert.equal(actual.questions.length-initial.length,52);
 for(const topic of actual.topics)assert.ok(initial.some(q=>q.topic===topic.id),'each topic needs entry questions');
 const completed=new Set();
 while(completed.size<actual.questions.length){
  const next=actual.questions.filter(q=>!completed.has(q.id)&&questionUnlocked(q,actual,s));
  assert.ok(next.length,'no unreachable remainder');
  for(const q of next){
   assert.ok((q.prerequisites||[]).every(id=>actual.questions.find(p=>p.id===id)?.topic===q.topic),'current topics should progress independently');
   answer(q,s);answer(q,s);completed.add(q.id);
  }
 }
 assert.equal(completed.size,72);
});
