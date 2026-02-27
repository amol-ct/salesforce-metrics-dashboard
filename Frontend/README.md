# Roadmap + Voice-of-Customer Intelligence MVP

This starter pack is designed for your 4-product annual roadmap workflow:

1. Fixed annual roadmap progress dashboard (overall + quarterly + drilldown)
2. Salesforce feature request clustering and prioritization
3. "Already shipped?" verification using release notes/product guides
4. PRD/spec generation for PM-approved items

## Included

- `templates/roadmap_items.csv` - roadmap sample schema and rows
- `templates/salesforce_feature_requests.csv` - Salesforce sample export schema and rows
- `templates/docs_manifest.csv` - documentation corpus index
- `scripts/normalize_inputs.py` - normalizes real roadmap/Salesforce files into unified datasets
- `docs/data-model.md` - normalized entities + required fields
- `docs/dashboard-metrics.md` - exact progress formulas and quarterly logic
- `docs/implementation-plan.md` - MVP build sequence, prompts, and eval approach
- `docs/wireframe.md` - dashboard wireframe and interaction model
- `docs/prd-template.md` - PRD/spec output template
- `docs/prd-templates/` - full PRD, lite PRD, and engineering handoff templates
- `docs/data-profile.md` - generated summary of ingested roadmap/Salesforce data

## Quick Start

1. Place raw exports in `data/raw/` (CSV roadmap files + Salesforce `.xls` HTML exports).
2. Run `./scripts/normalize_inputs.py`.
3. Review generated files in `data/processed/` and `docs/data-profile.md`.
4. Confirm weighting in `docs/dashboard-metrics.md` and `docs/implementation-plan.md`.
5. Build in this order:
   - Data ingestion + normalization
   - Dashboard metrics API
   - LLM clustering + ranking job
   - Shipped-detection retrieval + verification layer
   - PRD generation action

## Web Dashboard

- Dashboard files are in `dashboard/`.
- Start the API + web server from repo root:
  - `python3 api_server.py --host 127.0.0.1 --port 8000`
- Open:
  - `http://localhost:8000/dashboard/`

The page reads data via API endpoints backed by processed files.

## API Endpoints

- `GET /api/roadmap/items?product=ALL&quarter=ALL&status=ALL`
- `GET /api/roadmap/products`
- `GET /api/roadmap/statuses`
- `GET /api/roadmap/summary?product=ALL`
- `GET /api/roadmap/product-rollups`
- `GET /api/roadmap/quarterly?product=ALL`
- `GET /api/clusters?limit=50`
- `GET /api/shipped?limit=50`

## Semantic Clustering (LLM-capable)

- Default local semantic clustering (no API key):
  - `./scripts/semantic_cluster_llm.py --threshold 0.82`
- LLM + embeddings mode:
  - `export OPENAI_API_KEY=...`
  - `./scripts/semantic_cluster_llm.py --use-llm --model gpt-4.1-mini --embedding-model text-embedding-3-small --threshold 0.82`

Outputs:
- `data/processed/salesforce_semantic_clusters.csv`
- `data/processed/salesforce_semantic_assignments.csv`

## Shipped Detection with Citations

- Run shipped detection:
  - `./scripts/shipped_detection.py --top-k 3`
- LLM-assisted verdicting:
  - `export OPENAI_API_KEY=...`
  - `./scripts/shipped_detection.py --use-llm --model gpt-4.1-mini --top-k 3`

Outputs:
- `data/processed/shipped_detection_results.csv`
- `data/processed/shipped_detection_results.json`

Notes:
- If docs are unreachable, output is still generated with `POSSIBLY_SHIPPED` + verification-required reason.
- When docs are reachable, output includes snippet-based citations.

## Input Checklist (Minimum)

- Roadmap hierarchy level and parent-child relationships
- Progress source and definition (`status` vs `%` vs points)
- Quarter assignment rule (`target_quarter` vs computed from dates)
- Salesforce export with required fields
- Customer importance mapping (segment/value weights)
- Release notes + guides corpus locations
- PRD destination (Confluence/Docs/Markdown)
- Data/privacy constraints (PII masking rules)
