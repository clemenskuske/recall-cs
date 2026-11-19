# Relations question audit

Reviewed 19 November 2026. The 30 questions in `questions/relations/` add the learner's requested topic without changing the dense-graph questions or restoring retired content. Each question has one correct answer and nine explained distractors, split into three editorial difficulty levels.

## Scope and conventions

- Relations are subsets of `A × A`. All quantified variables range over the stated domain; they may coincide. Unless a question restricts it, the domain may be empty.
- The nine individual properties are reflexivity, irreflexivity, symmetry, antisymmetry, asymmetry, transitivity, connexity, seriality, and antitransitivity. Each has a definition-to-name card and a name-to-formula card.
- Connexity compares **distinct** elements and does not require loops. Comparability for all pairs including equal elements is shown separately as a stronger condition. The convention is explicit because terminology varies.
- Antitransitivity means every two-step chain lacks its shortcut. Some sources call this “intransitivity”; this bank avoids that ambiguous term. Failure of transitivity merely requires one counterexample. In particular, a relation with no two-step chains can be both transitive and antitransitive.
- Seriality requires an outgoing neighbour for every element, allowing self-loops; it does not demand a unique neighbour or one common target.
- Non-strict partial orders are reflexive, antisymmetric, and transitive. Strict partial orders are irreflexive and transitive. Totality adds comparability of every distinct pair. Equivalence relations and preorders are covered separately.

## Sources and reasoning

The definitions were checked against [ANU's Logic Notes: Relations](https://users.cecs.anu.edu.au/~jks/LogicNotes/relations.html) and [Alexander Brandt's Discrete Structures for Computing, §2.2](https://www.csd.uwo.ca/~abrandt5/teaching/DiscreteStructures/Chapter2/relations.html). Questions use original phrasing and examples.

The comparison cards follow directly from these definitions:

- Asymmetry is equivalent to antisymmetry plus irreflexivity: distinguish equal from distinct endpoints.
- Symmetry plus antisymmetry is equivalent to being a subset of the diagonal, with no requirement to include every loop.
- Symmetric, irreflexive relations on a finite vertex set represent simple undirected adjacency. Requiring connexity would additionally force a clique; requiring antitransitivity would exclude triangles.
- Negating reflexivity produces an existential missing loop, not universal absence of loops. Reflexivity and irreflexivity coexist exactly on the empty domain.
- A violation of transitivity may repeat endpoints: a loopless two-way pair has a chain returning to its starting vertex without the required loop.

## Verification

`test/relations-content.test.mjs` independently parses the displayed first-order formulas and checks them against direct adjacency-matrix predicates on every relation on domains of size zero through three (531 relations). It tests the terminology choices, the formula choices under their stated assumptions, property combinations, and the diagonal formulations. Every wrong alternative has a concrete finite counterexample to equivalence; correct choices agree throughout these models. The empty-domain prose alternatives are separately checked.

Finite enumeration is not a proof that two arbitrary formulas agree on all structures. The correct definitions and equivalences also require the source checks and arguments above. The parser accepts only the explicit logic syntax used in these cards; it does not execute question text. The build validates all source records and TeX, while the existing tests check answer sampling, retirement, selection, learning, feedback, and offline behaviour.
