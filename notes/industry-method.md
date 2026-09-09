# Industry opportunity research

Industry is a first-class HAAM Pain axis, separate from geography.

## Industry score

Every direct industry opportunity is scored from 0 to 5 on:

| Metric | Weight |
| --- | ---: |
| Pain | 15 |
| Workflow frequency | 8 |
| Economic leverage | 14 |
| Failure cost | 8 |
| Labor intensity | 8 |
| Fragmentation | 8 |
| AI leverage | 10 |
| Distribution | 7 |
| Data availability | 6 |
| Founder fit | 10 |
| Validation speed | 6 |
| **Total upside** | **100** |

Risk remains outside the upside score.

```text
base = sum(metric / 5 * weight)
score = base - risk penalty
priority = score * (0.86 + 0.028 * evidence confidence)
```

An industry's displayed profile score is the average priority of its current top three researched opportunities. This reduces dependence on one outlier while keeping the profile focused on actionable opportunities rather than average mediocrity.

## City × industry intersections

City-industry pages are not presented as direct local research unless local industry evidence has actually been gathered.

The initial intersection is explicitly a composite hypothesis:

```text
intersection profile =
  70% direct industry profile
  + 30% independently researched city context
```

City context is calculated from the three strongest city opportunities whose categories match the industry's declared affinity categories. If no matching category exists, the city's strongest researched opportunities are used as a fallback.

Individual industry opportunities on an intersection page are adjusted only for launch attractiveness:

```text
intersection opportunity =
  80% direct industry opportunity priority
  + 20% city context
```

The underlying industry pain claim and evidence are never rewritten as local evidence.

## Evidence states

- **Direct industry evidence:** professional association, regulator, research organization or other source directly describing the sector/workflow.
- **Direct city evidence:** city-level opportunity research already in HAAM Pain.
- **Composite:** direct industry evidence combined with independently researched city context.
- **Direct local-industry evidence:** future state requiring evidence specifically about that industry in that city. Only then should the composite badge be removed.

## Interpretation

Industry rankings are opportunity hypotheses. They are not claims about worker prevalence, professional quality, or the absolute importance of one occupation over another. High scores mean the pain is currently judged intense, frequent, economically leveraged and tractable enough to test.