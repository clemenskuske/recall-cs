import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import katex from 'katex';
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateQuestion(q, topic, filename) {
  const fail = message => { throw new Error(`${filename}: ${message}`); };
  if (!q || q.schemaVersion !== 1 || !slug.test(q.id) || q.topic !== topic || filename !== `${q.id}.json`) fail('invalid schema, ID, topic, or filename');
  if (!Number.isInteger(q.revision) || q.revision < 1 || !['active','retired'].includes(q.status)) fail('invalid revision or status');
  if (typeof q.prompt !== 'string' || !q.prompt.trim() || !Array.isArray(q.answers) || q.answers.filter(a => a.correct === true).length !== 1) fail('provide a prompt and exactly one correct answer');
  if (!Array.isArray(q.sources) || !q.sources.length || q.sources.some(s => typeof s.title !== 'string' || !s.title.trim() || !/^https:\/\//.test(s.url))) fail('provide authoritative sources');
  const ids = new Set(); const texts = new Set();
  for (const a of q.answers) {
    if (!slug.test(a.id) || ids.has(a.id) || typeof a.correct !== 'boolean' || typeof a.text !== 'string' || !a.text.trim() || typeof a.explanation !== 'string' || !a.explanation.trim()) fail('invalid or duplicate answer');
    if (!a.correct && ![1,2,3].includes(a.difficulty)) fail('wrong answer needs difficulty 1, 2, or 3');
    if (texts.has(a.text.trim().toLowerCase())) fail('duplicate answer text');
    ids.add(a.id); texts.add(a.text.trim().toLowerCase());
  }
  for (const level of [1,2,3]) if (q.answers.filter(a => !a.correct && a.difficulty === level).length < 3) fail(`need at least 3 distractors at level ${level}`);
  for (const text of [q.prompt, ...q.answers.flatMap(a => [a.text,a.explanation])]) {
    const math = text.match(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g) || [];
    if (text.replace(/\$\$[\s\S]*?\$\$|\$[^$\n]+\$/g,'').includes('$')) fail('unmatched math delimiter');
    for (const expression of math) {
      const n = expression.startsWith('$$') ? 2 : 1;
      try { katex.renderToString(expression.slice(n,-n),{throwOnError:true,trust:false,strict:'error'}); } catch (e) { fail(`invalid TeX: ${e.message}`); }
    }
  }
  return q;
}
export async function compileBank(root = process.cwd()) {
  const topics = JSON.parse(await readFile(`${root}/topics.json`,'utf8'));
  const questions = []; const ids = new Set();
  if (!Array.isArray(topics) || !topics.length || new Set(topics.map(t=>t.id)).size !== topics.length) throw new Error('Topics must be nonempty and unique.');
  for (const topic of topics) {
    if (!slug.test(topic.id) || typeof topic.title !== 'string' || typeof topic.description !== 'string' || !['sage','clay','lavender','sand'].includes(topic.color) || (topic.defaultSelected !== undefined && typeof topic.defaultSelected !== 'boolean')) throw new Error('Invalid topic metadata');
    for (const file of (await readdir(`${root}/questions/${topic.id}`)).sort()) {
      if (!file.endsWith('.json')) continue;
      const question = validateQuestion(JSON.parse(await readFile(`${root}/questions/${topic.id}/${file}`,'utf8')),topic.id,file);
      if (ids.has(question.id)) throw new Error(`Duplicate question ID ${question.id}`);
      ids.add(question.id); questions.push(question);
    }
  }
  const dirs = await readdir(`${root}/questions`,{withFileTypes:true});
  for (const dir of dirs) if (dir.isDirectory() && !topics.some(t => t.id === dir.name)) throw new Error(`Unregistered topic ${dir.name}`);
  const version = createHash('sha256').update(JSON.stringify({topics,questions})).digest('hex').slice(0,16);
  return {schemaVersion:1,version,topics,questions};
}
if (process.argv[1]?.endsWith('/content.mjs')) {
  const bank = await compileBank();
  if (!process.argv.includes('--check')) {
    await mkdir('public',{recursive:true});
    const data = JSON.stringify(bank,null,2)+'\n';
    await writeFile('bank.json',data);
    await writeFile('public/bank.json',data);
  }
  console.log(`Validated ${bank.questions.length} questions in ${bank.topics.length} topics (${bank.version}).`);
}
