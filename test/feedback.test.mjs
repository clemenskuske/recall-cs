import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendReport,makeReport,issueURL } from '../src/feedback.js';
import { parseIssueReport,ingest } from '../scripts/ingest-feedback.mjs';
const question={id:'example',topic:'algorithms',revision:1,answers:[{id:'a',correct:true}]};
test('a report survives the issue-form roundtrip including unicode',()=>{
  const report=makeReport(question,{type:'wording',note:'Why is λ unclear?\nPlease explain.',answerId:'a'},['a']);
  const url=new URL(issueURL(report));const issue={title:url.searchParams.get('title'),body:url.searchParams.get('body'),number:1,html_url:'https://github.com/test/issues/1'};
  const parsed=parseIssueReport(issue);assert.equal(parsed.note,report.note);assert.equal(parsed.id,report.id);
});
test('direct append re-reads on conflict and preserves concurrent reports',async()=>{
  const report=makeReport(question,{type:'unclear',note:'α'},['a']);let calls=0,saved;
  const fetcher=async(url,options)=>{calls++;if(options.method==='PUT'){saved=JSON.parse(options.body);return {ok:calls===4,status:calls===2?409:200};}return{ok:true,json:async()=>({sha: calls===1?'old':'new',content:Buffer.from(calls===1?'':'{"id":"concurrent"}\n').toString('base64')})};};
  await appendReport(report,'fake-test-token',fetcher);assert.equal(calls,4);const lines=Buffer.from(saved.content,'base64').toString().trim().split('\n').map(JSON.parse);assert.equal(lines[0].id,'concurrent');assert.equal(lines[1].note,'α');assert.equal(saved.sha,'new');
});
test('direct append is idempotent after an uncertain response',async()=>{
  const r=makeReport(question,{type:'unclear',note:''},[]);let calls=0;await appendReport(r,'fake',async()=>{calls++;return{ok:true,json:async()=>({content:Buffer.from(JSON.stringify(r)+'\n').toString('base64')})};});assert.equal(calls,1);
});
test('ingestion appends exactly once and treats shell syntax as inert text',async()=>{
  const root=await mkdtemp(join(tmpdir(),'recall-feedback-'));
  try{
    await mkdir(join(root,'questions/algorithms'),{recursive:true});await mkdir(join(root,'feedback'));
    await writeFile(join(root,'questions/algorithms/example.json'),JSON.stringify(question));await writeFile(join(root,'feedback/reports.jsonl'),'');
    const report=makeReport(question,{type:'wording',note:'$(echo bad) `command` ${{ secrets.X }}'},[]);const url=new URL(issueURL(report));const event={issue:{title:url.searchParams.get('title'),body:url.searchParams.get('body'),number:1,html_url:'https://example.com'}};
    assert.equal(await ingest(event,root),true);assert.equal(await ingest(event,root),false);const stored=JSON.parse((await readFile(join(root,'feedback/reports.jsonl'),'utf8')).trim());assert.equal(stored.note,report.note);
    report.topic='../secret';event.issue.body='```json\n'+JSON.stringify(report)+'\n```';assert.throws(()=>parseIssueReport(event.issue));
  }finally{await rm(root,{recursive:true,force:true});}
});
