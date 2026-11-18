# Recall

A small computer science practice app for iPhone, hosted on GitHub Pages. Public questions, no subscription, no runtime LLM bill, no app-store installation.

**[Open Recall](https://clemenskuske.github.io/recall-cs/)** · **[Question bank](questions)** · **[Authoring rules](docs/content-rules.md)**

## Use on iPhone

Open the app in Safari → Share → Add to Home Screen → enable Open as Web App if shown → Add. Open the installed app online once to cache the app, questions, TeX renderer, and fonts. Thereafter quizzes work offline; content updates and sending feedback require a connection. Safari and a home-screen install may have separate storage, so use Settings → Export/Import backup if switching.

Select topics, start a short daily session, choose one of four shuffled answers, and read the explanation. A correct answer gets a small celebration; an incorrect answer explains both the misconception and the right idea. If you guessed correctly, mark “I guessed” to revisit sooner. The starter bank contains 24 questions across algorithms, data structures, graph theory, and complexity, each with a correct answer and nine tiered distractors.

Settings control daily minutes, new questions per day, desired retention, distractor difficulty, and celebrations. FSRS-6 handles spaced review; progress and settings stay on the device. See [learning design and evidence](docs/learning-design.md) for the exact mapping and limitations. Export periodic backups; there is no automatic cross-device progress sync.

## Add or improve questions with an LLM

The `recall-cs-questions` skill is installed locally in `~/.codex/skills/recall-cs-questions`. Its portable source is in `skills/recall-cs-questions`. Example:

> Use $recall-cs-questions to add 12 questions about dynamic programming, with worked counterexamples and three levels of plausible wrong answers.

Or:

> Use $recall-cs-questions to review unresolved feedback, repair or retire bad questions, and derive narrowly scoped rules from confirmed mistakes.

Each topic has a folder and each question its own JSON file. `topics.json` holds names, descriptions, one of four colors (`sage`, `clay`, `lavender`, `sand`), and an icon name (`route`, `layers`, `graph`, `braces`, or `book`). Use an existing question as the schema example. Required fields: `schemaVersion: 1`, globally unique kebab-case `id`, matching `topic`, positive integer `revision`, `status` (`active`/`retired`), `prompt`, `answers`, and `sources` (title and HTTPS URL).

Each answer has a stable `id`, `text`, `correct` boolean, and `explanation`. Exactly one is correct. Incorrect answers also have `difficulty: 1|2|3`, at least three per tier. Inline math uses `$...$`; display math uses `$$...$$`. Double backslashes in JSON. Do not write raw HTML.

After editing, run `npm test` and `npm run build`, then commit source plus generated `bank.json`. A push to main validates, builds, updates the compiled bank if needed, and deploys Pages. If you only add/edit question source on GitHub, Actions generates the bank for you. The app checks the latest `bank.json` on open and foreground; raw GitHub/CDN updates can take a short time. Feedback-only changes do not rebuild the site.

## Report a bad question or answer

Tap the flag, choose the question or a particular answer, select an error type, and optionally add a note. You can pause the question until its revision changes.

Two modes keep hosting free:

1. **No token (default):** Continue to GitHub opens a prefilled issue. Sign in and submit it. A GitHub Action validates the JSON and appends one line to `feedback/reports.jsonl`. The app keeps a draft until the line is observed. This extra GitHub confirmation is necessary because GitHub Pages cannot receive authenticated writes by itself.
2. **Direct sending (optional):** Create a fine-grained GitHub token restricted to this repository with **Contents: read and write**, then save it in Settings inside the installed app. The app appends the line directly using GitHub's Contents API with duplicate prevention and bounded conflict retries. The token stays in browser storage and is sent only to GitHub; it is never published, exported, or included in reports. Remove or replace it in Settings. Do not use an account-wide token.

Reports and resolutions are append-only; [feedback conventions](feedback/README.md) explain the maintenance loop. Report text is public. No public repository write token is embedded in the app.

## Development

Node.js 22 and npm:

```sh
npm ci
npm test
npm run build
npm run dev
```

`npm run preview` serves the production build, including the service worker. Dependencies are pinned in the lockfile. Vite builds a static site with relative asset URLs for project Pages paths. Service-worker assets are generated from the actual build with a content-hashed cache name. KaTeX and its fonts are bundled. GitHub Pages publishing uses `.github/workflows/pages.yml`; feedback ingestion uses `.github/workflows/feedback.yml`.

The service worker caches the app and bundled bank. The app separately stores the latest validated remote bank. New app versions install when the page is opened or foregrounded and take effect on the next reload. No backend, database, API billing, or native developer account is needed. Public-repository Pages hosting is available on GitHub Free; GitHub's platform limits still apply.
