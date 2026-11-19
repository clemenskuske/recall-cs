import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { freshState, choicesFor, queueFor, reviewQuestion, stateFor, difficultyFor, validateState, dayKey, streak, selectedTopicIds } from '../src/learning.js';
import { compileBank, validateQuestion } from '../scripts/content.mjs';
const bank=await compileBank();
const q=bank.questions[0];
test('entire bank validates and has globally unique IDs',()=>{assert.equal(bank.questions.length,new Set(bank.questions.map(q=>q.id)).size);assert.ok(bank.questions.length>0);});
test('every level presents one correct and three distinct wrong answers',()=>{
  for(const q of bank.questions)for(const level of ['1','2','3'])for(let i=0;i<15;i++){
    const s=freshState();s.settings.difficulty=level;const answers=choicesFor(q,s);
    assert.equal(answers.length,4);assert.equal(new Set(answers.map(a=>a.id)).size,4);assert.equal(answers.filter(a=>a.correct).length,1);assert.ok(answers.filter(a=>!a.correct).every(a=>a.difficulty===Number(level)));
  }
});
test('new question allowance is shared across sessions and respects topic selection',()=>{
  const s=freshState();s.settings.newPerDay=2;s.settings.selectedTopics=[q.topic];const now=new Date('2026-11-18T12:00:00Z');
  assert.equal(queueFor(bank,s,now).fresh.length,2);
  reviewQuestion(q,s,q.answers[0],false,now);
  assert.equal(queueFor(bank,s,now).fresh.length,1);
  assert.ok(queueFor(bank,s,now).fresh.every(x=>x.topic===q.topic));
  s.settings.selectedTopics=[];assert.equal(queueFor(bank,s,now).fresh.length,0);
});
test('successive new questions rotate across topics rather than restarting the first topic',()=>{
  const s=freshState(), now=new Date('2026-11-18T12:00:00Z');const seen=[];
  const topics=Array.from({length:4},(_,i)=>({id:`fixture-${i}`}));
  const fixture={topics,questions:topics.flatMap(t=>[0,1].map(i=>({...q,id:`${t.id}-${i}`,topic:t.id,status:'active'})))};
  s.settings.selectedTopics=topics.map(t=>t.id);
  for(let i=0;i<4;i++){const q=queueFor(fixture,s,now).fresh[0];seen.push(q.topic);reviewQuestion(q,s,q.answers[0],false,now);}
  assert.equal(new Set(seen).size,4);
});
test('random selection reaches the whole unseen pool before applying the daily limit',()=>{
  const now=new Date('2026-11-19T12:00:00Z'), s=freshState();
  s.settings.selectedTopics=['fixture'];s.settings.newPerDay=1;
  const fixture={topics:[{id:'fixture'}],questions:Array.from({length:4},(_,i)=>({...q,id:`new-${i}`,topic:'fixture'}))};
  const before=JSON.stringify({fixture,s}), firstChoices=new Set();
  // Deterministic random inputs make every question selectable with a one-card
  // allowance, including questions beyond the original first-card prefix.
  for(const values of [[0,0,0],[0.99,0,0.99],[0,0.99,0.99],[0.99,0.99,0.99]]){
    let index=0;const random=()=>values[index++];
    const queue=queueFor(fixture,s,now,random);
    assert.equal(queue.fresh.length,1);assert.equal(queue.unseen,4);
    firstChoices.add(queue.fresh[0].id);
  }
  assert.equal(firstChoices.size,4);
  assert.equal(JSON.stringify({fixture,s}),before,'queue construction must not mutate progress or bank order');
  const seen=[];
  for(let day=0;day<4;day++){
    const date=new Date(+now+day*86400000), next=queueFor(fixture,s,date,()=>0.3).fresh[0];
    seen.push(next.id);reviewQuestion(next,s,next.answers[0],false,date);
    assert.equal(queueFor(fixture,s,date,()=>0.5).fresh.length,0,'daily allowance survives rebuilding the queue');
  }
  assert.equal(new Set(seen).size,4,'previously introduced cards must not be drawn as new again');
});
test('due reviews are randomized without admitting future, paused, retired, or unselected cards',()=>{
  const now=new Date('2026-11-19T12:00:00Z'),s=freshState();s.settings.selectedTopics=['selected'];
  const questions=['due-0','due-1','due-2','future','paused','retired','unselected','new'].map(id=>({...q,id,topic:id==='unselected'?'other':'selected',status:id==='retired'?'retired':'active'}));
  const fixture={topics:[{id:'selected'},{id:'other'}],questions};
  for(const [i,question] of questions.entries())if(question.id!=='new'){
    reviewQuestion(question,s,question.answers[0],false,new Date(+now-86400000));
    s.cards[question.id].card.due=new Date(+now-(i+1)*60000);
  }
  s.cards.future.card.due=new Date(+now+60000);s.suspended.paused=q.revision;
  const before=JSON.stringify(s);
  const a=queueFor(fixture,s,now,()=>0),b=queueFor(fixture,s,now,()=>0.99);
  assert.notDeepEqual(a.due.map(q=>q.id),b.due.map(q=>q.id));
  for(const queue of [a,b]){
    assert.deepEqual(queue.due.map(q=>q.id).sort(),['due-0','due-1','due-2']);
    assert.deepEqual(queue.fresh.map(q=>q.id),['new']);
    assert.ok((queue.due[0]||queue.fresh[0]).id.startsWith('due-'));
  }
  assert.equal(JSON.stringify(s),before,'shuffling must not alter scheduled dates');
});
test('current topic replaces retired selections, while active choices and deselect-all are preserved',()=>{
  const s=freshState();assert.deepEqual(selectedTopicIds(bank,s),['dense-graph-classes']);
  assert.ok(queueFor(bank,s).fresh.every(q=>q.topic==='dense-graph-classes'));
  s.settings.selectedTopics=['algorithms'];assert.deepEqual(selectedTopicIds(bank,s),['dense-graph-classes']);
  s.settings.selectedTopics=['logic-basics'];assert.deepEqual(selectedTopicIds(bank,s),['logic-basics']);
  const expanded={...bank,topics:[...bank.topics,{id:'another-topic'}]};
  s.settings.selectedTopics=['algorithms','another-topic'];assert.deepEqual(selectedTopicIds(expanded,s),['another-topic']);
  s.settings.selectedTopics=[];assert.equal(queueFor(bank,s).fresh.length,0);
});
test('retired starter records stay in source and leave the downloadable curriculum',async()=>{
  const sourceTopics=JSON.parse(await readFile(new URL('../topics.json',import.meta.url),'utf8'));
  const retired=[];
  const starterIds=['logic-basics','algorithms','data-structures','graph-theory','complexity'];
  for(const topic of sourceTopics.filter(t=>starterIds.includes(t.id))){
    const dir=new URL(`../questions/${topic.id}/`,import.meta.url);
    for(const file of await readdir(dir))if(file.endsWith('.json')&&(topic.id!=='logic-basics'||/^logic-(0[1-9]|1[0-4])-/.test(file)))retired.push(JSON.parse(await readFile(new URL(file,dir),'utf8')));
  }
  assert.equal(retired.length,38);
  assert.ok(retired.every(q=>q.status==='retired'&&q.revision===2));
  assert.ok(bank.questions.every(q=>!retired.some(r=>r.id===q.id)));
  assert.ok(bank.topics.every(t=>t.id==='logic-basics'||!starterIds.includes(t.id)));
  const s=freshState();s.settings.selectedTopics=['logic-basics'];s.settings.newPerDay=30;
  // Even previously learned and due starter cards must stay retired.
  reviewQuestion(retired[0],s,retired[0].answers.find(a=>!a.correct),false,new Date('2026-11-01T00:00:00Z'));
  const queue=queueFor(bank,s,new Date('2026-11-18T12:00:00Z'));
  assert.ok([...queue.due,...queue.fresh].every(q=>q.status==='active'&&q.topic==='logic-basics'&&!retired.some(r=>r.id===q.id)));
  assert.equal(queue.fresh.length,bank.questions.filter(q=>q.topic==='logic-basics').length);
  assert.ok(queue.fresh.length>0);
});
test('missed and guessed cards return after one minute, never immediately',()=>{
  for(const guessed of [false,true]){
    const s=freshState();const now=new Date('2026-11-18T12:00:00Z');
    const answer=guessed?q.answers[0]:q.answers[1];
    const result=reviewQuestion(q,s,answer,guessed,now);
    assert.equal(result.card.due.getTime()-now.getTime(),60000);
    assert.ok(!queueFor(bank,s,now).due.includes(q));
    assert.ok(queueFor(bank,s,new Date(now.getTime()+61000)).due.includes(q));
  }
});
test('successful spaced reviews grow intervals and harder alternatives',()=>{
  const s=freshState();let now=new Date('2026-11-18T12:00:00Z');const intervals=[];
  for(let i=0;i<7;i++){const result=reviewQuestion(q,s,q.answers[0],false,now);intervals.push(result.card.scheduled_days);now=result.card.due;}
  assert.ok(intervals.at(-1)>intervals[2]);assert.equal(difficultyFor(q,s),3);
  const restored=validateState(JSON.parse(JSON.stringify(s)));assert.ok(stateFor(q,restored));reviewQuestion(q,restored,q.answers[0],false,now);
});
test('same-day repetition cannot repeatedly increase distractor mastery',()=>{
  const s=freshState();const now=new Date('2026-11-18T12:00:00Z');reviewQuestion(q,s,q.answers[0],false,now);reviewQuestion(q,s,q.answers[0],false,new Date(+now+600000));assert.equal(s.cards[q.id].mastery,1);
});
test('new revisions resume paused questions and reset their schedule',()=>{
  const s=freshState();reviewQuestion(q,s,q.answers[0]);s.suspended[q.id]=q.revision;assert.ok(!queueFor(bank,s).fresh.includes(q));
  const revised={...q,revision:q.revision+1};assert.equal(stateFor(revised,s),null);assert.ok(queueFor({...bank,questions:[revised]},s).fresh.includes(revised));
  const retired={...revised,status:'retired'};assert.equal(queueFor({...bank,questions:[retired]},s).fresh.length,0);
});
test('streak uses consecutive local calendar days',()=>{
  const s=freshState();const now=new Date(2026,10,18,12);for(let i=0;i<3;i++){const d=new Date(now);d.setDate(d.getDate()-i);s.daily[dayKey(d)]={answers:1};}assert.equal(streak(s,now),3);
});
test('malformed TeX, duplicate answers, and bad backups are rejected',()=>{
  let bad=structuredClone(q);bad.prompt='$\\notARealCommand$';assert.throws(()=>validateQuestion(bad,q.topic,`${q.id}.json`));
  bad=structuredClone(q);bad.answers[1].text=bad.answers[0].text;assert.throws(()=>validateQuestion(bad,q.topic,`${q.id}.json`));
  assert.throws(()=>validateState({version:1,cards:{},reviews:[]}));
  const s=freshState();s.settings.retention=2;assert.throws(()=>validateState(s));
});
