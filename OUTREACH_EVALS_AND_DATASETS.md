# Outreach Evals And Datasets

This project should improve lead quality by turning every human review into reusable evaluation data. Do not tune the workflow from anecdotes alone. Save labeled examples, run experiments, and compare scores before changing prompts, models, or scoring rules.

## Goal

Build a dataset that answers three questions:

- Did the workflow research the company with enough source-backed evidence?
- Did the fit score match a human ICP judgment?
- Would the drafted outreach be useful enough to review or send later?

## Dataset

Create this dataset in Mastra Studio:

```txt
scaler-outreach-lead-review-v1
```

Use one dataset item per company lead, not one item per full workflow run. This keeps labels precise and makes failures easier to diagnose.

### Input Shape

Each dataset item `input` should be a single lead review packet:

```json
{
  "workflowRunId": "123",
  "company": {},
  "research": {},
  "fitScore": {},
  "decisionMaker": {},
  "draft": {},
  "draftQuality": {},
  "reviewStatus": "needs-review",
  "recommendedReviewReason": ""
}
```

### Ground Truth Shape

Each dataset item `groundTruth` should capture your human judgment:

```json
{
  "humanAccepted": true,
  "expectedTier": "A",
  "expectedScoreMin": 75,
  "expectedScoreMax": 100,
  "researchQuality": "good",
  "draftQuality": "revise",
  "researchIssues": [],
  "scoringIssues": [],
  "draftIssues": [],
  "reviewNotes": "Strong fit, but verify revenue source before prioritizing."
}
```

Allowed review values:

- `researchQuality`: `excellent`, `good`, `thin`, `bad`
- `draftQuality`: `approve`, `revise`, `reject`
- `expectedTier`: `A`, `B`, `C`, `Reject`

## Labeling Rubric

Use consistent labels. The dataset is only useful if the ground truth is stricter than the workflow.

### Accept The Lead When

- The company is a real U.S. specialty industrial B2B service company or close adjacent fit.
- Revenue or employee count appears plausibly within or near the target range.
- There are at least two useful public signals with source URLs.
- The site, positioning, CTA, case-study, trade-show, hiring, expansion, or service-line signals suggest Scaler can credibly help.
- No hard disqualifier is present.

### Reject The Lead When

- It is clearly consumer-facing, nonprofit, education, international-only, too small, or under the revenue floor.
- The workflow cannot source the company well enough.
- The company is outside specialty industrial services without a strong adjacent reason.
- The recommendation depends on guessed private data.

### Research Quality Labels

- `excellent`: multiple relevant source-backed observations, clear ICP signals, unknowns marked.
- `good`: enough evidence to review, but missing one or two useful details.
- `thin`: real company, but evidence is too shallow to trust the score.
- `bad`: wrong company, unsupported claims, missing sources, or guessed facts.

### Draft Quality Labels

- `approve`: specific, grounded, 90-140 words, one CTA, useful teardown offer.
- `revise`: direction is right but personalization, proof, tone, or CTA needs work.
- `reject`: generic, unsupported, fake familiarity, too long, wrong offer, or bad fit.

## How To Add Dataset Items In Studio

1. Run `mastra dev`.
2. Open Mastra Studio at `http://localhost:4111`.
3. Use `Studio Outreach Review Agent`.
4. Ask: `What was my last run?`
5. Ask for a specific review packet: `Show lead 3 from run 123`.
6. Go to **Datasets**.
7. Create or open `scaler-outreach-lead-review-v1`.
8. Add one item per lead:
   - Paste the lead packet into `input`.
   - Add your label into `groundTruth`.

Keep rejected leads too. Bad examples are often more useful than successful examples because they show what the workflow should learn to avoid.

## Scorers To Build

The repo already has `outreachGroundingScorer` in:

```txt
src/mastra/scorers/outreach-scorer.ts
```

Add these next:

- `researchEvidenceQualityScorer`
  - Checks source URL coverage, unknown handling, signal specificity, and disqualifier detection.
- `icpFitCalibrationScorer`
  - Compares workflow `fitScore` against `groundTruth.expectedTier` and expected score range.
- `leadQualityScorer`
  - Judges whether the accepted/rejected decision matches `groundTruth.humanAccepted`.
- `outreachDraftQualityScorer`
  - Extends the current grounding scorer with Scaler-specific positioning and teardown quality.

Prefer deterministic scoring where possible. Use an LLM judge only for fuzzy judgments like draft usefulness or whether evidence is persuasive.

## Running Experiments

Mastra datasets can run experiments against registered agents, workflows, or scorers.

For this project, start with scorer-only experiments on saved lead packets. That lets us evaluate the scorer calibration before rerunning the full research workflow.

Later, run the full workflow against fixed inputs after we add a workflow eval harness.

## Evaluating A Saved Workflow Trace In Studio

The repo now registers workflow-compatible outreach scorers:

- `outreach-discovery-quality-scorer`
- `outreach-lead-outcome-scorer`
- `outreach-bad-candidate-filter-scorer`

To use them:

1. Restart `mastra dev` after pulling/building the scorer changes.
2. Open **Observability > Traces**.
3. Select a workflow run for `industrial-lead-research-workflow`.
4. Click **Evaluate Trace**.
5. Select the outreach workflow scorers.
6. Review the score reasons in the **Scoring** tab.

For dataset-based evaluation:

1. Open **Datasets**.
2. Open `scaler-outreach-lead-review-v1`.
3. Confirm each item has `input`, `groundTruth`, and optional `expectedTrajectory`.
4. Run an experiment against `industrial-lead-research-workflow`.
5. Add the registered outreach workflow scorers.

Example Mastra API shape:

```ts
const dataset = await mastra.datasets.get({
  id: 'scaler-outreach-lead-review-v1',
});

const summary = await dataset.startExperiment({
  name: 'lead-review-baseline',
  targetType: 'scorer',
  targetId: 'lead-quality-scorer',
});
```

For workflow experiments:

```ts
const summary = await dataset.startExperiment({
  name: 'industrial-lead-workflow-v2',
  targetType: 'workflow',
  targetId: 'industrial-lead-research-workflow',
  scorers: {
    workflow: ['lead-quality-scorer'],
    steps: {
      'research-companies': ['research-evidence-quality-scorer'],
      'score-fit': ['icp-fit-calibration-scorer'],
      'draft-outreach': ['outreach-grounding-scorer']
    }
  },
  maxConcurrency: 2
});
```

## Improvement Loop

Use this loop for every workflow improvement:

1. Save 10-30 reviewed leads into the dataset.
2. Label each item with the rubric above.
3. Run a baseline experiment.
4. Identify common failure types.
5. Change only one major thing:
   - search query strategy
   - research extraction
   - ICP scoring rubric
   - draft prompt/rules
   - model
6. Run the same dataset experiment again.
7. Compare experiment scores and spot-check examples.
8. Keep the change only if it improves quality without introducing obvious regressions.

## Failure Taxonomy

Use these issue strings in `researchIssues`, `scoringIssues`, and `draftIssues` so patterns are easy to aggregate:

- `wrong-company`
- `bad-industry-fit`
- `too-small`
- `too-little-revenue`
- `international-only`
- `consumer-facing`
- `thin-sourcing`
- `unsupported-claim`
- `missed-disqualifier`
- `score-too-high`
- `score-too-low`
- `generic-draft`
- `weak-personalization`
- `multiple-ctas`
- `too-long`
- `wrong-offer`
- `fake-familiarity`

## Current Discovery Guardrails

The workflow now blocks obvious non-prospect candidates before research:

- UGC/content domains such as `quora.com`, `reddit.com`, `wikipedia.org`, and `medium.com`.
- Marketplace/listing domains such as `machinehub.com`, `machinio.com`, `ebay.com`, and `amazon.com`.
- Non-U.S. country-code domains such as `.co.za`, `.co.uk`, and `.com.au`.
- Listing/question/article pages such as `/listings/`, `for-sale`, `Used ... for Sale`, and `What are ...`.
- Freight/import/export/logistics companies that are not specialty industrial service companies.

These same patterns are hard disqualifiers in fit scoring, so bad candidates receive `tier: "Reject"` and `totalScore: 0` instead of soft rejection by threshold.

## Near-Term Build Tasks

1. Add a `saveLeadReviewToDatasetTool` to the Studio Review Agent.
2. Add the three new scorers listed above.
3. Add an `outreach-eval` script or workflow that runs experiments against `scaler-outreach-lead-review-v1`.
4. Add tests for scorer behavior using clear accept/reject fixtures.
5. Update the workflow only after the dataset shows which failure mode is most common.
