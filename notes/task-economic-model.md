# Task-level economic scenario model

HAAM Pain should not treat an opportunity score as the model itself. The score is a ranking aid. The economic model underneath an intervention-ready pain episode should expose a small number of understandable assumptions and show what those assumptions imply.

The public UI therefore treats outputs as **scenarios, not predictions**.

## V1 model

The first implementation is customer-level rather than TAM-level. It avoids inventing buyer counts or adoption rates for a market before those are researched.

```text
effective pain coverage
= addressable workflow
× intervention success
× workflow adoption

recoverable annual value
= annual pain exposure proxy
× effective pain coverage
```

### Addressable workflow

The share of the painful workflow that the proposed intervention could realistically touch.

### Intervention success

Among the work the intervention touches, the share where it produces a useful result rather than merely generating output.

### Workflow adoption

The share of eligible pain moments where the buyer/team actually uses the intervention. This captures practical adoption friction inside the workflow.

## Annual pain exposure proxy

Do not add every cost field together. They can overlap.

The V1 model chooses a conservative proxy:

1. If annual time exposure and a professional hourly-value range exist, calculate annual labor exposure.
2. If a modeled money-at-risk range also exists, compare it with the labor proxy.
3. Use the larger of the two as the working exposure proxy, but do not sum them.
4. If only one exists, use that one.
5. If neither exists, do not produce a monetary value result.

This is deliberately a proxy. Field research should replace it with observed task-level economics.

## Task decomposition

Pain episodes already contain workflow steps. V1 shows those steps as the task model.

Per-step time allocation is not yet measured consistently, so V1 explicitly labels task weighting as an **equal-weight proxy until measured**. We should never imply that four workflow steps each consume 25% of time simply because four steps are listed.

The next evidence upgrade is to add optional per-task fields:

```json
{
  "step": "Gather evidence",
  "frequencyPerYear": 120,
  "minutesPerOccurrence": 18,
  "professionalHourlyValue": 85,
  "failureProbability": 0.12,
  "failureCost": 400,
  "addressableShare": 0.8,
  "interventionSuccess": 0.7
}
```

Once those exist, effective coverage should be weighted by observed time/value rather than workflow-step count.

## Scenario presets

The defaults live in `data/economic-model.json`, not in prose.

Current starting scenarios:

- Conservative: 30% addressable × 45% success × 50% workflow adoption
- Base: 50% × 65% × 70%
- Upside: 70% × 80% × 85%

These are starting assumptions only. They are deliberately adjustable in the UI.

## Pricing and viability

The scenario explorer shows an assumed annual price.

If buyer willingness-to-pay contains a clear monthly or annual cadence, the model can use its midpoint as the starting annual price. If cadence is ambiguous, V1 uses 10% of the annual pain exposure proxy as an explicit value-based placeholder.

Two thresholds are shown:

```text
break-even effective coverage = annual price / annual pain exposure

3x customer-value hurdle = 3 × annual price / annual pain exposure
```

The 3x hurdle is not a law. It is a useful default for asking whether the buyer keeps enough of the created value for the intervention to feel compelling.

## What must be true

Every model should generate a plain-language sentence such as:

> At $15k/year, this needs at least 14% effective coverage to break even. A 3x customer-value hurdle needs 43%. The base case currently implies 23%.

This is more actionable than a single 87/100 score because it identifies what evidence could overturn the opportunity thesis.

## Research upgrade path

1. Desk-research scenario assumptions.
2. Real artifacts and workflow observation.
3. Per-task time/frequency measurement.
4. Paid pilot with actual intervention success.
5. Observed workflow adoption.
6. Measured value recovered.
7. Only then add market-level buyer counts and adoption scenarios.

The economic model should become more specific as evidence improves, while the default UI remains simple.
