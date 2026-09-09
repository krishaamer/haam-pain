# HAAM Pain

A living opportunity-ranking system for finding problems that hurt enough to matter and are tractable enough to test.

The project now supports comparable country and city research. Toronto remains the deepest first market with 20 opportunities. The first geographic expansion adds New York, San Francisco, London, Berlin, Tallinn and Taipei with six evidence-backed opportunities each.

## Geography

Market atlas:

- `/markets/`

Country pages:

- `/canada/`
- `/united-states/`
- `/united-kingdom/`
- `/germany/`
- `/estonia/`
- `/taiwan/`

City pages:

- `/canada/toronto/`
- `/united-states/new-york/`
- `/united-states/san-francisco/`
- `/united-kingdom/london/`
- `/germany/berlin/`
- `/estonia/tallinn/`
- `/taiwan/taipei/`

Country pages only aggregate cities that have actually been researched. A city sample is never presented as nationally representative.

## Scoring model

Each opportunity receives a 0 to 5 score on eight dimensions, then a separate risk penalty and evidence-confidence adjustment. The weights stay identical across cities so scores remain comparable.

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

Formula:

```text
base = sum(dimension / 5 * weight)
score = base - risk penalty
priority = score * (0.85 + 0.03 * evidence confidence)
```

Evidence confidence is deliberately a modest adjustment. The goal is to rank hypotheses while making uncertainty visible, not to reward whichever market has the most published reports.

Founder return is tracked separately:

```text
founder return = economics * 40% + founder fit * 30% + leverage * 20% + market * 10%
```

### Founder-fit discipline

Founder fit splits two questions that are easy to conflate:

1. **Capability fit:** can HAAM research, design, prototype, automate, synthesize and ship a useful intervention?
2. **Domain credibility:** would the buyer trust HAAM in this domain today, and what expert partnerships or credentials would be required?

A recent conversation topic is not evidence of founder fit.

## Hard gates

Before ranking, an opportunity should have:

- an identifiable buyer
- ability to pay, or an identifiable sponsor who can pay
- an ethically acceptable intervention
- a legally feasible manual test
- reachable users
- an observable outcome

## What to measure inside each dimension

### Pain

Intensity, urgency, frequency, consequences, emotional load and confusion.

### Economics

Current spending, willingness to pay, value created or loss avoided, gross margin potential, repeatability and acquisition or sales efficiency.

### Founder fit

Existing competence, transferable competence, technical leverage, research edge, domain credibility, sales credibility and willingness to stay with the problem long enough to get unusually good.

### Distribution

Audience concentration, reachability, trigger detectability, trust channels, acquisition cost and word of mouth.

### Insight gap

Misdiagnosis, information asymmetry, fragmentation, bad incentives, invisible feedback, tacit expertise and newly possible solutions.

### Solution leverage

Automation potential, reusable data, marginal cost, intervention efficiency and time to outcome.

### Market quality

Buyer count, growth, structural durability, spend growth, competitive intensity and incumbent quality.

### Validation speed

Can we find sufferers now, inspect real artifacts, sell a manual solution before building software and measure whether it worked?

## Type-specific pain metrics

Different pains need different secondary measures.

- **Consumer emotional:** shame, identity threat, hope, privacy, urgency and willingness to seek help.
- **Financial:** money at risk, probability of loss, decision frequency, information asymmetry and quantifiable ROI.
- **Career:** income delta, duration of unemployment or underemployment, status impact and measurable outcome.
- **B2B:** revenue loss, cost savings, executive visibility, budget owner, switching cost and procurement difficulty.
- **Health:** severity, uncertainty, time sensitivity, fragmentation and current spend, with explicit clinical and regulatory penalties.
- **Life admin:** number of actors, deadlines, money at stake, fragmentation, catastrophic failure modes and cognitive burden.

## Risk penalties

Risk stays outside the 100-point upside score. Typical penalties include regulation or clinical liability, trust barriers, capital intensity, marketplace chicken-and-egg dynamics, platform dependence, ethical or reputational risk and very long time to outcome.

## Evidence standard

The evidence ladder is:

```text
complaint < search < existing spend < pays us < measurable result
```

Desk-research rankings are starting hypotheses. Once experiments begin, observed paid behavior should dominate the ranking.

## Research structure

- `data/index.json` + `data/opportunities-*.json`: deep Toronto dataset
- `data/markets.json`: country/city atlas and additional city opportunities
- `index.html`: Toronto dashboard
- `city.html`: shared city dashboard template
- `country.html`: shared country summary template
- `markets/index.html`: cross-city market atlas
- `app.js`: city-aware filtering, ranking, scatter plot and evidence details
- `markets.js`: country/city aggregation and cross-city leaderboards
- `styles.css` + `markets.css`: visual system
- `methodology.md`: expanded scoring reference
- `vercel.json`: semantic country and city routes
- `notes/`: durable findings that inform how opportunities are evaluated

The original leverage/productivity finding that initialized this repository is preserved at `notes/leverage-and-productivity.md`.

No build step or runtime dependency is required.
