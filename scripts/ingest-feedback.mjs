import { readFile, appendFile } from 'node:fs/promises';
import { errorTypes } from '../src/feedback.js';
export function parseIssueReport(issue) {
  if (!issue.title?.startsWith('[Quiz feedback]') || typeof issue.body !== 'string' || issue.body.length > 12000) throw new Error('Not a Recall report.');
  const block=issue.body.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!block) throw new Error('Missing JSON report.');
  const r=JSON.parse(block[1]);
  const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!/^[a-f0-9-]{36}$/.test(r.id) || !Number.isFinite(Date.parse(r.createdAt)) || !slug.test(r.questionId) || !slug.test(r.topic) || !Number.isInteger(r.revision) || r.revision<1 || !(r.type in errorTypes) || typeof r.note!=='string' || r.note.length>2000 || (r.answerId!==null && !slug.test(r.answerId)) || !Array.isArray(r.shownAnswerIds) || r.shownAnswerIds.length>4 || r.shownAnswerIds.some(id=>!slug.test(id))) throw new Error('Invalid report fields.');
  return { id:r.id,createdAt:r.createdAt,questionId:r.questionId,revision:r.revision,topic:r.topic,answerId:r.answerId,type:r.type,note:r.note,shownAnswerIds:r.shownAnswerIds,issueNumber:issue.number,issueUrl:issue.html_url };
}
export async function ingest(event, root=process.cwd()) {
  const report=parseIssueReport(event.issue);
  const question=JSON.parse(await readFile(`${root}/questions/${report.topic}/${report.questionId}.json`,'utf8'));
  if(report.revision>question.revision)throw new Error('Report references a future revision.');
  const file=`${root}/feedback/reports.jsonl`;
  const previous=await readFile(file,'utf8');
  if(previous.split('\n').some(line=>{try{return JSON.parse(line).id===report.id;}catch{return false;}}))return false;
  await appendFile(file,`${previous && !previous.endsWith('\n')?'\n':''}${JSON.stringify(report)}\n`);
  return true;
}
if(process.argv[1]?.endsWith('/ingest-feedback.mjs')) {
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  console.log(await ingest(event)?'Appended feedback report.':'Report already recorded.');
}
