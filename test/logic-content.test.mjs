import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// Parse the displayed TeX, independently of the question's marked answer.
// No eval: only this small, explicit language of classical formulas is accepted.
function parse(tex) {
  const source=tex.replace(/\$/g,'').replace(/\\,/g,'');
  const tokens=source.match(/\\(?:neg|land|lor|top|bot|to|leftrightarrow|equiv|forall|exists)|[A-Zx()]/g)||[];
  assert.equal(tokens.join(''),source.replace(/\s/g,''),'unsupported formula syntax');
  let pos=0;
  const take=token=>{if(tokens[pos]===token){pos++;return true;}return false;};
  const need=token=>assert.ok(take(token),`expected ${token} in ${tex}`);
  const unary=()=>{
    if(take('\\neg'))return {op:'not',a:unary()};
    if(take('\\top'))return {op:'constant',value:true};
    if(take('\\bot'))return {op:'constant',value:false};
    if(tokens[pos]==='\\forall'||tokens[pos]==='\\exists'){
      const op=tokens[pos++];need('x');return {op,a:unary()};
    }
    if(take('(')){const node=equivalence();need(')');return node;}
    const name=tokens[pos++];assert.match(name||'',/^[A-Z]$/);
    if(take('(')){need('x');need(')');return {op:'predicate',name};}
    return {op:'variable',name};
  };
  const and=()=>{let a=unary();while(take('\\land'))a={op:'and',a,b:unary()};return a;};
  const or=()=>{let a=and();while(take('\\lor'))a={op:'or',a,b:and()};return a;};
  const implies=()=>{const a=or();return take('\\to')?{op:'implies',a,b:implies()}:a;};
  const iff=()=>{let a=implies();while(take('\\leftrightarrow'))a={op:'iff',a,b:implies()};return a;};
  const equivalence=()=>{const a=iff();return take('\\equiv')?{op:'iff',a,b:iff()}:a;};
  const result=equivalence();assert.equal(pos,tokens.length);return result;
}
function evaluate(n,env){
  if(n.op==='constant')return n.value;
  if(n.op==='variable')return env[n.name];
  if(n.op==='predicate')return env.object[n.name];
  if(n.op==='not')return !evaluate(n.a,env);
  if(n.op==='and')return evaluate(n.a,env)&&evaluate(n.b,env);
  if(n.op==='or')return evaluate(n.a,env)||evaluate(n.b,env);
  if(n.op==='implies')return !evaluate(n.a,env)||evaluate(n.b,env);
  if(n.op==='iff')return evaluate(n.a,env)===evaluate(n.b,env);
  if(n.op==='\\forall')return env.domain.every(object=>evaluate(n.a,{...env,object}));
  if(n.op==='\\exists')return env.domain.some(object=>evaluate(n.a,{...env,object}));
  throw new Error('Unknown operator');
}
const targets={
  'logic-01-and':(p,q)=>p&&q,
  'logic-02-inclusive-or':(p,q)=>p||q,
  'logic-03-implication':(p,q)=>!p||q,
  'logic-04-if-and-only-if':(p,q)=>p===q,
  'logic-05-converse':(p,q)=>!q||p,
  'logic-06-contrapositive':(p,q)=>!p||q,
  'logic-07-negate-implication':(p,q)=>p&&!q,
  'logic-08-not-both':(p,q)=>!(p&&q),
  'logic-09-neither-nor':(p,q)=>!(p||q),
  'logic-10-double-negation':p=>p,
  'logic-11-tautology':()=>true,
  'logic-12-valid-inference':()=>true,
};
// Read source so the original retired cards remain checked alongside new ones.
const dir=new URL('../questions/logic-basics/',import.meta.url);
const bank={questions:await Promise.all((await readdir(dir)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(new URL(f,dir),'utf8'))))};
test('all propositional answer keys and distractors agree with exhaustive truth tables',()=>{
  for(const [id,target] of Object.entries(targets)){
    const q=bank.questions.find(q=>q.id===id);assert.ok(q);
    for(const answer of q.answers){
      const ast=parse(answer.text);
      const equivalent=[false,true].every(P=>[false,true].every(Q=>evaluate(ast,{P,Q})===target(P,Q)));
      assert.equal(answer.correct,equivalent,`${id}: ${answer.text}`);
    }
  }
});

const assignments=[false,true].flatMap(P=>[false,true].flatMap(Q=>[false,true].map(R=>({P,Q,R}))));
const mathSpans=text=>text.match(/\$[^$\n]+\$/g)||[];
const tautology=tex=>{const ast=parse(tex);return assignments.every(env=>evaluate(ast,env));};

test('named Boolean laws and all law-recognition alternatives are valid identities',()=>{
  const cards=bank.questions.filter(q=>q.status==='active'&&(/-(name|law)$/.test(q.id)));
  assert.ok(cards.length>0);
  for(const q of cards){
    // These cards ask which NAME or STANDARD PATTERN applies. Their distractors
    // deliberately show other valid laws; falsity is not the selection rule.
    const identities=[q.prompt,...q.answers.map(a=>a.text)].flatMap(mathSpans).filter(tex=>tex.includes('\\equiv')&&tex!=='$\\equiv$');
    assert.ok(identities.length>0,q.id);
    for(const tex of identities)assert.ok(tautology(tex),`${q.id}: ${tex}`);
  }
});

test('only the selected implication identity has a truth-table counterexample',()=>{
  const q=bank.questions.find(q=>q.id==='logic-27-implication-not-commutative');assert.ok(q);
  for(const a of q.answers)assert.equal(a.correct,!tautology(a.text),a.id);
});

test('neutral and absorbing roles use fixed constants, with every displayed claim checked',()=>{
  const q=bank.questions.find(q=>q.id==='logic-25-neutral-and-absorbing');assert.ok(q);
  for(const a of q.answers){
    const formulas=mathSpans(a.text);assert.equal(formulas.length,2);
    const [neutral,absorbing]=formulas.map(parse);
    const isConjunctionWithConstant=n=>n.op==='iff'&&n.a.op==='and'&&n.a.a.op==='variable'&&n.a.a.name==='P'&&n.a.b.op==='constant';
    const matchesRoles=isConjunctionWithConstant(neutral)&&isConjunctionWithConstant(absorbing)&&neutral.b.op==='variable'&&neutral.b.name==='P'&&absorbing.b.op==='constant'&&absorbing.a.b.value===absorbing.b.value&&formulas.every(tautology);
    assert.equal(a.correct,matchesRoles,a.id);
    // The three introductory distractors contain a false identity; later ones
    // contrast valid laws with the requested roles of fixed constants.
    assert.equal(formulas.every(tautology),a.correct||a.difficulty>1,a.id);
  }
});

test('Boolean duality preserves structure while exchanging both connectives and constants',()=>{
  const q=bank.questions.find(q=>q.id==='logic-28-boolean-duality');assert.ok(q);
  const original=parse(mathSpans(q.prompt).find(tex=>tex.includes('\\equiv')&&tex!=='$\\equiv$'));
  const dual=n=>n.op==='constant'?{...n,value:!n.value}:{...n,op:({and:'or',or:'and'})[n.op]||n.op,...(n.a?{a:dual(n.a)}:{}),...(n.b?{b:dual(n.b)}:{})};
  const expected=dual(original);
  for(const a of q.answers){
    const actual=parse(a.text);
    assert.equal(a.correct,JSON.stringify(actual)===JSON.stringify(expected),a.id);
    assert.equal(tautology(a.text),a.correct||a.difficulty>1,a.id);
  }
  assert.ok(assignments.every(env=>evaluate(expected,env)));
});
test('quantifier distractors have concrete countermodels; correct formulas agree on all small models',()=>{
  for(const [id,names,target] of [
    ['logic-13-negate-every',['P','T'],d=>!d.every(o=>!o.P||o.T)],
    ['logic-14-negate-some',['E','R'],d=>!d.some(o=>o.E&&o.R)],
  ]){
    const q=bank.questions.find(q=>q.id===id);assert.ok(q);
    for(const answer of q.answers){
      const ast=parse(answer.text);let differs=false;
      for(let size=1;size<=3;size++)for(let bits=0;bits<2**(size*2);bits++){
        const domain=Array.from({length:size},(_,i)=>({[names[0]]:Boolean(bits&(1<<(2*i))),[names[1]]:Boolean(bits&(1<<(2*i+1)))}));
        if(evaluate(ast,{domain})!==target(domain))differs=true;
      }
      assert.equal(!differs,answer.correct,`${id}: ${answer.text}`);
    }
  }
});
