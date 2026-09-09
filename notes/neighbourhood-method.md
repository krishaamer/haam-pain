# Neighbourhood opportunity research

Neighbourhood analysis is used only when geography plausibly changes the pain.

## Local score

```text
local score =
  local pain × 30%
  + inherited economics × 25%
  + geographic concentration × 25%
  + evidence confidence × 20%
```

All inputs are 0–5 and the displayed local score is normalized to 100.

`over-index` is not the local score. It is the difference between the neighbourhood-specific pain estimate and the parent Toronto opportunity's pain score.

## Evidence gate

A local signal is rankable only when:

- it has at least two evidence items
- evidence confidence is at least 3.5/5
- the pain has a plausible geographic mechanism
- a buyer or sponsor is identifiable
- the intervention can be tested locally

Missing evidence is shown as missing evidence, never as zero pain.

## Geography

Toronto research uses the City's Social Planning Neighbourhoods v3.0 where possible. Colloquial neighbourhood names can be shown as labels, but stable City IDs are preferred for data joins.

## Interpretation

Neighbourhood scores are research hypotheses about opportunity concentration. They are not population prevalence estimates, neighbourhood rankings, or claims about neighbourhood quality.