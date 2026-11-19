export const prerequisiteCorrectAnswers = 2;

// Shared by the authoring build and the browser's downloaded-bank check.
export function validatePrerequisites(questions) {
  const byId = new Map(questions.map(q => [q.id,q]));
  for (const q of questions) {
    const prerequisites = q.prerequisites ?? [];
    if (q.prerequisites === null || !Array.isArray(prerequisites) || prerequisites.some(id => typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) || new Set(prerequisites).size !== prerequisites.length) throw new Error(`${q.id}: prerequisites must be unique question IDs`);
    for (const id of prerequisites) {
      if (id === q.id) throw new Error(`${q.id}: a question cannot require itself`);
      const parent = byId.get(id);
      if (!parent) throw new Error(`${q.id}: missing prerequisite ${id}`);
      if (q.status === 'active' && parent.status !== 'active') throw new Error(`${q.id}: prerequisite ${id} is retired`);
    }
  }
  const visiting = new Set(), done = new Set();
  function visit(q) {
    if (visiting.has(q.id)) throw new Error(`${q.id}: prerequisite cycle`);
    if (done.has(q.id)) return;
    visiting.add(q.id);
    for (const id of q.prerequisites ?? []) visit(byId.get(id));
    visiting.delete(q.id);done.add(q.id);
  }
  for (const q of questions) visit(q);
}

export function successfulReviewCounts(bank, state) {
  const revisions = new Map(bank.questions.map(q => [q.id,q.revision])), counts = new Map();
  for (const r of state.reviews) {
    if (r && revisions.has(r.questionId) && r.revision === revisions.get(r.questionId) && r.correct === true && !r.guessed) counts.set(r.questionId,(counts.get(r.questionId) || 0)+1);
  }
  return counts;
}

export function questionUnlocked(question, bank, state, counts = successfulReviewCounts(bank,state)) {
  // Prerequisites gate introduction, not the review of already-started material.
  if (state.cards[question.id]?.revision === question.revision) return true;
  return (question.prerequisites ?? []).every(id => bank.questions.some(q => q.id === id && q.status === 'active') && (counts.get(id) || 0) >= prerequisiteCorrectAnswers);
}
