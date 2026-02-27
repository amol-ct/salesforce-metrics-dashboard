# Data Model

## 1) Core Roadmap Entities

### `roadmap_items`
- `roadmap_item_id` (string, required)
- `product` (enum/string, required) - one of 4 core products
- `hierarchy_level` (enum, required): `Theme | Epic | Initiative | Project`
- `parent_id` (string, nullable)
- `title` (string, required)
- `description` (string)
- `status` (enum, required): `Not Started | In Progress | Blocked | Done`
- `percent_complete` (0-100, nullable)
- `start_date`, `end_date` (date, nullable)
- `target_quarter` (enum, nullable): `Q1 | Q2 | Q3 | Q4`
- `owner` (string)
- `source_system` (string): `Jira | AzureDevOps | Asana | Internal`
- `source_key` (string)

### `roadmap_rollups` (materialized)
- `scope_type`: `product | org`
- `scope_key`: `<product_name>|ALL`
- `period_type`: `annual | quarter`
- `period_key`: `2026|2026-Q1|...`
- `progress_pct`
- `items_total`
- `items_done`
- `updated_at`

## 2) Salesforce Request Entities

### `feature_requests_raw`
- `request_id` (required)
- `created_date`, `last_updated`, `status`
- `title`, `description`
- `account_id`, `account_name`
- `customer_segment`
- `product`
- `priority`, `severity`
- `ticket_count`
- `active_asset_value`, `asset_currency`
- `tags`

### `feature_requests_normalized`
- `request_id`
- `normalized_text` (cleaned canonical requirement text)
- `detected_capability` (e.g., `Export`, `SSO`, `Workflow`)
- `duplicates_of` (nullable request_id)

### `requirement_clusters`
- `cluster_id`
- `cluster_label` (LLM-generated concise requirement)
- `product`
- `request_ids` (array)
- `customer_count`
- `ticket_count_total`
- `asset_value_total_usd`
- `severity_score`
- `rank_score`
- `rank_reason`
- `representative_examples` (array snippets)

## 3) Shipped Detection Entities

### `docs_corpus`
- `doc_id`, `product`, `doc_type`, `title`
- `url_or_path`
- `published_date`
- `version`

### `cluster_ship_check`
- `cluster_id`
- `decision`: `SHIPPED | POSSIBLY_SHIPPED | NOT_SHIPPED`
- `confidence` (0-1)
- `evidence` (array of citation objects)
- `verification_notes`

Citation object:
- `doc_id`
- `quote_or_snippet`
- `location_hint` (section/page/anchor)
- `published_date`

## 4) PRD Entities

### `prd_specs`
- `prd_id`
- `cluster_id`
- `status`: `DRAFT | PM_REVIEW | APPROVED`
- `problem_statement`
- `personas`
- `scope`
- `non_goals`
- `functional_requirements`
- `ux_notes`
- `acceptance_criteria`
- `dependencies`
- `rollout_plan`
- `success_metrics`
- `created_at`, `updated_at`
