# Recall

A small computer science practice app for iPhone, hosted on GitHub Pages. Public questions, no subscription, no runtime LLM bill, no app-store installation.

**[Open Recall](https://clemenskuske.github.io/recall-cs/)** · **[Question bank](questions)** · **[Authoring rules](docs/content-rules.md)**

## Use on iPhone

Open the app in Safari → Share → Add to Home Screen → enable Open as Web App if shown → Add. Open the installed app online once to cache the app, questions, TeX renderer, and fonts. Thereafter quizzes work offline; content updates and sending feedback require a connection. Safari and a home-screen install may have separate storage, so use Settings → Export/Import backup if switching.

Dense graph classes is selected by default: 28 advanced questions cover first-order transductions, monadic dependence, merge-width, twin-width, clique-width, shrubdepth, and their relationships. Questions include terminology recognition and definitions in both directions. Each has one correct answer and nine explained, tiered distractors. The original 38 starter questions were retired at the learner’s request as too elementary; their source records and feedback remain in Git but are excluded from the downloaded bank. A selection containing only retired topics falls back to the current default; explicitly selecting no topics is respected.

The set states its conventions (including copying versus non-copying FO transductions) and distinguishes bounded from almost bounded merge-width. The recent dependence/merge-width equivalence is labelled with its November 2026 preprint source and the hereditary-class hypothesis. See [the content audit](docs/dense-graph-classes-audit.md) for sources, conventions, and verification limits.

Relations is a second, selectable topic with 30 questions: reflexivity, irreflexivity, symmetry, antisymmetry, asymmetry, transitivity, antitransitivity, seriality, and connexity, plus equivalence relations, preorders, and partial/total orders. Definitions run in both directions, followed by distinctions and combinations such as symmetric, irreflexive graph adjacency. Connexity compares distinct elements; antitransitivity forbids every two-step shortcut, rather than merely failing transitivity. See [the relations audit](docs/relations-audit.md).

Logic adds 14 questions on commutativity, associativity, distributivity, idempotence, absorption, neutral versus absorbing elements, De Morgan’s laws, implication’s failure of commutativity, and Boolean duality. The five central laws have both name-to-law and law-to-name cards. Logic keeps the existing `logic-basics` topic ID; all 14 original logic starter cards remain retired. Select Logic in Topics to include the new cards. See [the logic audit](docs/logic-laws-audit.md). There are 72 active questions across the three topics.

Start a short daily session, choose one of four shuffled answers, and read the explanation. A correct answer gets a small celebration; an incorrect answer explains both the misconception and the right idea. If you guessed correctly, mark “I guessed” to revisit sooner.

Questions are randomized too: due reviews are shuffled, and new questions are sampled from the full unseen pool within each selected topic. New questions rotate across topics, with due reviews first and the daily new-question limit respected.

Settings control daily minutes, new questions per day, desired retention, distractor difficulty, and celebrations. FSRS-6 handles spaced review; progress and settings stay on the device. See [learning design and evidence](docs/learning-design.md) for the exact mapping and limitations. Export periodic backups; there is no automatic cross-device progress sync.

## Add or improve questions with an LLM

The `recall-cs-questions` skill is installed locally in `~/.codex/skills/recall-cs-questions`. Its portable source is in `skills/recall-cs-questions`. Create new questions only when the learner explicitly supplies a topic. Their preference is advanced content, especially names, mathematical definitions in both directions, and relationships. Example:

> Use $recall-cs-questions to add questions about dense graph classes, testing definitions in both directions and the relationships between the width notions.

Or:

> Use $recall-cs-questions to review unresolved feedback, repair or retire bad questions, and derive narrowly scoped rules from confirmed mistakes.

Each topic has a folder and each question its own JSON file. `topics.json` holds names, descriptions, one of four colors (`sage`, `clay`, `lavender`, `sand`), an icon name (`route`, `layers`, `graph`, `braces`, or `book`), and optional `defaultSelected`. Default selection applies to people who have not explicitly chosen topics, or whose entire nonempty selection was retired; valid explicit choices are preserved. The build validates every source question, then publishes only active questions and topics with active questions. Use an existing question as the schema example. Required fields: `schemaVersion: 1`, globally unique kebab-case `id`, matching `topic`, positive integer `revision`, `status` (`active`/`retired`), `prompt`, `answers`, and `sources` (title and HTTPS URL).

Each answer has a stable `id`, `text`, `correct` boolean, and `explanation`. Exactly one is correct. Incorrect answers also have `difficulty: 1|2|3`, at least three per tier. Inline math uses `$...$`; display math uses `$$...$$`. Double backslashes in JSON. Do not write raw HTML.

After editing, run `npm test` and `npm run build`, then commit source plus generated `bank.json`. A push to main validates, builds, updates the compiled bank if needed, and deploys Pages. If you only add/edit question source on GitHub, Actions generates the bank for you. The app checks the latest `bank.json` on open and foreground; raw GitHub/CDN updates can take a short time. Feedback-only changes do not rebuild the site.

## Report a bad question or answer

Tap the flag, choose the question or a particular answer, select an error type, and optionally add a note. You can pause the question until its revision changes.

Two modes keep hosting free:

1. **Direct sending (preferred):** In the installed iPhone app, open Settings → Direct reports. Follow the token creation link, choose **Only select repositories → recall-cs**, confirm **Contents: read and write**, generate the token, then paste it into Recall. The link preselects the owner and permission but you must select the repository yourself. It suggests a one-year expiration; replace the token in Settings when it expires. The app appends a line directly using GitHub's Contents API with duplicate prevention and bounded conflict retries. The token stays in browser storage and is sent only to GitHub; it is never published, exported, or included in reports. Do not use an account-wide token or paste it into chat.
2. **No-token fallback:** A report is first saved on the device. The setup dialog offers “Submit through GitHub instead”, which opens a prefilled issue. Sign in and submit it; a GitHub Action appends it to `feedback/reports.jsonl`. This fallback is always available without connecting a token.

You can start learning before token setup. Reports made before connecting stay as drafts; saving a token from a report's setup dialog immediately sends that report. Settings lists any remaining drafts for retry. A failed send preserves the draft. Opening a GitHub form alone does not mark a report as sent.

Reports and resolutions are append-only; [feedback conventions](feedback/README.md) explain the maintenance loop. Report text is public. No public repository write token is embedded in the app.

## Development

Node.js 22 and npm:

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm run preview` serves the production build, including the service worker and live bank sync. `npm run dev` uses the generated local bank without replacing it with published content. Run `npm run build` after changing questions to refresh that bank. Dependencies are pinned in the lockfile. Vite builds a static site with relative asset URLs for project Pages paths. Service-worker assets are generated from the actual build with a content-hashed cache name. KaTeX and its fonts are bundled. GitHub Pages publishing uses `.github/workflows/pages.yml`; feedback ingestion uses `.github/workflows/feedback.yml`.

The service worker caches the app and bundled bank. The app separately stores the latest validated remote bank. New app versions install when the page is opened or foregrounded and take effect on the next reload. No backend, database, API billing, or native developer account is needed. Public-repository Pages hosting is available on GitHub Free; GitHub's platform limits still apply.
