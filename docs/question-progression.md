# Question progression

The learner requested harder questions that unlock after their prerequisites have been answered correctly twice. The current bank uses 20 entry questions and 52 dependent questions, across the three requested topics.

| Topic | Entry questions | Unlock later | Progression |
| --- | ---: | ---: | --- |
| Dense graph classes | 5 | 23 | Recognise notions → formal definitions → structural comparisons and characterisations |
| Relations | 9 | 21 | Recognise properties → quantified definitions → equivalence/order combinations and distinctions |
| Logic | 6 | 8 | Recognise laws → identify their formulas → compare operators and apply duality |

These are editorial learning sequences, not measured rankings of difficulty. They do not introduce new topics or alter any existing question's mathematical content.

## Authoring

A question can include:

```json
"prerequisites": [
  "relations-08-antisymmetric-definition",
  "relations-10-asymmetric-definition"
]
```

This is the prerequisite list for `relations-26-asymmetry-equivalence`. Both listed questions require two successful answers. Omit the field or use `[]` for an entry question. Every dependency must be an existing active question, and the graph must have no duplicate dependencies, self-references, or cycles. Prefer a few relevant prerequisites rather than all earlier questions. Keep multiple independent entry points. All current dependencies stay within their own topic.

The source JSON is the authoritative graph. `npm run build` validates it and publishes it in `bank.json`. The browser also validates downloaded graphs and keeps the previous cached bank if a new one is invalid. If retiring or deleting a prerequisite, update its dependents in the same change.

## Unlock rules

- Count correct answers that were not marked “I guessed”, using the prerequisite's current revision.
- Require two answers for **each** prerequisite; two answers spread over two different prerequisites do not suffice.
- Answers need not be consecutive or on separate days. Incorrect answers do not remove previously earned successes.
- Continue using normal FSRS due dates. Do not schedule artificial early repetitions to satisfy the threshold.
- Gate introduction only. A question already started at its current revision stays in its normal review schedule, even if a prerequisite is later edited or the graph changes.
- A substantive content revision restarts that question. Successes on an older prerequisite revision do not unlock unseen dependent questions. A revised dependent question must satisfy its prerequisites again.
- A prerequisite-only edit does not increment the content revision, so unchanged material retains its learning history. No question IDs, revisions, prompts, answers, explanations, or sources were changed when adding this progression.
- Derive counts from the review history already stored on the device. Existing reviews and imported backups count; no progress-data migration is needed.
- Sample randomly among unlocked questions, keeping due reviews first, topic rotation for new questions, pauses, selected topics, and the daily new-question allowance.

Topic cards show unlocked/later counts. Today and the session summary explain pending unlocks; Topics explains the rule. Difficulty of answer alternatives remains independent of question prerequisites.

## Verification

The regression tests cover one versus two successful answers, multiple prerequisites, guesses, intervening mistakes, same-day answers, revisions, previously started questions, backup restoration, normal due dates, the daily allowance, pauses, selected topics, and legacy questions without prerequisites. Shared validation rejects malformed, missing, retired, self-referential, and cyclic dependencies; a compilation test confirms invalid graphs cannot be published. A simulation starting with no progress follows the actual graph and confirms every active question can eventually unlock.

The two-answer threshold follows the learner's request. It is not a claim that two correct multiple-choice responses establish durable mastery.
