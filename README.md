# HAAM Pain

A living research system for finding problems that hurt enough to matter, are valuable enough to pay for, and are concrete enough to test.

The project has four connected levels:

```text
Geography -> broad opportunity -> pain episode -> paid experiment
Industry  -> broad opportunity -> pain episode -> paid experiment
                         \-> archetype -> transfer to other contexts
```

Broad scores answer **where should we look?** Pain episodes answer **who exactly is hurting, when, why, how much, and what can we test next?**

## Main surfaces

- `/timeline` - dated personal notes and project milestones tracing the thinking behind HAAM Pain
- `/markets` - countries and researched cities
- `/compare` - city comparisons
- `/canada/toronto/neighbourhoods` - Toronto neighbourhood pilot
- `/industries` - 12-industry opportunity atlas
- `/industries/compare` - industry comparison
- `/:country/:city/industries/:industry` - city x industry composite launch hypotheses
- `/episodes` - intervention-ready pain episodes
- `/episodes/:id` - actor, trigger, mechanism, economics, workflow and experiment
- `/episodes/compare` - counterfactual episode comparison
- `/archetypes` - recurring pain mechanisms across domains
- `/archetypes/:slug` - same mechanism across different contexts
- `/experiments` or `/research` - research queue ranked by information gain

## Geographic research

The current city set is Toronto, New York, San Francisco, London, Berlin, Tallinn and Taipei. Country pages aggregate only cities that have actually been researched and do not claim national representativeness.

Toronto also has a neighbourhood pilot using official social-planning neighbourhoods. Local signals require at least two evidence items and sufficient confidence; missing evidence is not scored as low pain.

## Industry research

The current industry set is:

- Architecture / AEC
- Medicine
- Construction
- Restaurants / hospitality
- Legal
- Accounting / tax
- Property management
- Education
- Logistics
- Manufacturing
- Retail
- Professional software

Industry research contains 60 direct evidence-backed opportunity hypotheses. City x industry pages are **composites**, not locally validated industry studies: 70% industry evidence plus 30% independently researched city context.

## Broad opportunity score

City opportunities use eight dimensions:

| Dimension | Weight |
| --- | ---: |
| Pain | 24 |
| Economics | 20 |
| Founder fit | 15 |
| Distribution | 11 |
| Insight gap | 10 |
| Solution leverage | 8 |
| Market quality | 6 |
| Validation speed | 6 |
| **Total upside** | **100** |

Risk stays outside the upside score so regulation, liability, trust and operational complexity remain visible.

```text
base = sum(dimension / 5 * weight)
score = base - risk penalty
priority = score * evidence adjustment
```

Industry scoring adds workflow frequency, economic leverage, failure cost, labor intensity, fragmentation, AI leverage and data availability. See `notes/industry-method.md`.

## Pain episodes

A broad opportunity becomes actionable only when it is decomposed into a pain episode.

Every episode should identify:

- actor and context
- job to be done
- detectable trigger
- real work artifacts
- surface complaint
- believed cause
- hidden mechanism
- workflow and broken handoffs
- actors, incentives and power
- time exposure and money at risk
- existing spend stack
- buyer and budget owner
- distribution tied to the trigger
- competitor coverage and workflow gaps
- narrow intervention
- first paid experiment
- success metric
- kill criterion
- evidence claims with epistemic status

Current episode data lives in `data/episodes/*.json` and is indexed by `data/episodes-index.json`.

## Claim ledger

Every material episode claim is marked as:

- `measured` - directly supported by a source or dataset
- `reported` - a credible source reports it
- `inferred` - HAAM's interpretation of observations
- `hypothesized` - deliberately awaiting a test

The UI should never make an inferred mechanism look like measured prevalence.

## Information Gain

Opportunity score asks how attractive an opportunity currently looks.

**Information Gain** asks how much the next realistic experiment could change the decision to pursue, reshape or kill it.

This creates a separate research queue. A slightly lower-scoring market may deserve immediate investigation when one afternoon with five real artifacts can resolve its biggest uncertainty.

## Artifact-first research

Prefer inspecting what actually happened over relying only on interviews.

Useful artifacts include status certificates, contracts, permit comments, RFIs, submittals, prior-authorization packets, denial letters, POS exports, invoices, schedules, work orders, prompts, AI outputs, pull requests, review traces, client request lists and email threads.

Interviews reveal beliefs. Artifacts reveal mechanisms.

## Trigger-first distribution

Every episode asks when pain becomes acute and whether that moment is detectable.

Examples include a status package arriving, parental leave ending, a contractor requesting a deposit, a hospital discharge date, an out-of-scope client request, a PA denial, a container free-time clock, or an AI-authored pull request entering review.

A detectable trigger can matter as much as market size because it makes customer acquisition precise.

## Archetypes

Current cross-domain mechanisms include:

- high-stakes document interpretation
- deadline-driven bureaucracy
- fragmented entitlement navigation
- multi-party coordination collapse
- scope and revenue leakage
- invisible operational leakage
- AI trust and governance gap
- exception overload

Archetypes are intended for transfer: if one intervention works, search for the same mechanism in another domain with better economics, distribution or founder fit.

## Experiment standard

Every intervention-ready episode ends with:

```text
Who
Trigger
Artifact
Offer
Price
Sample
Success
Kill
Timebox
```

The kill criterion is mandatory. Once paid behavior exists, it should dominate desk research.

## Evidence ladder

```text
complaint < search < observed workaround < existing spend < pays us < measurable result < repeatable result
```

## Research files

- `timeline/index.html` - accessible, static project timeline with excerpts and expandable source records
- `notes/project-timeline.md` - provenance and maintenance rules for the timeline
- `data/index.json` + `data/opportunities-*.json` - Toronto broad opportunity dataset
- `data/markets.json` - country and city research
- `data/toronto-neighbourhoods-*.json` - Toronto local signals
- `data/industries-*.json` - industry opportunities
- `data/episodes-index.json` - episode index, source links and archetypes
- `data/episodes/*.json` - intervention-ready episodes
- `notes/pain-episode-method.md` - episode methodology
- `notes/industry-method.md` - industry methodology
- `notes/leverage-and-productivity.md` - original leverage finding

No build step or runtime dependency is required.

## Task-level economic scenarios

Episode pages now include a customer-level scenario model inspired by task-based economic modeling. The model keeps the interface simple while making the assumptions underneath the value estimate explicit.

```text
effective pain coverage
= addressable workflow × intervention success × workflow adoption

recoverable annual value
= annual pain exposure proxy × effective pain coverage
```

The default scenarios are editable in `data/economic-model.json`. The UI exposes conservative, base and upside assumptions, an assumed annual price, break-even effective coverage, and a 3× customer-value hurdle. It also shows the episode workflow as the current task decomposition.

The model is explicitly a scenario, not a prediction. Per-task time allocation is not yet measured consistently, so workflow steps are treated as a qualitative/equal-weight proxy until observed task-level evidence replaces them.

See `notes/task-economic-model.md` for the full method and upgrade path.
