#!/usr/bin/env python3
import csv
import hashlib
import os
import re
from collections import Counter, defaultdict
from datetime import datetime
from html import unescape
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

ROADMAP_FILES = [
    RAW / "DT Roadmap FY26 (Q2 & Q3) - Roadmap (1).csv",
    RAW / "GL Stream Roadmap FY26 (Q2 & Q3) - Roadmap (2).csv",
    RAW / "IDT Tribe - Master Tracker - Roadmap Tracker (Original) (1).csv",
    RAW / "Notice Tracker __ RoadMap - Sheet1.csv",
]

ROADMAP_PRODUCT_MAP = {
    "DT Roadmap FY26 (Q2 & Q3) - Roadmap (1).csv": "DT",
    "GL Stream Roadmap FY26 (Q2 & Q3) - Roadmap (2).csv": "GL Stream",
    "IDT Tribe - Master Tracker - Roadmap Tracker (Original) (1).csv": "IDT",
    "Notice Tracker __ RoadMap - Sheet1.csv": "Notice Tracker",
}

SALESFORCE_FILES = [
    RAW / "report1772101003441.xls",
]

STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "are", "was", "were", "have",
    "has", "had", "into", "about", "please", "kindly", "need", "unable", "issue", "request",
    "module", "table", "gstr", "while", "not", "being", "showing", "shown", "data", "user",
}


def clean(value):
    if value is None:
        return ""
    text = str(value).replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def parse_number(value):
    s = clean(value)
    if not s:
        return 0.0
    s = re.sub(r"[^0-9.\-]", "", s)
    if not s or s in {"-", ".", "-."}:
        return 0.0
    try:
        return float(s)
    except ValueError:
        return 0.0


# Exact product_available_c value → display name mapping
PRODUCT_AVAILABLE_MAP = {
    "gl_stream": "GL Stream",
    "gst 2.0": "IDT",
    "gst2.0": "IDT",
    "tds": "DT",
    "notice management": "Notice Tracker",
}


def map_product_name(value):
    v = clean(value).lower()
    if not v:
        return ""
    # Exact match first (handles product_available_c values directly)
    if v in PRODUCT_AVAILABLE_MAP:
        return PRODUCT_AVAILABLE_MAP[v]
    compact = re.sub(r"[^a-z0-9]+", "", v)
    if compact in PRODUCT_AVAILABLE_MAP:
        return PRODUCT_AVAILABLE_MAP[compact]
    if compact in {"gst", "gst10", "gst20", "gst1", "gst2"}:
        return "IDT"
    if "gst" in v and "notice" in v:
        return "IDT"
    if "tds" in v or compact == "tds":
        return "DT"
    if "notice management" in v or "noticemanagement" in compact:
        return "Notice Tracker"
    if "gl stream" in v or "gl_stream" in v or "glstream" in compact:
        return "GL Stream"
    return ""


def map_status_to_progress(status):
    s = clean(status).lower()
    if s in {"done", "closed", "completed"}:
        return 100
    if s in {"in progress", "triage", "pending", "open", "to do", "todo"}:
        return 40
    if s in {"not started", "backlog"}:
        return 0
    return 25 if s else 0


def parse_quarter(text):
    s = clean(text).upper()
    m = re.search(r"Q\s*([1-4])", s)
    if m:
        return f"Q{m.group(1)}"
    month_map = {
        "JAN": "Q3", "FEB": "Q3", "MAR": "Q3",
        "APR": "Q4", "MAY": "Q4", "JUN": "Q4",
        "JUL": "Q1", "AUG": "Q1", "SEP": "Q1",
        "OCT": "Q2", "NOV": "Q2", "DEC": "Q2",
    }
    for k, q in month_map.items():
        if k in s:
            return q
    return ""


def norm_product(row, fallback, source_file):
    file_default = ROADMAP_PRODUCT_MAP.get(source_file, fallback)
    capability = clean(row.get("Capability"))
    tagged = clean(row.get("Tagged To"))
    if capability:
        return capability
    if tagged:
        return tagged
    return file_default


def account_key(name):
    base = clean(name).lower()
    if not base:
        return ""
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:10]
    return f"ACC-{digest}"


def discover_arr_salesforce_report():
    downloads = Path("/Users/aditya.jaiswal/Downloads")
    candidates = []
    for p in downloads.glob("report*.xls"):
        try:
            text = p.read_text(encoding="latin-1", errors="ignore")
        except Exception:
            continue
        if not re.search(r"Account\s*Active\s*ARR", text, re.IGNORECASE):
            continue
        rows = parse_html_xls(p)
        non_empty = 0
        for r in rows:
            v = parse_number(r.get("Account Active ARR"))
            if v > 0:
                non_empty += 1
        candidates.append((non_empty, p.stat().st_mtime, p))
    if not candidates:
        return None
    # Prefer reports with populated ARR values; tie-break by latest mtime.
    candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
    return candidates[0][2]


def normalize_roadmaps():
    rows_out = []
    source_counts = Counter()

    for file in ROADMAP_FILES:
        with file.open("r", encoding="utf-8-sig", newline="") as fh:
            reader = csv.DictReader(fh)
            for i, row in enumerate(reader, start=1):
                summary = clean(row.get("Summary") or row.get("Description"))
                title = clean(row.get("Epic/Category") or row.get("Epic/ Category") or row.get("Flow") or row.get("Theme"))
                status = clean(row.get("Status") or row.get("Current Status"))
                quarter = parse_quarter(row.get("QTR") or row.get("Revised Quarter") or row.get("Delivery Quarter") or row.get("Target Quarter"))

                roadmap_id = clean(row.get("Roadmap ID") or row.get("Sr No") or f"{file.stem}-{i}")
                product = norm_product(row, fallback=file.stem.split(" - ")[0], source_file=file.name)
                owner = clean(row.get("PM") or row.get("PM Owner") or row.get("Assignee"))
                stack_rank = clean(
                    row.get("Stack Rank")
                    or row.get("Stack Rank (Current)")
                    or row.get("Stack Rank (Sep)")
                    or row.get("Sr No")
                )
                prod_date_projected = clean(row.get("Prod Date\n(Projected)") or row.get("Prod Date (Projected)") or row.get("Revised month of Release") or row.get("Planned month of Release"))
                old_prod_date_projected = clean(row.get("Old Prod Date\n(Projected)") or row.get("Old Prod Date (Projected)"))
                customer_facing_date = clean(row.get("Customer facing Date"))

                if not title and not summary:
                    continue

                rows_out.append({
                    "roadmap_item_id": roadmap_id,
                    "product": product,
                    "hierarchy_level": "Initiative",
                    "parent_id": "",
                    "title": title or summary[:80],
                    "description": summary,
                    "status": status,
                    "percent_complete": map_status_to_progress(status),
                    "start_date": "",
                    "end_date": "",
                    "target_quarter": quarter,
                    "owner": owner,
                    "stack_rank": stack_rank,
                    "prod_date_projected": prod_date_projected,
                    "old_prod_date_projected": old_prod_date_projected,
                    "customer_facing_date": customer_facing_date,
                    "source_system": "Roadmap CSV",
                    "source_key": roadmap_id,
                    "source_file": file.name,
                    "theme": clean(row.get("Theme")),
                    "aop_goal": clean(row.get("AOP Goals until 31-Dec")),
                    "priority": clean(row.get("Priority")),
                })
                source_counts[file.name] += 1

    out_file = OUT / "roadmap_unified.csv"
    if rows_out:
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows_out[0].keys()))
            w.writeheader()
            w.writerows(rows_out)
    else:
        # Create empty CSV with expected headers if no data
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            fieldnames = [
                "roadmap_item_id", "product", "hierarchy_level", "parent_id", "title", "description",
                "status", "percent_complete", "start_date", "end_date", "target_quarter", "owner",
                "stack_rank", "prod_date_projected", "old_prod_date_projected", "customer_facing_date",
                "source_system", "source_key", "source_file", "theme", "aop_goal", "priority"
            ]
            w = csv.DictWriter(fh, fieldnames=fieldnames)
            w.writeheader()

    return rows_out, source_counts


class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_tr = False
        self.in_cell = False
        self.current = []
        self.rows = []
        self.buf = []

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.in_tr = True
            self.current = []
        elif self.in_tr and tag in {"td", "th"}:
            self.in_cell = True
            self.buf = []

    def handle_data(self, data):
        if self.in_cell:
            self.buf.append(data)

    def handle_endtag(self, tag):
        if tag in {"td", "th"} and self.in_cell:
            value = clean(unescape("".join(self.buf)))
            self.current.append(value)
            self.in_cell = False
            self.buf = []
        elif tag == "tr" and self.in_tr:
            if self.current:
                self.rows.append(self.current)
            self.in_tr = False


def parse_html_xls(path):
    """Parse Excel file (both .xls HTML format and .xlsx binary format)"""
    # Try to detect if it's a real Excel file (starts with PK for xlsx or specific bytes for xls)
    try:
        with open(path, 'rb') as f:
            magic = f.read(4)
        
        # Check if it's a real Excel file (xlsx/xls starts with PK or other binary signatures)
        if magic[:2] == b'PK' or magic[:2] == b'\xd0\xcf':  # xlsx or old xls format
            try:
                import pandas as pd
                # Select engine by magic bytes, not file extension.
                # This handles xlsx files copied/renamed to .xls (e.g. Athena exports via Apache POI).
                engine = 'openpyxl' if magic[:2] == b'PK' else 'xlrd'
                df = pd.read_excel(path, engine=engine)
                
                # Convert DataFrame to list of dicts
                data = df.to_dict('records')
                
                # Clean all keys and values — strip whitespace from column names too
                # (guards against invisible whitespace in Excel headers from Apache POI)
                cleaned_data = []
                for row in data:
                    cleaned_row = {
                        str(k).strip(): clean(str(v)) if pd.notna(v) else ""
                        for k, v in row.items()
                    }
                    cleaned_data.append(cleaned_row)
                
                return cleaned_data
            except Exception as e:
                print(f"Error parsing Excel file {path}: {e}")
                return []
        
    except Exception:
        pass
    
    # Fall back to HTML parsing for old-style HTML-based .xls files
    parser = TableParser()
    parser.feed(path.read_text(encoding="latin-1", errors="ignore"))
    if not parser.rows:
        return []
    headers = parser.rows[0]
    data = []
    for row in parser.rows[1:]:
        row = row + [""] * (len(headers) - len(row))
        data.append(dict(zip(headers, row)))
    return data


def normalize_salesforce():
    normalized = []
    files = list(SALESFORCE_FILES)
    arr_report = discover_arr_salesforce_report()
    arr_by_account = {}
    if arr_report:
        for r in parse_html_xls(arr_report):
            account_name = clean(r.get("Account Name")).lower()
            if not account_name:
                continue
            arr_val = parse_number(r.get("Account Active ARR"))
            if arr_val > arr_by_account.get(account_name, 0.0):
                arr_by_account[account_name] = arr_val

    for file in files:
        rows = parse_html_xls(file)
        for idx, r in enumerate(rows, start=1):
            # --- Core text fields ---
            # Prefer exact input headers; fall back to old Athena/SF export aliases.
            account_name = clean(r.get("Account Name") or r.get("account_name"))
            subject      = clean(r.get("Title") or r.get("subject") or r.get("Subject"))
            description  = clean(r.get("Description") or r.get("description"))

            # --- Issue types ---
            # New headers: "Issue Type 1" … "Issue Type 4"
            # Old headers: "Issue Type - 1 (New)" … "Issue Type - 4 (New)"
            issue1 = clean(r.get("Issue Type 1") or r.get("Issue Type - 1 (New)"))
            issue2 = clean(r.get("Issue Type 2") or r.get("Issue Type - 2 (New)"))
            issue3 = clean(r.get("Issue Type 3") or r.get("Issue Type - 3 (New)"))
            issue4 = clean(r.get("Issue Type 4") or r.get("Issue Type - 4 (New)"))

            # old-format-only field (tagged product bucket)
            tagged = clean(r.get("Tagged To"))

            # --- JIRA ---
            # New header: "JIRA Issue ID" (capital ID); old: "JIRA Issue Id"
            jira_issue             = clean(r.get("JIRA Issue ID") or r.get("JIRA Issue Id"))
            jira_url               = clean(r.get("JIRA URL") or r.get("Jira URL"))
            status_jira            = clean(r.get("Status (JIRA)") or r.get("Status(JIRA)"))
            status_category_jira   = clean(r.get("Status Category (JIRA)") or r.get("Status Category(JIRA)"))

            # --- Account details ---
            account_id_raw     = clean(r.get("Account ID") or r.get("account_id"))
            account_pan        = clean(r.get("Account PAN") or r.get("account_pan"))
            account_industry   = clean(r.get("Account Industry") or r.get("account_industry"))
            customer_type      = clean(r.get("Customer Type") or r.get("customer_type"))
            customer_segment   = clean(
                r.get("Customer Segment") or r.get("customer_segment__c") or r.get("segment")
            )
            account_category   = clean(r.get("Account Category") or r.get("account_category"))
            turnover           = clean(r.get("Turnover") or r.get("turnover"))

            # --- ARR / financial ---
            account_active_arr = parse_number(
                r.get("Account Active ARR")
                or r.get("account_total_arr")
                or r.get("Account Active Arr")
                or r.get("Active ARR")
                or r.get("ARR")
                or r.get("Account ARR")
                or r.get("Active Asset Value")
                or r.get("active_asset_value")
                or r.get("Active asset value")
            )
            if account_active_arr <= 0:
                account_active_arr = arr_by_account.get(account_name.lower(), 0.0)
            active_asset_value = clean(r.get("Active Asset Value") or r.get("active_asset_value"))
            asset_currency     = clean(r.get("Asset Currency") or r.get("asset_currency"))

            # --- Dates and IDs ---
            created_date    = clean(r.get("Created Date") or r.get("createddate") or r.get("Date/Time Opened"))
            last_updated    = clean(r.get("Last Updated"))
            case_number     = clean(r.get("Case Number") or r.get("casenumber") or r.get("id"))
            case_record_type = clean(r.get("Case Record Type") or r.get("case_record_type__c"))

            # --- Status / priority / severity ---
            status_raw   = clean(r.get("Status") or r.get("status"))
            priority_raw = clean(r.get("Priority") or r.get("priority"))
            severity_raw = clean(r.get("Severity"))

            # Status fallback for old-format boolean columns
            if not status_raw:
                is_open   = clean(r.get("Open")) == "1"
                is_closed = clean(r.get("Closed")) == "1"
                if is_open and not is_closed:
                    status_raw = "Open"
                elif is_closed and not is_open:
                    status_raw = "Closed"
                elif is_open and is_closed:
                    status_raw = "Closed"

            # --- Ticket count ---
            ticket_count_raw = r.get("Ticket Count") or r.get("ticket_count")
            ticket_count = max(1, int(parse_number(ticket_count_raw))) if ticket_count_raw else 1

            # --- Product ---
            # If the input already carries a mapped "Product" value, use it directly.
            # Otherwise derive from old-format product/tag fields.
            direct_product = clean(r.get("Product"))
            if direct_product:
                product = direct_product
                product_related_to = direct_product  # used for tag generation below
            else:
                product_related_to = clean(
                    r.get("products_available__c")
                    or r.get("product_available_c")
                    or r.get("Product Related To")
                )
                mapped_product = (
                    map_product_name(product_related_to)
                    or map_product_name(tagged)
                    or map_product_name(issue1)
                )
                product = mapped_product or tagged or issue1 or "Unknown"

            # --- Request ID ---
            fallback_seed = f"{account_name}|{subject}|{created_date}|{idx}"
            fallback_hash = hashlib.sha1(fallback_seed.encode("utf-8")).hexdigest()[:12]
            request_id = (
                clean(r.get("Request ID"))
                or case_number
                or jira_issue
                or f"SFH-{fallback_hash}"
            )

            # --- Tags ---
            existing_tags = clean(r.get("Tags"))
            tags = existing_tags or ";".join(
                [x for x in [product_related_to, tagged, issue1, issue2, issue3, issue4] if x]
            )

            # --- Source file ---
            source_file = clean(r.get("Source File")) or file.name

            # --- Has JIRA ---
            has_jira_raw = clean(r.get("Has JIRA"))
            has_jira = has_jira_raw if has_jira_raw in {"0", "1"} else ("1" if jira_issue else "0")

            normalized.append({
                "Request ID":              request_id,
                "Case Number":             case_number or "",
                "Created Date":            created_date,
                "Last Updated":            last_updated,
                "Status":                  status_raw,
                "Title":                   subject,
                "Description":             description,
                "Account ID":              account_id_raw or account_key(account_name),
                "Account Name":            account_name,
                "Account PAN":             account_pan or "",
                "Account Industry":        account_industry or "",
                "Customer Type":           customer_type or "",
                "Customer Segment":        customer_segment or "",
                "Account Category":        account_category or "",
                "Turnover":                turnover or "",
                "Product":                 product,
                "Priority":                priority_raw or "",
                "Severity":                severity_raw or "",
                "Ticket Count":            ticket_count,
                "Active Asset Value":      active_asset_value or "",
                "Account Active ARR":      round(account_active_arr, 2),
                "Asset Currency":          asset_currency or "",
                "Tags":                    tags,
                "Source File":             source_file,
                "Case Record Type":        case_record_type or "",
                "JIRA Issue ID":           jira_issue or "",
                "Has JIRA":                has_jira,
                "JIRA URL":                jira_url or "",
                "Status (JIRA)":           status_jira or "",
                "Status Category (JIRA)":  status_category_jira or "",
                "Issue Type 1":            issue1 or "",
                "Issue Type 2":            issue2 or "",
                "Issue Type 3":            issue3 or "",
                "Issue Type 4":            issue4 or "",
            })

    # Deduplicate cross-export rows; prefer rows with ARR and richer metadata.
    by_id = {}
    for row in normalized:
        key = row["Request ID"]
        cur = by_id.get(key)
        if cur is None:
            by_id[key] = row
            continue
        cur_arr = parse_number(cur.get("Account Active ARR"))
        new_arr = parse_number(row.get("Account Active ARR"))
        cur_fill = sum(1 for v in cur.values() if clean(v))
        new_fill = sum(1 for v in row.values() if clean(v))
        if (new_arr, new_fill) > (cur_arr, cur_fill):
            by_id[key] = row
    normalized = list(by_id.values())

    out_file = OUT / "salesforce_requests_unified.csv"
    if normalized:
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(normalized[0].keys()))
            w.writeheader()
            w.writerows(normalized)
    else:
        # Create empty CSV with expected headers if no data
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            fieldnames = [
                "Request ID", "Case Number", "Created Date", "Last Updated", "Status", "Title", "Description",
                "Account ID", "Account Name", "Account PAN", "Account Industry", "Customer Type",
                "Customer Segment", "Account Category", "Turnover", "Product", "Priority", "Severity",
                "Ticket Count", "Active Asset Value", "Account Active ARR", "Asset Currency", "Tags",
                "Source File", "Case Record Type", "JIRA Issue ID", "Has JIRA", "JIRA URL", "Status (JIRA)",
                "Status Category (JIRA)", "Issue Type 1", "Issue Type 2", "Issue Type 3", "Issue Type 4"
            ]
            w = csv.DictWriter(fh, fieldnames=fieldnames)
            w.writeheader()

    return normalized


def cluster_label(seed):
    parts = [x for x in seed if x]
    if not parts:
        return "General Requirement"
    return " | ".join(parts[:3])


def tokenize(text):
    words = re.findall(r"[a-zA-Z0-9]{3,}", clean(text).lower())
    return [w for w in words if w not in STOPWORDS]


def cluster_salesforce(rows):
    groups = defaultdict(list)

    for r in rows:
        seed = (
            clean(r.get("Product")),
            clean(r.get("Issue Type 1")),
            clean(r.get("Issue Type 2")),
            clean(r.get("Issue Type 3")),
        )
        groups[seed].append(r)

    cluster_rows = []
    max_customer = 1
    max_tickets = 1
    max_open_ratio = 1.0

    for seed, items in groups.items():
        customers = {clean(x.get("Account Name")) for x in items if clean(x.get("Account Name"))}
        ticket_count = len(items)
        open_count = sum(1 for x in items if clean(x.get("Status")).lower() in {"open", "pending"})
        open_ratio = open_count / ticket_count if ticket_count else 0.0
        max_customer = max(max_customer, len(customers))
        max_tickets = max(max_tickets, ticket_count)
        max_open_ratio = max(max_open_ratio, open_ratio)

        sample_text = " ".join([x.get("Title", "") for x in items[:5]])
        top_terms = [w for w, _ in Counter(tokenize(sample_text)).most_common(5)]

        cluster_rows.append({
            "cluster_seed": "|".join(seed),
            "cluster_label": cluster_label(seed),
            "product": seed[0] or "Unknown",
            "customer_count": len(customers),
            "ticket_count_total": ticket_count,
            "open_count": open_count,
            "open_ratio": round(open_ratio, 4),
            "top_terms": ", ".join(top_terms),
            "sample_requests": " | ".join(clean(x.get("Title")) for x in items[:3]),
            "request_ids": ", ".join(x.get("Request ID", "") for x in items[:10]),
        })

    for r in cluster_rows:
        n_customers = r["customer_count"] / max_customer
        n_tickets = r["ticket_count_total"] / max_tickets
        n_open = r["open_ratio"] / max_open_ratio if max_open_ratio else 0
        score = 0.45 * n_customers + 0.35 * n_tickets + 0.20 * n_open
        r["rank_score"] = round(score, 4)

    cluster_rows.sort(key=lambda x: x["rank_score"], reverse=True)
    for i, r in enumerate(cluster_rows, start=1):
        r["rank"] = i

    out_file = OUT / "salesforce_clusters_seed_ranked.csv"
    with out_file.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=[
            "rank", "cluster_label", "product", "customer_count", "ticket_count_total", "open_count",
            "open_ratio", "rank_score", "top_terms", "sample_requests", "request_ids", "cluster_seed"
        ])
        w.writeheader()
        w.writerows(cluster_rows)

    return cluster_rows


def roadmap_rollup(rows):
    bucket = defaultdict(list)
    for r in rows:
        product = clean(r["product"]) or "Unknown"
        q = clean(r["target_quarter"]) or "Unassigned"
        bucket[(product, "ANNUAL")].append(r)
        bucket[(product, q)].append(r)
        bucket[("ORG", "ANNUAL")].append(r)
        bucket[("ORG", q)].append(r)

    out = []
    for (product, period), items in bucket.items():
        progress = round(sum(float(x["percent_complete"]) for x in items) / max(len(items), 1), 2)
        done = sum(1 for x in items if clean(x["status"]).lower() == "done")
        out.append({
            "scope": product,
            "period": period,
            "items_total": len(items),
            "items_done": done,
            "progress_pct": progress,
        })

    out.sort(key=lambda x: (x["scope"], x["period"]))
    out_file = OUT / "roadmap_progress_rollups.csv"
    if out:
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(out[0].keys()))
            w.writeheader()
            w.writerows(out)
    else:
        # Create empty CSV with expected headers if no data
        with out_file.open("w", newline="", encoding="utf-8") as fh:
            fieldnames = ["scope", "period", "items_total", "items_done", "progress_pct"]
            w = csv.DictWriter(fh, fieldnames=fieldnames)
            w.writeheader()

    return out


def write_docs_manifest():
    rows = [
        {
            "doc_id": "DOC-CFC-RN",
            "product": "Clear Finance Cloud",
            "doc_type": "release_notes",
            "title": "Release Notes - Clear Finance Cloud",
            "url_or_path": "https://docs.cleartax.in/product-help-and-support/clear-finance-cloud/release-notes-clear-finance-cloud",
            "published_date": "",
            "version": "",
            "section_hints": "release notes, versions, fixes, features",
        },
        {
            "doc_id": "DOC-CT-HELP",
            "product": "ClearTax Products",
            "doc_type": "product_guide",
            "title": "Product Help and Support",
            "url_or_path": "https://docs.cleartax.in/product-help-and-support",
            "published_date": "",
            "version": "",
            "section_hints": "product guides, setup, how-to, modules",
        },
    ]
    out_file = OUT / "docs_manifest.csv"
    with out_file.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def write_summary(roadmap_rows, roadmap_counts, sf_rows, clusters, rollups):
    products = sorted({clean(r["product"]) for r in roadmap_rows if clean(r["product"])})
    sf_products = Counter(clean(x.get("product")) or "Unknown" for x in sf_rows)

    summary = [
        "# Input Data Summary",
        "",
        "## Roadmap Files Ingested",
    ]
    for k, v in roadmap_counts.items():
        summary.append(f"- {k}: {v} items")

    summary += [
        "",
        f"- Unified roadmap rows: {len(roadmap_rows)}",
        f"- Unique roadmap products/capabilities: {len(products)}",
        "",
        "## Salesforce Files Ingested",
        f"- Unified requests: {len(sf_rows)}",
        f"- Seed clusters generated: {len(clusters)}",
        "",
        "### Salesforce Product Tag Distribution",
    ]

    for p, c in sf_products.most_common(15):
        summary.append(f"- {p}: {c}")

    summary += [
        "",
        "## Top 10 Ranked Cluster Seeds",
    ]

    for r in clusters[:10]:
        summary.append(
            f"- #{r['rank']} [{r['product']}] {r['cluster_label']} | customers={r['customer_count']}, tickets={r['ticket_count_total']}, score={r['rank_score']}"
        )

    summary += [
        "",
        "## Roadmap Progress (ORG)",
    ]

    org = [x for x in rollups if x["scope"] == "ORG"]
    for r in sorted(org, key=lambda x: x["period"]):
        summary.append(
            f"- {r['period']}: progress={r['progress_pct']}%, done={r['items_done']}/{r['items_total']}"
        )

    missing = [
        "active_asset_value",
        "customer_segment",
        "account_id (provided directly)",
        "explicit priority/severity scale",
    ]
    summary += [
        "",
        "## Gaps To Improve Ranking Quality",
    ] + [f"- Missing/partial in source: {m}" for m in missing]

    (ROOT / "docs" / "data-profile.md").write_text("\n".join(summary) + "\n", encoding="utf-8")


def main():
    roadmap_rows, roadmap_counts = normalize_roadmaps()
    sf_rows = normalize_salesforce()
    clusters = cluster_salesforce(sf_rows)
    rollups = roadmap_rollup(roadmap_rows)
    write_docs_manifest()
    write_summary(roadmap_rows, roadmap_counts, sf_rows, clusters, rollups)
    print("Generated:")
    print("- data/processed/roadmap_unified.csv")
    print("- data/processed/roadmap_progress_rollups.csv")
    print("- data/processed/salesforce_requests_unified.csv")
    print("- data/processed/salesforce_clusters_seed_ranked.csv")
    print("- data/processed/docs_manifest.csv")
    print("- docs/data-profile.md")


if __name__ == "__main__":
    main()
