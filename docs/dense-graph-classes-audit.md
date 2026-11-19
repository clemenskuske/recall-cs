# Dense graph classes: authoring audit

Reviewed 18 November 2026. The 28 questions in `questions/dense-graph-classes/` replace the retired 38-question starter curriculum. Each has one correct answer and nine independently explained alternatives. The three distractor levels are editorial judgements, not calibrated difficulty measurements.

## Scope and conventions

- Finite simple undirected graphs; bounds on classes are uniform over their members. Empty graphs do not affect the class boundedness statements. The single-graph contraction formula explicitly assumes a nonempty graph.
- FO means first-order logic. The basic transduction questions use one-dimensional, non-copying interpretations after arbitrary finitely many unary expansions, with a domain formula and symmetric, irreflexive edge formula. One expansion supplies the entire output. Formulas are evaluated in the input expansion, before deleting unwanted vertices. A separate card explains the fixed-copy convention, including tags and correspondence. Quotient and tuple-domain interpretations are not silently included.
- A tree-model has equally deep leaves, one colour per leaf, and adjacency determined by a symmetric signature on colours and half the leaf-to-leaf distance. Height and colour count are both uniform across a class; tree size is not bounded.
- Merge sequences use Dreier–Toruńczyk's Definition 3.1: coarsening partitions, increasing resolved-pair sets, and homogeneity of unresolved pairs, including within a part. Width is measured on `(P_{i-1}, R_i)`, with the intentional index offset. The ball lies in the graph of resolved original vertex pairs, which can be edges or non-edges.
- Bounded merge-width quantifies over each fixed finite radius. Almost bounded merge-width permits subpolynomial growth at each radius. Radius-infinity merge-width is treated separately.

## Source map

| Cards | Claims checked | Primary source passages |
| --- | --- | --- |
| 01–04 | Transductions, domain/edge formulas, uniformity, copying | [Ghasemi et al., CSL 2026, §2](https://drops.dagstuhl.de/storage/00lipics/lipics-vol363-csl2026/html/LIPIcs.CSL.2026.41/LIPIcs.CSL.2026.41.html); [Twin-width I, §2.2](https://arxiv.org/html/2004.14789v3) |
| 05–07, 27 | Monadic dependence, composition, stability vs dependence | CSL 2026 §2; [Dreier et al., November 2026, introduction](https://arxiv.org/html/2611.06804v1) |
| 08–10, 22, 28 | Red-degree definition and update rule, clique-width implication, grid separation, complement invariance | Twin-width I §§3–4, especially §4.2, Theorems 3–4 |
| 11–15, 21, 26 | Clique-width operations, tree-models, uniform bounds, paths, interpretation characterisation | [Ganian et al., Shrub-depth, §§2.1, 3.1, 3.3, Theorem 10](https://arxiv.org/html/1707.00359v4) |
| 16–20, 23–24 | Merge sequences, finite radii, bounded/almost bounded, subcubic separation, infinity-radius equivalence | [Merge-width and First-Order Model Checking, June 2026 version, Definitions 3.1–3.2, §7.1–7.4](https://arxiv.org/html/2502.18065v2) |
| 25 | Hereditary-class equivalence of monadic dependence and almost bounded merge-width | November 2026 Theorem 1.1, combined with June 2026 Corollary 7.14 |
| 14, 24 (distractors) | Cographs have unbounded linear clique-width | [Brignall–Korpelainen–Vatter, introduction](https://arxiv.org/abs/1305.0636) |

The November statement is explicitly labelled as a **4 November 2026 preprint** in the question. Its dependence-to-width direction applies without heredity; the question retains heredity for the converse supplied by the earlier paper. It does not replace “almost bounded” by “bounded”, claim one bound uniform over every radius, or assert that every possible decomposition is good. The June paper's corresponding conjecture must not be copied into a current question as still open.

## Independent checks and counterexamples

The answers were read against the above definitions and theorem statements. The explanations identify each wrong alternative's altered condition or a separating example. Additional checks:

- For transductions, composing two fixed recipes still gives fixed formulas and finitely many unary parameters. This proves downward preservation of monadic dependence under transducibility. Swapping the quantifiers in dependence is not harmless: large cliques can produce any one prescribed finite graph using separately chosen colours and a formula tailored to that graph, while no single recipe produces all finite graphs from cliques.
- In the red-edge rule, enumerate all 256 adjacency patterns between two two-vertex parts and a third two-vertex part. This realises all nine pairs of input statuses and checks the explicit mappings in the displayed alternatives. Complementing a pair switches complete and empty but preserves mixedness, which proves the same partition sequence has the same red graph in a graph and its complement.
- A three-label half-graph construction adds `a_j` to the accumulated A-label, creates `b_j` with a fresh temporary label, joins A to that label, and relabels `b_j` to the finished-B label. It creates exactly the pairs `a_i b_j` with `i <= j`. This is checked for sizes 1 through 12. Bounded clique-width implies dependence; identity transduction witnesses failure of monadic stability for the half-graph class.
- For the path separation card, every distractor admits an explicit height-one or height-two model: group leaves by component or multipartite part; use at most two colours. The signatures for all nine alternatives are evaluated independently on finite representatives. The unbounded-shrubdepth claim for all paths uses the cited theorem, not these finite checks.
- Cographs have clique-width at most two and unbounded linear clique-width. Since bounded shrubdepth implies bounded linear clique-width, they have unbounded shrubdepth. Their cotrees can be padded so join and union nodes occupy alternating depth parities, giving one-colour tree-models of unbounded height. This explains why a uniform colour bound alone does not suffice.
- Square grids separate bounded twin-width from bounded clique-width, even under bipartiteness, planarity, and maximum degree four. The class of all subcubic graphs separates bounded merge-width from bounded twin-width and is already hereditary. For degree at most `d`, the two-stage merge sequence resolving `E(G)` has radius-r width at most `1+d+...+d^r`.
- To see the merge-width index issue directly, take `P_1` to be singletons, `P_2={V}`, `R_1` empty, and `R_2` all unordered vertex pairs. This is a valid sequence even for an edgeless graph. At positive radius, counting parts of `P_1` through `R_2` yields `|V|`, whereas using `P_2` or `R_1` yields one. Resolved exceptions are allowed even when unnecessary; a bad sequence must not be confused with the minimum graph parameter.

## Verification limits

A precision review on 19 November 2026 revised 23 cards without changing their answer keys. Prompts and choices now introduce previously implicit graph symbols, vertex domains, label and signature coordinates, positive integer radii, positive real bounds, and finite sequence index ranges. The merge-width formula assumes a nonempty vertex set and at least two stages, so its maxima are defined. Transduction domain comprehensions explicitly range over the input vertices, and each alternative supplies its own construction rather than referring to a separately displayed answer. Unnecessary indexed path/clique notation was replaced with the class names. These are scope and notation repairs; the source-based theorem qualifications above remain applicable.

All 23 revised prompts and their 230 alternatives were rendered at a 390-pixel phone width with the app's renderer and styles: no TeX errors or horizontal overflow. The merge-width formula card was also visually inspected. The full 29-test suite and production build pass.

`npm test` checks the sample constructions, red-status alternatives, source validation, retirement behaviour, topic migration, scheduler behaviour, and existing feedback/offline invariants. `npm run build` validates every active and retired source record, including all TeX, and emits only the active curriculum. The phone preview renders all 28 prompts and 280 alternatives with the app's renderer and styles.

These checks do not formally verify the research papers or establish an infinite-class theorem by finite examples. The structural implications and separations rely on the cited primary results. No claim is made that the new preprint has completed peer review.
