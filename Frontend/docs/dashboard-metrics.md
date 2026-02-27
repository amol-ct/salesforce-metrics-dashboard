# Dashboard Metrics Rules

## Progress Precedence

Use exactly one method globally, in this order of precedence:

1. `percent_complete` field if populated
2. status mapping if `%` missing
3. story points done/total (optional alternate mode)

Status mapping default:
- `Not Started = 0`
- `In Progress = 50`
- `Blocked = 35`
- `Done = 100`

## Item Weighting

Default weighting (MVP):
- Each roadmap item weight = `1`

Optional mode:
- Weighted by effort field (story points, t-shirt size mapping)

## Annual Progress

For any scope `S` (product or org):

`progress_annual(S) = sum(item_progress_i * weight_i) / sum(weight_i)`

Where `S` contains all items in the annual roadmap for that scope.

## Quarterly Progress

Quarter assignment:
- If `target_quarter` exists, use it
- Else derive from `end_date`

Per-quarter formula:

`progress_quarter(S,Q) = sum(item_progress_i * weight_i for items in Q) / sum(weight_i for items in Q)`

## Combined Org Progress

`org_annual = weighted average of all items across 4 products`
`org_quarter(Q) = weighted average of quarter-assigned items across 4 products`

## Drilldown Rules

Drill hierarchy:
- Product -> Theme/Epic/Initiative -> Item details

Each node shows:
- title
- status
- progress
- timeline (`start_date`/`end_date`)
- owner
- source system link

## Refresh SLAs

- Daily scheduled refresh (recommended MVP)
- Optional near-real-time sync for roadmap status systems
