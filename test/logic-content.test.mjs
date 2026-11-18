import test from 'node:test';
import assert from 'node:assert/strict';
import { compileBank } from '../scripts/content.mjs';

// Parse the displayed TeX, independently of the question's marked answer.
// No eval: only this small, explicit language of classical formulas is accepted.
function parse(tex) {
  const source=tex.replace(/\$/g,'').replace(/\\,/g,'');
  const tokens=source.match(/\\(?:neg|land|lor|to|leftrightarrow|forall|exists)|[A-Zx()]/g)||[];
  assert.equal(tokens.join(''),source.replace(/\s/g,''),'unsupported formula syntax');
  let pos=0;
  const take=token=>{if(tokens[pos]===token){pos++;return true;}return false;};
  const need=token=>assert.ok(take(token),`expected ${token} in ${tex}`);
  const unary=()=>{
    if(take('\\neg'))return {op:'not',a:unary()};
    if(tokens[pos]==='\\forall'||tokens[pos]==='\\exists'){
      const op=tokens[pos++];need('x');return {op,a:unary()};
    }
    if(take('(')){const node=iff();need(')');return node;}
    const name=tokens[pos++];assert.match(name||'',/^[A-Z]$/);
    if(take('(')){need('x');need(')');return {op:'predicate',name};}
    return {op:'variable',name};
  };
  const and=()=>{let a=unary();while(take('\\land'))a={op:'and',a,b:unary()};return a;};
  const or=()=>{let a=and();while(take('\\lor'))a={op:'or',a,b:and()};return a;};
  const implies=()=>{const a=or();return take('\\to')?{op:'implies',a,b:implies()}:a;};
  const iff=()=>{let a=implies();while(take('\\leftrightarrow'))a={op:'iff',a,b:implies()};return a;};
  const result=iff();assert.equal(pos,tokens.length);return result;
}
function evaluate(n,env){
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
const bank=await compileBank();
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
