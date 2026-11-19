import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';

export const defaults = { minutes: 5, newPerDay: 8, retention: 0.9, difficulty: 'adaptive', celebrations: true, selectedTopics: null };
export const dayKey = (time = new Date()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export function freshState() {
  return { version: 1, settings: { ...defaults }, cards: {}, reviews: [], reports: [], suspended: {}, daily: {} };
}
export function readState(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem('recall-state'));
    if (!value) return freshState();
    return validateState(value);
  } catch { return freshState(); }
}
export function validateState(value) {
  if (!value || value.version !== 1 || !value.cards || Array.isArray(value.cards) || typeof value.cards !== 'object' || !Array.isArray(value.reviews) || !Array.isArray(value.reports) || !value.daily || typeof value.daily !== 'object' || !value.suspended || typeof value.suspended !== 'object') throw new Error('This is not a Recall backup.');
  const settings = { ...defaults, ...value.settings };
  if (![3,5,10,15].includes(settings.minutes) || !Number.isInteger(settings.newPerDay) || settings.newPerDay < 0 || settings.newPerDay > 30 || !Number.isFinite(settings.retention) || settings.retention < .8 || settings.retention > .97 || !['adaptive','1','2','3'].includes(settings.difficulty) || (settings.selectedTopics !== null && (!Array.isArray(settings.selectedTopics) || settings.selectedTopics.some(x => typeof x !== 'string')))) throw new Error('Invalid settings in backup.');
  for (const entry of Object.values(value.cards)) {
    const card = entry?.card;
    if (!card || !Number.isFinite(Date.parse(card.due)) || (card.last_review && !Number.isFinite(Date.parse(card.last_review))) || !['stability','difficulty','reps','lapses','state','scheduled_days','elapsed_days','learning_steps'].every(k => Number.isFinite(card[k]) && card[k] >= 0) || card.state > 3) throw new Error('Invalid review schedule in backup.');
  }
  for (const d of Object.values(value.daily)) if (!d || !Number.isFinite(d.seconds) || !Number.isFinite(d.answers) || !Number.isFinite(d.correct) || !Array.isArray(d.newIds)) throw new Error('Invalid daily history in backup.');
  return { ...value, settings };
}
export function stateFor(question, state) {
  const entry = state.cards[question.id];
  return entry?.revision === question.revision ? entry : null;
}
export function difficultyFor(question, state) {
  if (state.settings.difficulty !== 'adaptive') return Number(state.settings.difficulty);
  return Math.min(3, 1 + Math.floor((stateFor(question, state)?.mastery || 0) / 2));
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function choicesFor(question, state, random = Math.random) {
  const level = difficultyFor(question, state);
  const wrong = shuffle(question.answers.filter(a => !a.correct), random).sort((a,b) => Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level));
  return shuffle([question.answers.find(a => a.correct), ...wrong.slice(0,3)], random);
}
export function eligibleQuestions(bank, state) {
  const selected = selectedTopicIds(bank, state);
  return bank.questions.filter(q => selected.includes(q.topic) && q.status !== 'retired' && state.suspended[q.id] !== q.revision);
}
export function selectedTopicIds(bank, state) {
  if (state.settings.selectedTopics !== null) {
    const selected = state.settings.selectedTopics.filter(id => bank.topics.some(t => t.id === id));
    // Preserve intentionally selecting nothing. If all previously selected topics
    // have been retired, start with the current default instead of an empty queue.
    if (selected.length || state.settings.selectedTopics.length === 0) return selected;
  }
  const preferred = bank.topics.filter(t => t.defaultSelected === true);
  return (preferred.length ? preferred : bank.topics).map(t => t.id);
}
export function queueFor(bank, state, now = new Date(), random = Math.random) {
  const questions = eligibleQuestions(bank, state);
  const daily = state.daily[dayKey(now)];
  const newLeft = Math.max(0, state.settings.newPerDay - (daily?.newIds.length || 0));
  const due = shuffle(questions.filter(q => { const s = stateFor(q,state); return s && new Date(s.card.due) <= now; }), random);
  // Shuffle the whole unseen pool before applying the daily allowance, so every
  // eligible question can be chosen instead of just the first files in a topic.
  const unseen = shuffle(questions.filter(q => !stateFor(q,state)), random);
  // Round-robin topics so a small daily allowance still samples the whole selection.
  const interleaved = [];
  const lastNewId = daily?.newIds.at(-1);
  const lastTopic = bank.questions.find(q => q.id === lastNewId)?.topic;
  const start = (bank.topics.findIndex(t => t.id === lastTopic) + 1) % bank.topics.length;
  const orderedTopics = [...bank.topics.slice(start), ...bank.topics.slice(0,start)];
  const groups = orderedTopics.map(t => unseen.filter(q => q.topic === t.id));
  while (groups.some(g => g.length)) for (const group of groups) if (group.length) interleaved.push(group.shift());
  return { due, fresh: interleaved.slice(0,newLeft), unseen: unseen.length };
}
export function reviewQuestion(question, state, answer, guessed = false, now = new Date(), shownIds = []) {
  const previous = stateFor(question, state);
  const card = previous ? { ...previous.card, due: new Date(previous.card.due), ...(previous.card.last_review ? { last_review: new Date(previous.card.last_review) } : {}) } : createEmptyCard(now);
  const scheduler = fsrs({ request_retention: state.settings.retention, enable_fuzz: false, learning_steps: ['1m','10m'], relearning_steps: ['1m'] });
  // A lucky guess is failed retrieval even when the selected option is correct.
  const rating = answer.correct && !guessed ? Rating.Good : Rating.Again;
  const result = scheduler.next(card, now, rating);
  const today = dayKey(now);
  const mastered = rating === Rating.Good && previous?.lastMasteryDay !== today;
  state.cards[question.id] = { revision: question.revision, card: result.card, mastery: rating === Rating.Again ? Math.max(0,(previous?.mastery || 0) - 1) : (previous?.mastery || 0) + Number(mastered), lastMasteryDay: mastered ? today : previous?.lastMasteryDay };
  state.reviews.push({ questionId: question.id, revision: question.revision, answerId: answer.id, shownIds, correct: answer.correct, guessed, difficulty: difficultyFor(question, { ...state, cards: { ...state.cards, [question.id]: previous } }), at: now.toISOString(), log: result.log });
  state.daily[today] ||= { seconds: 0, answers: 0, correct: 0, newIds: [] };
  const daily = state.daily[today];
  daily.answers++;
  daily.correct += Number(answer.correct);
  if (!previous && !daily.newIds.includes(question.id)) daily.newIds.push(question.id);
  return result;
}
export function streak(state, now = new Date()) {
  const cursor = new Date(now); let count = 0;
  if (!state.daily[dayKey(cursor)]?.answers) cursor.setDate(cursor.getDate()-1);
  while (state.daily[dayKey(cursor)]?.answers) { count++; cursor.setDate(cursor.getDate()-1); }
  return count;
}
export function intervalLabel(due, now = new Date()) {
  const minutes = Math.max(1, Math.round((new Date(due) - now) / 60000));
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes/60)} hr`;
  const days = Math.round(minutes/1440);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
