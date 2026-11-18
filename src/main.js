import './style.css';
import 'katex/dist/katex.min.css';
import { BANK_URL, REPO_URL, REPO } from './config.js';
import { freshState, readState, validateState, dayKey, queueFor, stateFor, difficultyFor, choicesFor, reviewQuestion, eligibleQuestions, streak, intervalLabel } from './learning.js';
import { rich, escapeHTML as esc } from './math.js';
import { errorTypes, makeReport, appendReport, issueURL } from './feedback.js';

const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let state = readState(), bank, view = 'today', session = null, syncStatus = 'Checking for updates', syncing = false, toastTimer;
const icons = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  chart:'<path d="M4 4v16h17M8 15v-4m5 4V7m5 8V4"/>',
  settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flag:'<path d="M5 22V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  graph:'<path d="m5 6 14 3-6 11L5 6Zm0 0 8 14m6-11L4 16"/><circle cx="5" cy="6" r="2"/><circle cx="19" cy="9" r="2"/><circle cx="13" cy="20" r="2"/><circle cx="4" cy="16" r="2"/>',
  route:'<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h4m4-2h1"/>',
  braces:'<path d="M9 3H7v6l-3 3 3 3v6h2M15 3h2v6l3 3-3 3v6h-2"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  sync:'<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>',
  book:'<path d="M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3V4Zm9 2v15"/>',
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
function save() { try { localStorage.setItem('recall-state',JSON.stringify(state)); } catch { toast('Your device could not save progress. Export a backup in Settings.'); } }
function toast(text) { const el = document.querySelector('#toast'); el.textContent = text; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'),5000); }
function selectedTopics() { return state.settings.selectedTopics ?? bank.topics.map(t => t.id); }
function topicOf(q) { return bank.topics.find(t => t.id === q.topic) || {title:q.topic,color:'sage',symbol:'book'}; }
function nav() {
  return [['today','sun','Today'],['topics','layers','Topics'],['progress','chart','Progress'],['settings','settings','Settings']].map(([id,svg,label]) => `<button class="nav-item ${view === id ? 'active' : ''}" data-view="${id}" ${view === id ? 'aria-current="page"' : ''}>${icon(svg)}<span>${label}</span></button>`).join('');
}
function shell(content) {
  app.innerHTML = `<div class="shell"><header class="topbar"><button class="wordmark" data-view="today" aria-label="Recall home">recall<span>↗</span></button><nav aria-label="Main navigation">${nav()}</nav><span class="top-note">A little learning goes a long way.</span><span class="mobile-streak">${icon('spark')} ${streak(state)} day${streak(state) === 1 ? '' : 's'}</span></header><main id="main" tabindex="-1">${content}</main><footer class="site-footer"><span>SMALL SESSIONS. LASTING KNOWLEDGE.</span><button class="sync-status" data-action="sync">${icon('sync')} ${esc(syncStatus)}</button></footer><nav class="mobile-nav" aria-label="Mobile navigation">${nav()}</nav></div>`;
}
function heading(eyebrow,title,subtitle='') { return `<div class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${subtitle ? `<p class="subheading">${subtitle}</p>` : ''}</div>`; }
function topicCard(topic, compact=false) {
  const questions = bank.questions.filter(q => q.topic === topic.id && q.status === 'active');
  const learned = questions.filter(q => stateFor(q,state)).length;
  const selected = selectedTopics().includes(topic.id);
  return `<button class="topic-card ${topic.color} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}" data-topic="${topic.id}" aria-pressed="${selected}"><div class="topic-top"><span class="topic-symbol">${icon(topic.symbol)}</span><span class="selection-check">${selected ? icon('check') : ''}</span></div><h3>${esc(topic.title)}</h3>${compact ? '' : `<p>${esc(topic.description)}</p>`}<div class="topic-bottom"><span>${questions.length} questions</span><span>${learned ? `${learned} started` : 'Ready to explore'}</span></div><div class="topic-track"><span style="width:${questions.length ? learned/questions.length*100 : 0}%"></span></div></button>`;
}
function garden() {
  return `<svg class="garden" viewBox="0 0 260 230" fill="none" aria-hidden="true"><circle cx="137" cy="112" r="89" stroke="currentColor" opacity=".12"/><circle cx="137" cy="112" r="61" stroke="currentColor" opacity=".12"/><path d="M139 199V74m0 88c-45 1-64-25-64-53 41-2 64 20 64 53Zm0-38c36 0 57-21 57-48-36-1-57 20-57 48Zm0-28c-28-1-42-18-42-39 27 0 42 15 42 39Z" fill="#c0db8d" stroke="#214e3f" stroke-width="2"/><path d="m98 129 41 33m35-67-35 29M114 73l25 23" stroke="#214e3f" stroke-width="2"/><circle cx="139" cy="49" r="17" fill="#e9ca82"/><path d="m207 155 4-10 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#e9ca82"/><path d="M109 199h60" stroke="#214e3f" stroke-width="3" stroke-linecap="round"/><circle cx="63" cy="76" r="4" fill="#214e3f" opacity=".4"/><circle cx="205" cy="49" r="3" fill="#214e3f" opacity=".4"/></svg>`;
}
function today() {
  const queue = queueFor(bank,state); const daily = state.daily[dayKey()] || {seconds:0,answers:0};
  const goal = Math.min(100,daily.seconds / (state.settings.minutes * 60)*100);
  shell(`${heading('YOUR DAILY MOMENT','A little better,<br><em>every day.</em>','Make room for a few good questions. Your future self will thank you.')}<section class="daily-card"><div class="daily-copy"><span class="pill">${icon('clock')} ${state.settings.minutes} MINUTES, JUST FOR YOU</span><h2>Your daily ${state.settings.minutes === 5 ? 'five' : state.settings.minutes === 3 ? 'three' : state.settings.minutes === 10 ? 'ten' : 'fifteen'}.</h2><p>${queue.due.length ? 'A few familiar ideas are ready to return.' : 'A small step toward things that stay with you.'}<br>Let’s give your memory something to work with.</p><button class="primary" data-action="start" ${queue.due.length+queue.fresh.length === 0 ? 'disabled' : ''}>${queue.due.length+queue.fresh.length === 0 ? 'You’re all caught up' : daily.answers ? 'Keep learning' : 'Start learning'} ${icon('arrow')}</button><span class="hero-detail">${selectedTopics().length} topics selected · At your own pace</span></div>${garden()}</section><section class="stats-row" aria-label="Today’s learning"><div><span class="stat-symbol">${icon('sync')}</span><div><strong>${queue.due.length}</strong><span>ready to review</span></div></div><div><span class="stat-symbol">${icon('book')}</span><div><strong>${queue.fresh.length}</strong><span>new for today</span></div></div><div><span class="stat-symbol">${icon('spark')}</span><div><strong>${streak(state)} <small>day${streak(state) === 1 ? '' : 's'}</small></strong><span>learning streak</span></div></div></section><section class="section"><div class="section-heading"><div><p class="eyebrow">FOLLOW YOUR CURIOSITY</p><h2>Your topics</h2></div><button class="text-button" data-view="topics">Manage topics ${icon('arrow')}</button></div><div class="topic-grid">${bank.topics.map(t => topicCard(t,true)).join('')}</div></section><section class="bottom-grid"><div class="gentle-card"><span class="mini-icon">${icon('chart')}</span><div><h3>A little counts.</h3><p>${daily.answers ? `${daily.answers} questions answered today. You’ve already shown up.` : 'No catching up. No cramming. Just a few minutes of showing up.'}</p><div class="goal-track"><span style="width:${goal}%"></span></div><small>${Math.floor(daily.seconds/60)} of ${state.settings.minutes} minutes today</small></div></div><div class="learning-note"><p class="eyebrow">BUILT TO STICK</p><p>Meet an idea. Retrieve it.<br>Come back just before it fades.</p><button class="text-button" data-action="science">How Recall helps you learn ${icon('arrow')}</button></div></section>`);
}
function topicsPage() {
  shell(`${heading('YOUR COLLECTION','Follow your curiosity.','Choose the topics that belong in your daily practice. You can change these any time.')}<div class="collection-toolbar"><span>${selectedTopics().length} of ${bank.topics.length} selected · ${bank.questions.filter(q => q.status === 'active').length} questions</span><button class="text-button" data-action="select-all">Select all</button></div><div class="topic-grid full">${bank.topics.map(t => topicCard(t)).join('')}</div><section class="add-topic-card"><span class="topic-symbol">${icon('spark')}</span><div><h2>What do you want to understand next?</h2><p>Ask your AI to use <strong>$recall-cs-questions</strong> to add questions on a topic. New questions arrive here when you open Recall.</p><button class="text-button" data-action="copy-prompt">Copy a starter prompt ${icon('arrow')}</button></div><a class="secondary" href="${REPO_URL}/tree/main/questions" target="_blank" rel="noopener">View question bank ↗</a></section>`);
}
function progressPage() {
  const reviews = state.reviews, correct = reviews.filter(r => r.correct && !r.guessed).length;
  const started = bank.questions.filter(q => stateFor(q,state));
  const week = Array.from({length:7},(_,i) => {const date=new Date();date.setDate(date.getDate()-6+i);return {date,stats:state.daily[dayKey(date)]};});
  shell(`${heading('THE BIGGER PICTURE','Small steps add up.','You’re building a habit, one good question at a time.')}<section class="progress-stats"><div><strong>${started.length}</strong><span>ideas explored</span></div><div><strong>${reviews.length}</strong><span>retrievals practiced</span></div><div><strong>${reviews.length ? Math.round(correct/reviews.length*100)+'%' : '—'}</strong><span>recalled without guessing</span></div></section><section class="panel"><div class="section-heading"><h2>Your last seven days</h2><span class="muted">${streak(state)} day streak</span></div><div class="week-chart">${week.map(({date,stats}) => `<div><span class="day-count">${stats?.answers || 0}</span><div class="day-column"><div style="height:${Math.max(4,Math.min(100,(stats?.seconds || 0)/(state.settings.minutes*60)*100))}%" class="${stats?.answers ? 'has-activity' : ''}"></div></div><span>${date.toLocaleDateString(undefined,{weekday:'short'})}</span></div>`).join('')}</div><p class="muted small">Bar height shows time toward your daily goal. Numbers show questions answered.</p></section><section class="section"><div class="section-heading"><h2>Growing understanding</h2></div>${bank.topics.map(t => {const questions=bank.questions.filter(q=>q.topic===t.id && q.status==='active');const familiar=questions.filter(q=>(stateFor(q,state)?.mastery || 0)>=2).length;return `<div class="progress-topic"><span class="topic-symbol ${t.color}">${icon(t.symbol)}</span><div><h3>${esc(t.title)}</h3><span class="muted">${familiar} of ${questions.length} recalled on multiple days</span></div><div class="topic-track"><span style="width:${questions.length ? familiar/questions.length*100 : 0}%"></span></div></div>`;}).join('')}</section><p class="privacy-note">Your progress stays on this device. Export a backup in Settings to keep it safe or move to another device.</p>`);
}
function settingsPage() {
  const s=state.settings; const token = Boolean(localStorage.getItem('recall-github-token'));
  const reports = state.reports.filter(r => r.status !== 'sent');
  shell(`${heading('MAKE IT YOURS','A rhythm that fits.','A few thoughtful defaults. Plenty of room to adjust.')}<div class="settings-grid"><section class="panel"><h2>Your daily practice</h2><label class="setting-row"><span><strong>Daily time goal</strong><small>A gentle stopping point, not a deadline.</small></span><select data-setting="minutes">${[3,5,10,15].map(n=>`<option value="${n}" ${s.minutes===n?'selected':''}>${n} minutes</option>`).join('')}</select></label><label class="setting-row"><span><strong>New questions per day</strong><small>Due reviews come first.</small></span><input type="number" min="0" max="30" value="${s.newPerDay}" data-setting="newPerDay"></label><label class="setting-row"><span><strong>Desired retention</strong><small>Higher targets mean more frequent reviews.</small></span><select data-setting="retention">${[.8,.85,.9,.95,.97].map(n=>`<option value="${n}" ${s.retention===n?'selected':''}>${Math.round(n*100)}%${n===.9?' · default':''}</option>`).join('')}</select></label><label class="setting-row"><span><strong>Wrong-answer difficulty</strong><small>Adaptive gets subtler as you learn.</small></span><select data-setting="difficulty">${[['adaptive','Adaptive'],['1','Foundations'],['2','Closer calls'],['3','Fine distinctions']].map(([v,l])=>`<option value="${v}" ${s.difficulty===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="setting-row"><span><strong>Little celebrations</strong><small>A small burst for a good answer.</small></span><input type="checkbox" role="switch" data-setting="celebrations" ${s.celebrations?'checked':''}></label><button class="text-button" data-action="science">About the learning method ${icon('arrow')}</button></section><div><section class="panel"><h2>Your question bank</h2><p>Questions and improvements live in a public GitHub repository.</p><a class="repo-link" href="${REPO_URL}" target="_blank" rel="noopener">${REPO} ↗</a><button class="secondary wide" data-action="sync">${icon('sync')} Check for new questions</button><p class="small muted" id="bank-status">${esc(syncStatus)} · bank ${esc(bank.version)}</p><details><summary>Send reports directly to GitHub</summary><p class="small">Without a token, the report form opens GitHub for you to confirm submission. For one-step sending, add a fine-grained token for this repository with <strong>Contents: read and write</strong>.</p><p class="small">The token stays in this browser and is sent only to GitHub. On iPhone, set it up inside the installed app.</p><a class="text-button small" href="https://github.com/settings/personal-access-tokens/new?name=Recall%20feedback&description=Write%20quiz%20feedback&target_name=clemenskuske&repository_ids=&contents=write" target="_blank" rel="noopener">Create a fine-grained token ↗</a><form id="token-form"><label for="github-token">Repository-only token</label><input id="github-token" type="password" placeholder="github_pat_…" autocomplete="off" required><button class="secondary wide" type="submit">${token?'Replace':'Save'} token on this device</button></form>${token?'<button class="text-button" data-action="remove-token">Remove saved token</button><p class="small">A token is saved on this device.</p>':''}</details></section><section class="panel"><h2>Keep your progress</h2><p>Your learning history stays in this browser. Backups include settings, progress, and report drafts. Tokens are excluded.</p><div class="button-row"><button class="secondary" data-action="export">Export backup</button><label class="secondary file-button">Import backup<input type="file" id="import-file" accept="application/json,.json"></label></div><button class="text-button" data-action="install">Add Recall to your iPhone ${icon('arrow')}</button></section></div></div><section class="panel"><div class="section-heading"><h2>Question reports</h2><span class="muted">${reports.length} pending on this device</span></div>${reports.length ? reports.map(r => `<div class="report-row"><div><strong>${esc(r.questionId)}</strong><p>${esc(errorTypes[r.type]||r.type)} · ${r.status==='github-opened'?'Awaiting GitHub submission or ingestion':'Saved on this device'}</p></div><button class="secondary" data-report-send="${esc(r.id)}">${token?'Send again':'Open on GitHub'}</button></div>`).join('') : '<p class="muted">Spot an issue while learning? The flag button is always beside a question.</p>'}<p class="small muted">Reported questions can be paused here until their revision changes.</p><button class="text-button" data-action="resume-paused">Resume paused questions (${Object.keys(state.suspended).length})</button></section>`);
}
function studyPage() {
  const q = session.question, selected = session.answer;
  const level = session.level, topic=topicOf(q), correct=q.answers.find(a=>a.correct);
  const elapsed = Math.min(100,session.seconds/(state.settings.minutes*60)*100);
  shell(`<section class="study-shell"><div class="study-top"><button class="text-button" data-action="finish">${icon('close')} Finish session</button><span>${session.answered} answered · ${state.settings.minutes} min practice</span></div><div class="session-track"><span style="width:${elapsed}%"></span></div><div class="question-meta"><span class="topic-pill ${topic.color}">${icon(topic.symbol)} ${esc(topic.title)}</span><span class="difficulty"><i></i><i class="${level>=2?'filled':''}"></i><i class="${level>=3?'filled':''}"></i>${['','Foundations','Closer calls','Fine distinctions'][session.level]}</span></div><div class="question-title-row"><p class="eyebrow">${session.wasNew ? 'MEET A NEW IDEA' : 'MAKE IT STICK'}</p><button class="flag-button" data-action="report" aria-label="Report a problem with this question">${icon('flag')}<span>Report</span></button></div><h1 class="question-title" tabindex="-1">${rich(q.prompt)}</h1><p class="question-hint">${selected ? 'Take a moment with the explanation.' : 'Think it through, then choose one answer.'}</p><div class="answers">${session.choices.map((answer,i)=>`<button class="answer ${selected ? (answer.correct?'correct':answer.id===selected.id?'incorrect':'dimmed') : ''}" data-answer="${answer.id}" ${selected?'disabled':''}><span class="answer-letter">${selected && answer.correct ? icon('check') : selected && answer.id===selected.id ? icon('close') : String.fromCharCode(65+i)}</span><span>${rich(answer.text)}</span>${selected && answer.correct ? '<span class="answer-label">Correct</span>' : ''}</button>`).join('')}</div>${selected ? `<section class="answer-feedback ${selected.correct?'success':'try-again'}" role="status"><div class="feedback-title">${icon(selected.correct?'spark':'book')}<h2>${selected.correct ? session.guessed ? 'A useful guess. Let’s revisit it.' : ['That’s it. Nicely recalled.','A little stronger already.','One more idea taking root.'][session.answered%3] : 'A good moment to learn.'}</h2></div>${!selected.correct?`<p>${rich(selected.explanation)}</p><p><strong>The correct answer:</strong> ${rich(correct.text)}</p>`:''}<p>${rich(correct.explanation)}</p><div class="feedback-foot"><span>${icon('clock')} Back in ${intervalLabel(stateFor(q,state).card.due)}</span><details><summary>Source</summary>${q.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`).join('')}</details></div></section><div class="study-actions">${selected.correct&&!session.guessed?'<button class="secondary" data-action="guessed">I guessed · revisit sooner</button>':'<span></span>'}<button class="primary" data-action="next">Continue ${icon('arrow')}</button></div>`:`<p class="study-tip">${icon('spark')} Try recalling the idea before comparing the choices.</p>`}</section>`);
}
function finishPage() {
  const stats = session; session = null; save();
  const queue = queueFor(bank,state);
  const upcoming=eligibleQuestions(bank,state).map(q=>stateFor(q,state)?.card.due).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b))[0];
  shell(`<section class="finish-card"><div class="finish-garden">${garden()}</div><p class="eyebrow">A LITTLE PROGRESS, WELL EARNED</p><h1>${stats.answered ? 'That’s time well spent.' : 'You’re right on track.'}</h1><p>${stats.answered ? 'You showed up for your future self. Let those ideas settle in.' : 'There’s nothing due in your selected topics right now.'}</p><div class="finish-stats"><div><strong>${stats.answered}</strong><span>questions practiced</span></div><div><strong>${stats.correct}</strong><span>correct answers</span></div><div><strong>${Math.max(0,Math.round(stats.seconds/60))}</strong><span>minutes invested</span></div></div><p class="muted">${upcoming ? new Date(upcoming)<=new Date() ? 'A review is ready whenever you want to continue.' : `Your next scheduled review is in ${intervalLabel(upcoming)}.` : 'Add more topics or come back tomorrow for new questions.'}</p><div class="button-row"><button class="primary" data-view="today">Back to today ${icon('arrow')}</button>${queue.due.length+queue.fresh.length ? '<button class="secondary" data-action="start">A little more</button>' : ''}</div></section>`);
}
function render() { if (!bank) return; if (session?.question) studyPage(); else ({today,topics:topicsPage,progress:progressPage,settings:settingsPage}[view]||today)(); }
function nextQuestion() {
  const queue=queueFor(bank,state);const question=queue.due[0] || queue.fresh[0];
  if (!question || session.seconds>=state.settings.minutes*60) { finishPage(); return; }
  session.question=question;session.wasNew=!stateFor(question,state);session.level=difficultyFor(question,state);session.choices=choicesFor(question,state);session.answer=null;session.guessed=false;
  render();document.querySelector('.question-title')?.focus({preventScroll:true});window.scrollTo(0,0);
}
function start() { view='today';session={seconds:0,answered:0,correct:0,question:null};nextQuestion(); }
function choose(id) {
  if (!session || session.answer) return;
  const answer=session.choices.find(a=>a.id===id);if(!answer) return;
  session.previousEntry=state.cards[session.question.id] ? structuredClone(state.cards[session.question.id]) : null;
  session.previousDaily=state.daily[dayKey()] ? structuredClone(state.daily[dayKey()]) : null;
  session.answerTime=new Date();session.answer=answer;session.answered++;session.correct+=Number(answer.correct);
  reviewQuestion(session.question,state,answer,false,session.answerTime,session.choices.map(a=>a.id));save();render();
  if (answer.correct && state.settings.celebrations && !matchMedia('(prefers-reduced-motion: reduce)').matches) celebrate();
  document.querySelector('.answer-feedback')?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function guessed() {
  if (!session?.answer?.correct || session.guessed) return;
  const today=dayKey(session.answerTime),seconds=state.daily[today].seconds;
  if (session.previousEntry) state.cards[session.question.id]=session.previousEntry;else delete state.cards[session.question.id];
  state.reviews.pop();state.daily[today]=session.previousDaily || {seconds:0,answers:0,correct:0,newIds:[]};state.daily[today].seconds=seconds;
  reviewQuestion(session.question,state,session.answer,true,session.answerTime,session.choices.map(a=>a.id));session.guessed=true;save();render();
}
function celebrate() {
  const burst=document.createElement('div');burst.className='confetti';burst.setAttribute('aria-hidden','true');burst.innerHTML=Array.from({length:20},(_,i)=>`<i style="--x:${(i/19)*100}vw;--r:${i*61}deg;--d:${(i%4)*.06}s;--c:${['#bfd688','#d7ad69','#6a947b','#b6a5d2'][i%4]}"></i>`).join('');document.body.append(burst);setTimeout(()=>burst.remove(),1600);
}
function openDialog(html) {dialog.innerHTML=`<button class="dialog-close" data-action="close-dialog" aria-label="Close">${icon('close')}</button>${html}`;dialog.showModal();}
function reportDialog() {
  const q=session.question;
  openDialog(`<p class="eyebrow">HELP THIS QUESTION GET BETTER</p><h2>Something feel off?</h2><p>Your feedback helps improve this question and the ones that come after it.</p><form id="report-form"><label for="report-target">What needs a change?</label><select id="report-target" name="answerId"><option value="">The question itself</option>${session.choices.map((a,i)=>`<option value="${a.id}" ${session.answer?.id===a.id?'selected':''}>Answer ${String.fromCharCode(65+i)}${session.answer?.id===a.id?' · your choice':''}${session.answer && a.correct?' · correct answer':''}</option>`).join('')}</select><label for="report-type">What’s the problem?</label><select id="report-type" name="type">${Object.entries(errorTypes).map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('')}</select><label for="report-note">Anything to add? <span class="muted">Optional</span></label><textarea id="report-note" name="note" rows="3" maxlength="2000" placeholder="What would make this clearer?"></textarea><label class="checkbox-label"><input type="checkbox" name="pause" checked> Pause this question until it’s revised</label><p class="small muted">${localStorage.getItem('recall-github-token')?'Send appends your report to the repository.':'Continue opens a prefilled GitHub report. Submit it there to add it to the repository.'}</p><button type="submit" class="primary wide">${localStorage.getItem('recall-github-token')?'Send report':'Continue to GitHub'} ${icon('arrow')}</button></form>`);
}
async function sendReport(report, targetWindow) {
  const token=localStorage.getItem('recall-github-token');
  if(token) {
    try {await appendReport(report,token);report.status='sent';save();toast('Thank you. Your report is saved in GitHub.');}
    catch(error){toast(error.message);}
  } else {
    const url=issueURL(report);
    if(targetWindow)targetWindow.location.href=url;else window.open(url,'_blank','noopener');
    report.status='github-opened';save();toast('Finish by submitting the prefilled issue on GitHub.');
  }
  if(view==='settings'&&!session)render();
}
function scienceDialog(){openDialog(`<p class="eyebrow">WHY IT WORKS</p><h2>Give your memory a little space.</h2><p><strong>Retrieve, then check.</strong> Trying to recall an answer strengthens memory. Every choice gets an explanation so incorrect alternatives don’t linger.</p><p><strong>Return at the right time.</strong> FSRS-6 schedules reviews from your answers. Correct retrievals generally lengthen intervals; errors and guesses trigger relearning. The default retention target is 90%, not a guarantee of your personal recall.</p><p><strong>Keep the challenge useful.</strong> Adaptive distractors move up a level after two successful retrieval days and step back after misses. This progression is an adjustable product heuristic, not a scientifically validated dose.</p><p><strong>A correct guess isn’t retrieval.</strong> Tap “I guessed” to revisit sooner. Try forming an answer before looking at the choices.</p><p class="small"><a href="https://pubmed.ncbi.nlm.nih.gov/18491500/" target="_blank" rel="noopener">Butler & Roediger (2008): feedback in multiple-choice practice ↗</a></p><p class="small"><a href="https://digitalcommons.usf.edu/psy_facpub/1766/" target="_blank" rel="noopener">Cepeda et al. (2008): spacing and retention ↗</a></p><p class="small"><a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noopener">FSRS implementation ↗</a></p>`);}
function installDialog(){openDialog(`<p class="eyebrow">A HOME FOR YOUR DAILY HABIT</p><h2>Recall on your iPhone.</h2><ol class="install-steps"><li>Open this site in <strong>Safari</strong>.</li><li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</li><li>If shown, turn on <strong>Open as Web App</strong>, then tap <strong>Add</strong>.</li><li>Open Recall from its new icon while online once to prepare offline access.</li></ol><p>Questions and math work offline after setup. New questions and sending reports need a connection.</p><p class="small muted">Safari and the home-screen app can use separate storage. Export and import your progress if you switch between them.</p>`);}
function exportBackup(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`recall-backup-${dayKey()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function isBank(b){
  if(!b || b.schemaVersion!==1 || typeof b.version!=='string' || !Array.isArray(b.questions) || !Array.isArray(b.topics) || !b.topics.length || new Set(b.topics.map(t=>t.id)).size!==b.topics.length) return false;
  const slug=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;const ids=new Set();
  return b.topics.every(t=>slug.test(t.id)&&typeof t.title==='string'&&typeof t.description==='string'&&['sage','clay','lavender','sand'].includes(t.color)) && b.questions.every(q=>{
    if(!slug.test(q.id)||ids.has(q.id)||!Number.isInteger(q.revision)||q.revision<1||!b.topics.some(t=>t.id===q.topic)||!['active','retired'].includes(q.status)||typeof q.prompt!=='string'||!Array.isArray(q.answers)||q.answers.filter(a=>a.correct===true).length!==1)return false;
    ids.add(q.id);return [1,2,3].every(n=>q.answers.filter(a=>!a.correct&&a.difficulty===n).length>=3)&&q.answers.every(a=>slug.test(a.id)&&typeof a.text==='string'&&typeof a.explanation==='string'&&typeof a.correct==='boolean')&&new Set(q.answers.map(a=>a.id)).size===q.answers.length&&Array.isArray(q.sources)&&q.sources.every(s=>typeof s.title==='string'&&/^https:\/\//.test(s.url));
  });
}
async function syncBank(manual=false) {
  if(syncing)return;syncing=true;
  try {
    const response=await fetch(`${BANK_URL}?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error();
    const latest=await response.json();if(!isBank(latest))throw new Error();
    const changed=latest.version!==bank.version;
    if(changed){bank=latest;localStorage.setItem('recall-bank',JSON.stringify(latest));if(manual||session)toast('Your question bank is updated. New content is ready for your next question.');}
    syncStatus='Question bank up to date';
    // Read acknowledgement IDs so a GitHub report is marked sent only after ingestion.
    if(state.reports.some(r=>r.status!=='sent')) {
      try {const response=await fetch(`https://raw.githubusercontent.com/${REPO}/main/feedback/reports.jsonl?t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(6000)});if(response.ok){const ids=new Set((await response.text()).split('\n').flatMap(line=>{try{return [JSON.parse(line).id];}catch{return [];}}));for(const report of state.reports)if(ids.has(report.id))report.status='sent';save();}}catch{}
    }
    if(manual&&!changed)toast('You have the latest questions.');
  } catch {syncStatus=navigator.onLine?'Using saved questions · sync unavailable':'Offline · saved questions ready';if(manual)toast('Could not reach GitHub. Your saved questions are ready.');}
  finally {
    syncing=false;
    if(!session && view!=='settings' && !dialog.open)render();
    else {
      const status=document.querySelector('.sync-status');if(status)status.innerHTML=`${icon('sync')} ${esc(syncStatus)}`;
      const note=document.querySelector('#bank-status');if(note)note.textContent=`${syncStatus} · bank ${bank.version}`;
    }
  }
}
const actions={start,next:nextQuestion,finish:finishPage,guessed,report:reportDialog,science:scienceDialog,install:installDialog,export:exportBackup,'close-dialog':()=>dialog.close(),sync:()=>syncBank(true),'select-all':()=>{state.settings.selectedTopics=bank.topics.map(t=>t.id);save();render();},'remove-token':()=>{localStorage.removeItem('recall-github-token');toast('Token removed.');render();},'resume-paused':()=>{state.suspended={};save();render();toast('Paused questions are back in your queue.');},'copy-prompt':async()=>{try{await navigator.clipboard.writeText('Use $recall-cs-questions to add 12 carefully checked questions about [TOPIC] to https://github.com/clemenskuske/recall-cs. Follow the content rules and review unresolved feedback first. Include one correct answer, three distractors at each of three difficulty levels, TeX where useful, sources, and explanations for every choice.');toast('Starter prompt copied. Replace [TOPIC] with what you want to learn.');}catch{toast('Ask your AI to use $recall-cs-questions to add questions on your chosen topic.');}}};
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.view){if(session){finishPage();}view=button.dataset.view;render();window.scrollTo(0,0);return;}
  if(button.dataset.topic){const selected=selectedTopics();state.settings.selectedTopics=selected.includes(button.dataset.topic)?selected.filter(t=>t!==button.dataset.topic):[...selected,button.dataset.topic];save();render();return;}
  if(button.dataset.answer){choose(button.dataset.answer);return;}
  if(button.dataset.reportSend){const report=state.reports.find(r=>r.id===button.dataset.reportSend);if(report)sendReport(report);return;}
  if(actions[button.dataset.action])actions[button.dataset.action]();
});
document.addEventListener('change',async event=>{
  const input=event.target;
  if(input.dataset.setting){const key=input.dataset.setting;const value=input.type==='checkbox'?input.checked:['minutes','newPerDay','retention'].includes(key)?Number(input.value):input.value;if(key==='newPerDay'&&(!Number.isInteger(value)||value<0||value>30)){toast('Choose a daily limit from 0 to 30.');render();return;}state.settings[key]=value;save();toast('Preferences saved. Schedule changes apply on the next review.');}
  if(input.id==='import-file'&&input.files[0]){try{if(input.files[0].size>20_000_000)throw new Error('This file is too large.');const next=validateState(JSON.parse(await input.files[0].text()));openDialog(`<h2>Restore this backup?</h2><p>This replaces the progress on this device with ${next.reviews.length} saved reviews. Your current progress will be exported first.</p><button class="primary" id="confirm-import">Export current progress and restore</button>`);document.querySelector('#confirm-import').onclick=()=>{exportBackup();state=next;save();dialog.close();render();toast('Backup restored.');};}catch(error){toast(error.message);}input.value='';}
});
document.addEventListener('submit',async event=>{
  if(event.target.id==='token-form'){event.preventDefault();localStorage.setItem('recall-github-token',document.querySelector('#github-token').value.trim());toast('Token saved on this device.');render();}
  if(event.target.id==='report-form'){
    event.preventDefault();const data=new FormData(event.target);const report=makeReport(session.question,Object.fromEntries(data),session.choices.map(a=>a.id));report.status='draft';state.reports.push(report);if(data.has('pause'))state.suspended[session.question.id]=session.question.revision;save();dialog.close();
    const target=localStorage.getItem('recall-github-token')?null:window.open('about:blank','_blank');if(target)target.opener=null;await sendReport(report,target);
  }
});
let lastTick=Date.now();setInterval(()=>{const now=Date.now();const delta=Math.min(3,(now-lastTick)/1000);lastTick=now;if(session&&!document.hidden&&!dialog.open){session.seconds+=delta;const day=dayKey();state.daily[day]||={seconds:0,answers:0,correct:0,newIds:[]};state.daily[day].seconds+=delta;const bar=document.querySelector('.session-track span');if(bar)bar.style.width=Math.min(100,session.seconds/(state.settings.minutes*60)*100)+'%';if(Math.floor(session.seconds)%10===0)save();}},1000);
document.addEventListener('visibilitychange',()=>{save();lastTick=Date.now();if(!document.hidden){syncBank();navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});}});
window.addEventListener('pagehide',save);window.addEventListener('online',()=>syncBank());
async function boot(){
  try{const cached=JSON.parse(localStorage.getItem('recall-bank'));if(isBank(cached))bank=cached;}catch{}
  if(!bank){const response=await fetch('./bank.json');bank=await response.json();if(!isBank(bank))throw new Error('Invalid question bank');}
  render();syncBank();
  if('serviceWorker' in navigator && import.meta.env.PROD)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Offline setup did not finish. Open Recall online again to retry.'));
}
boot().catch(()=>{app.innerHTML='<main class="loading"><h1>Let’s try again.</h1><p>Recall needs a connection for its first visit.</p><button onclick="location.reload()">Reload</button></main>';});
