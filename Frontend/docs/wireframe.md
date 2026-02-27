# Dashboard Wireframe (MVP)

## Top Row
- Global filters: `Year`, `Product`, `Hierarchy`, `Status`
- KPI cards:
  - `Org-Wide Annual Progress %`
  - `Total Items`
  - `Done Items`
  - `At Risk/Blocked`

## Middle Row
- Left: `Per-Product Annual Progress` (4 bars/cards)
- Right: `Quarterly Progress Heatmap` (Products x Q1..Q4 + org summary row)

## Lower Row
- Left: `Roadmap Drilldown Tree`
  - Expand Theme/Epic/Initiative
  - Show status, progress, timeline
- Right: `Requirement Pipeline Panel`
  - Cluster count by state (`New`, `Shipped`, `Needs PM Review`, `PRD Ready`)
  - Top ranked candidate requirements

## Detail Drawer (click cluster)
- Cluster label and rank score
- Customer evidence (#customers, ticket count, value)
- Shipped detection verdict + citations
- Actions:
  - `Mark Needs Verification`
  - `Generate PRD`
  - `Add to Backlog`
