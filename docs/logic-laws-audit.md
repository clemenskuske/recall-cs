# Logic laws question audit

Reviewed 19 November 2026. The learner requested commutativity and related concepts in Logic. Fourteen new revision-1 cards (`logic-15` through `logic-28`) use the existing `logic-basics` topic ID, now displayed as Logic. The 14 retired logic starter cards retain their IDs, revisions, and contents. Dense graph classes remains the default selection.

## Scope and conventions

- Commutativity, associativity, distributivity, idempotence, and absorption each have a law-to-name card and a name-to-law card. The paired cards use different connectives to exercise recognition of both forms.
- Additional cards distinguish neutral from absorbing elements, recognize De Morgan’s law, find a counterexample to commutativity of implication, and apply Boolean duality.
- Every card specifies classical propositional logic, introduces its propositional variables, and defines logical equivalence as agreement under every truth assignment. Cards using truth constants define them explicitly.
- Each card has one correct choice and three explained distractors at each of three difficulty levels. Difficulty remains an editorial judgment.
- Law-recognition questions ask for the named standard pattern. Other valid identities can be incorrect answers to that naming question; their explanations identify the law they actually express. They are not described as false equivalences.
- The neutral/absorbing card distinguishes a fixed constant from a repeated input, its complement, or an expression depending on it. An absorbing element for one connective is distinct from the absorption law relating two connectives.
- The duality card asks for the exact structural dual under the stated operation, preserving parentheses and variable positions. Equivalent results obtained by additional simplification or commutative rewrites are explicitly distinguished from that structural result.

## Sources and reasoning

The law names and schemas were checked against [Martin J. Dürst’s Aoyama Gakuin University lecture, “Laws for Logical Operations” and “The Duality Principle for Logical Operations”](https://sw.it.aoyama.ac.jp/2024/Math1/lecture4.html), and [the University of Rochester’s “Algebraic Laws for Logical Expressions”](https://www.cs.rochester.edu/users/faculty/nelson/courses/csc_173/proplogic/laws.html). The implication comparison also cites [Oscar Levin’s propositional-logic truth tables and definition of logical equivalence](https://discrete.openmathbooks.org/dmoi2/sec_propositional.html). Explanations and distractor selection are original.

Operand exchange, regrouping, and distribution are separate patterns. Both Boolean conjunction and disjunction distribute over the other, unlike the familiar arithmetic pair of addition and multiplication. Absorption follows by splitting on the repeated proposition’s truth value. Implication is not commutative: a true antecedent and false consequent make the forward implication false and its converse true. Contraposition remains valid because it negates both inputs as well as reversing their positions. Boolean duality exchanges conjunction/disjunction and true/false throughout an identity while preserving negations and variables.

## Verification

`test/logic-content.test.mjs` parses the displayed formulas using an explicit grammar, with no evaluation of executable question text. The new checks exhaust all eight assignments to the three propositional variables. They verify every identity in the law-recognition prompts and options, all ten choices in the implication comparison, and both identities in every neutral/absorbing alternative. They check the neutral/absorbing roles structurally and semantically, and compute the requested dual from the prompt’s syntax tree to distinguish it from merely equivalent formulas. Naming and explanation quality also received manual review; truth tables alone cannot validate terminology or pedagogy.

The retirement and selection checks now allow new active Logic cards while still checking all 38 original starter records remain retired and excluded from the compiled bank. The complete 33-test suite and production build pass, producing 72 active questions across three topics. The build validates the archived source records, answer tier counts, unique IDs, sources, and TeX as well.

All 14 prompts, 140 answer choices, and their explanations were rendered with the app’s renderer and styles at a 390-pixel phone width, with no horizontal overflow or TeX errors. The distributivity and duality cards were visually inspected. A browser smoke check also selected Logic in Topics, started a session, and displayed the correct-answer feedback successfully.
