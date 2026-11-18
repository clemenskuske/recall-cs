import { REPO, BRANCH, REPO_URL, REPORT_PATH } from './config.js';
export const errorTypes = {
  'wrong-key': 'An answer is wrongly marked correct or wrong',
  'ambiguous': 'More than one answer could be correct',
  'unclear': 'I can’t understand the question',
  'wording': 'The wording is awkward or misleading',
  'explanation': 'The explanation is wrong or unhelpful',
  'notation': 'The math or formatting is broken',
  'difficulty': 'The wrong answers are too obvious or too tricky',
  'other': 'Something else'
};
export function makeReport(question, data, shownIds) {
  if (!(data.type in errorTypes)) throw new Error('Choose an error type.');
  if (data.answerId && !question.answers.some(a => a.id === data.answerId)) throw new Error('Unknown answer.');
  return { id: crypto.randomUUID(), createdAt: new Date().toISOString(), questionId: question.id, revision: question.revision, topic: question.topic, answerId: data.answerId || null, type: data.type, note: String(data.note || '').slice(0,2000), shownAnswerIds: shownIds };
}
export function issueURL(report) {
  const body = `Report from Recall. Please keep the JSON block intact.\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\``;
  return `${REPO_URL}/issues/new?${new URLSearchParams({title: `[Quiz feedback] ${report.questionId}: ${report.type}`, body})}`;
}
function encode(text) { return btoa(Array.from(new TextEncoder().encode(text), b => String.fromCharCode(b)).join('')); }
function decode(text) { return new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,'')), c => c.charCodeAt(0))); }
export async function appendReport(report, token, fetcher = fetch) {
  const url = `https://api.github.com/repos/${REPO}/contents/${REPORT_PATH}`;
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await fetcher(`${url}?ref=${BRANCH}`, {headers, cache:'no-store'});
    if (!current.ok) throw new Error(current.status === 401 || current.status === 403 ? 'GitHub refused access. Check your token has Contents: read and write for this repository.' : `Could not read the reports file (${current.status}). Your report is saved on this device.`);
    const file = await current.json();
    const text = decode(file.content);
    if (text.split('\n').some(line => { try { return JSON.parse(line).id === report.id; } catch { return false; } })) return;
    const content = `${text.trimEnd()}${text.trim() ? '\n' : ''}${JSON.stringify(report)}\n`;
    const result = await fetcher(url, {method:'PUT',headers,body:JSON.stringify({message:`feedback: ${report.questionId} (${report.type})`,branch:BRANCH,sha:file.sha,content:encode(content)})});
    if (result.ok) return;
    if (result.status !== 409 && result.status !== 422) throw new Error(`GitHub could not save this report (${result.status}). It remains on this device.`);
  }
  throw new Error('The reports file changed while sending. Your report is saved here; try again.');
}
