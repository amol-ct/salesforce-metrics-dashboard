# Implementation Plan (MVP -> Phase 2)

## Architecture (MVP)

- Ingestion layer
  - Read roadmap + Salesforce + docs manifest
  - Normalize fields and enforce schemas
- Processing layer
  - Dashboard aggregations
  - LLM request normalization + clustering
  - Ranking/scoring
  - Shipped-detection retrieval + verdicting
- Delivery layer
  - Dashboard UI/API
  - Cluster review queue
  - PRD generation endpoint

## Step-by-Step Build

1. Data contracts and validation
- Validate CSV/JSON headers against required schema
- Reject rows missing `request_id`, `description`, `account_id`, `product`

2. Roadmap progress service
- Compute annual and quarterly rollups per product and org
- Expose endpoints:
  - `GET /roadmap/progress?year=2026`
  - `GET /roadmap/drilldown?product=Product%20A`

3. Request clustering pipeline
- Prompt 1 (normalize): turn noisy ticket text into canonical requirement sentence
- Prompt 2 (group): assign each normalized request to cluster ID
- Post-process: dedupe near-identical clusters using embedding distance threshold

4. Ranking model
- Default weighted score:
  - `score = 0.35*norm_customer_count + 0.25*norm_ticket_count + 0.30*norm_asset_value + 0.10*norm_severity`
- Keep sortable columns and expose transparent score breakdown

5. Shipped detection
- Index release notes + guides by product/time
- For each cluster:
  - retrieve top-k relevant chunks
  - classify into `SHIPPED | POSSIBLY_SHIPPED | NOT_SHIPPED`
  - store citation snippets with doc reference

6. PM review + PRD generation
- PM actions: merge/split cluster, confirm verdict, approve requirement
- `POST /prd/generate` creates PRD draft from approved cluster + template

## Prompt Contracts

### Normalization Prompt (input)
- request title
- request description
- tags
- product

### Normalization Prompt (output JSON)
- `canonical_requirement`
- `capability`
- `is_duplicate`
- `duplicate_hint`

### Cluster Label Prompt (output JSON)
- `cluster_label` (short actionable requirement)
- `reasoning` (one paragraph)

### Shipped Verdict Prompt (output JSON)
- `decision`
- `confidence`
- `evidence` (doc_id + snippet + location)
- `verification_question` (if uncertain)

## Evaluation Plan

- Clustering quality:
  - Sample 100 requests, PM labels expected cluster
  - Track pairwise precision/recall and merge/split error rate
- Ranking quality:
  - Compare top-20 ranked vs PM-prioritized list
  - Track nDCG@20
- Shipped detection:
  - Human-validated precision for `SHIPPED`
  - False-positive rate is primary guardrail

## Phase 2 Enhancements

- Active learning from PM merge/split actions
- Confidence calibration for shipped verdicts
- Auto-link approved requirements to roadmap themes
- Full audit trail and governance reporting
