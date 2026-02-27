#!/usr/bin/env python3
import argparse
import csv
import hashlib
import json
import math
import os
import re
import time
from collections import Counter
from pathlib import Path
from urllib import request

ROOT = Path(__file__).resolve().parents[1]
IN_FILE = ROOT / "data" / "processed" / "salesforce_requests_unified.csv"
OUT_CLUSTER = ROOT / "data" / "processed" / "salesforce_semantic_clusters.csv"
OUT_ASSIGNMENT = ROOT / "data" / "processed" / "salesforce_semantic_assignments.csv"

STOP = {
    # Generic English filler — near-zero discriminating power in any ticket
    "the", "and", "for", "that", "with", "from", "this", "please", "kindly",
    "are", "was", "were", "have", "has", "had",
    # Domain-generic words that appear in virtually every support ticket
    "issue", "request", "need", "unable", "not", "error", "getting",
    "facing", "using", "user",
    # Layout / structural words that appear in every ticket template
    "table", "below", "above", "following",
    # NOTE: "gstr", "module", "data" intentionally kept OUT of stop words —
    # they carry meaningful domain signal and TF-IDF down-weights high-frequency
    # terms automatically without us needing to hard-code them here.
}


class UnionFind:
    def __init__(self, n):
        self.p = list(range(n))

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b):
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[rb] = ra


def load_rows(path):
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def clean(text):
    return re.sub(r"\s+", " ", (text or "").strip())


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


def tokenize(text):
    words = re.findall(r"[a-zA-Z0-9]{3,}", clean(text).lower())
    return [w for w in words if w not in STOP]


def canonical_local(row):
    title = clean(row.get("Title") or row.get("title", ""))
    desc = clean(row.get("Description") or row.get("description", ""))
    issue1 = clean(row.get("Issue Type 1") or row.get("issue_type_1", ""))
    issue2 = clean(row.get("Issue Type 2") or row.get("issue_type_2", ""))
    issue3 = clean(row.get("Issue Type 3") or row.get("issue_type_3", ""))
    product = clean(row.get("Product") or row.get("product", ""))

    # Description-first: extract keywords primarily from description text
    basis = " ".join([desc[:500], title])
    kws = [w for w, _ in Counter(tokenize(basis)).most_common(6)]
    label_parts = [x for x in [product, issue1, issue2] if clean(x)]
    label = " | ".join(label_parts) if label_parts else "General Requirement"
    if kws:
        label = f"{label} - {' '.join(kws[:3])}"
    return {
        "canonical_requirement": label,
        "capability": issue1 or product or "Unknown",
        # vector_text drives similarity; description-primary for richer signal
        "vector_text": desc[:600] or title,
    }


def chargram_vector(text, n=3):
    s = re.sub(r"\s+", " ", clean(text).lower())
    grams = Counter(s[i:i+n] for i in range(max(0, len(s)-n+1)))
    norm = math.sqrt(sum(v * v for v in grams.values())) or 1.0
    return {k: v / norm for k, v in grams.items()}


def word_vector(text):
    """TF-style word-count vector (used for label/description helpers)."""
    words = tokenize(text)
    counts = Counter(words)
    norm = math.sqrt(sum(v * v for v in counts.values())) or 1.0
    return {k: v / norm for k, v in counts.items()}


def build_tfidf_vectors(rows):
    """Build L2-normalised TF-IDF sparse vectors from each ticket's description.

    Uses unigrams + bigrams so that compound concepts are matched as units:
    • "TDS certificate", "GSTR reconciliation", "late fee payment",
      "portal loading", "form 26AS" each become a single high-IDF feature.
    • Two tickets can describe the same requirement using different individual
      words but still share key bigrams — giving much higher similarity than
      unigrams alone would produce.
    • TF-IDF down-weights terms that appear in many tickets (generic noise)
      and up-weights terms that appear in only a few (specific signals).
    """
    texts = []
    for row in rows:
        desc = clean(row.get("Description", "") or row.get("description", ""))
        title = clean(row.get("Title", "") or row.get("title", ""))
        # Description is primary signal; title fills in when description is short
        texts.append((desc[:600] + " " + title).strip() or title)

    # Build token lists: unigrams + adjacent bigrams (joined with "__")
    # Bigrams are created from the already-filtered unigram list so that
    # stop-word pairs ("please__need") are never generated.
    tokenized = []
    for t in texts:
        uni = tokenize(t)
        bi = [f"{uni[k]}__{uni[k + 1]}" for k in range(len(uni) - 1)]
        tokenized.append(uni + bi)

    n = len(tokenized)

    # Document frequency: how many documents contain each token
    df: Counter = Counter()
    for toks in tokenized:
        df.update(set(toks))

    # TF-IDF with smooth IDF (avoids division by zero) + L2 normalisation
    vectors = []
    for toks in tokenized:
        tf = Counter(toks)
        total = sum(tf.values()) or 1
        vec: dict = {}
        for token, count in tf.items():
            tf_score = count / total
            # Smooth IDF: log((N+1)/(df+1)) + 1  — never zero even for df==N
            idf_score = math.log((n + 1) / (df[token] + 1)) + 1.0
            vec[token] = tf_score * idf_score
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        vectors.append({k: v / norm for k, v in vec.items()})

    return vectors


def cosine_sparse(a, b):
    if len(a) > len(b):
        a, b = b, a
    return sum(v * b.get(k, 0.0) for k, v in a.items())


def openai_request(payload, api_key):
    req = request.Request(
        url="https://api.openai.com/v1/responses",
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=json.dumps(payload).encode("utf-8"),
    )
    with request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def openai_embed(texts, api_key, model="text-embedding-3-small"):
    req = request.Request(
        url="https://api.openai.com/v1/embeddings",
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        data=json.dumps({"model": model, "input": texts}).encode("utf-8"),
    )
    with request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    vectors = [x["embedding"] for x in data.get("data", [])]
    return vectors


def llm_canonicalize(row, api_key, model="gpt-4.1-mini"):
    prompt = (
        "You normalize support/feature ticket text into a concise product requirement. "
        "Return strict JSON with keys canonical_requirement and capability."
    )
    user = {
        "title": row.get("Title") or row.get("title", ""),
        "description": row.get("Description") or row.get("description", ""),
        "product": row.get("Product") or row.get("product", ""),
        "tags": row.get("Tags") or row.get("tags", ""),
        "issue_type_1": row.get("Issue Type 1") or row.get("issue_type_1", ""),
        "issue_type_2": row.get("Issue Type 2") or row.get("issue_type_2", ""),
        "issue_type_3": row.get("Issue Type 3") or row.get("issue_type_3", ""),
    }
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "text", "text": prompt}]},
            {"role": "user", "content": [{"type": "text", "text": json.dumps(user)}]},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "normalized_requirement",
                "schema": {
                    "type": "object",
                    "properties": {
                        "canonical_requirement": {"type": "string"},
                        "capability": {"type": "string"},
                    },
                    "required": ["canonical_requirement", "capability"],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        },
    }
    data = openai_request(payload, api_key)
    text = data.get("output", [{}])[0].get("content", [{}])[0].get("text", "{}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        parsed = canonical_local(row)
    local = canonical_local(row)
    return {
        "canonical_requirement": clean(parsed.get("canonical_requirement", "")) or local["canonical_requirement"],
        "capability": clean(parsed.get("capability", "")) or local["capability"],
        "vector_text": local["vector_text"],
    }


def cosine_dense(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return dot / (na * nb)


def priority_label_local(rank_score):
    """Derive a priority label from the numeric rank score."""
    if rank_score >= 0.65:
        return "Critical"
    if rank_score >= 0.35:
        return "High"
    if rank_score >= 0.15:
        return "Medium"
    return "Low"


def llm_describe_cluster(cluster_row, sample_items, api_key, model="gpt-4.1"):
    """Use LLM to generate a human-readable cluster description and priority label."""
    prompt = (
        "You are a senior product manager analyzing customer support tickets grouped into a requirement cluster. "
        "Given the cluster metadata and a sample of ticket titles/descriptions, provide:\n"
        "1. description: A clear 2-3 sentence summary of what customers are asking for and the core pain point.\n"
        "2. priority_label: One of 'Critical', 'High', 'Medium', or 'Low' based on ARR impact, "
        "number of customers affected, and ticket volume.\n"
        "3. priority_reasoning: 1-2 sentences explaining why this priority was assigned, "
        "citing specific numbers (ARR, customers, tickets).\n"
        "Return strict JSON with keys: description, priority_label, priority_reasoning."
    )
    titles = [clean(x.get("Title", "")) for x in sample_items[:12] if clean(x.get("Title", ""))]
    descs = [clean(x.get("Description", ""))[:250] for x in sample_items[:5] if clean(x.get("Description", ""))]
    cluster_info = {
        "cluster_label": cluster_row.get("cluster_label", ""),
        "product": cluster_row.get("product", ""),
        "customer_count": cluster_row.get("customer_count", 0),
        "ticket_count_total": cluster_row.get("ticket_count_total", 0),
        "account_active_arr_total": cluster_row.get("account_active_arr_total", 0),
        "open_count": cluster_row.get("open_count", 0),
        "open_ratio": cluster_row.get("open_ratio", 0),
        "rank_score": cluster_row.get("rank_score", 0),
        "representative_examples": cluster_row.get("representative_examples", ""),
        "sample_ticket_titles": titles,
        "sample_ticket_descriptions": descs,
    }
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "text", "text": prompt}]},
            {"role": "user", "content": [{"type": "text", "text": json.dumps(cluster_info, ensure_ascii=False)}]},
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "cluster_description",
                "schema": {
                    "type": "object",
                    "properties": {
                        "description": {"type": "string"},
                        "priority_label": {"type": "string", "enum": ["Critical", "High", "Medium", "Low"]},
                        "priority_reasoning": {"type": "string"},
                    },
                    "required": ["description", "priority_label", "priority_reasoning"],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        },
    }
    data = openai_request(payload, api_key)
    text = data.get("output", [{}])[0].get("content", [{}])[0].get("text", "{}")
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {"description": "", "priority_label": priority_label_local(cluster_row.get("rank_score", 0)), "priority_reasoning": ""}
    valid_labels = {"Critical", "High", "Medium", "Low"}
    label = parsed.get("priority_label", "Medium")
    if label not in valid_labels:
        label = priority_label_local(cluster_row.get("rank_score", 0))
    return {
        "description": clean(parsed.get("description", "")),
        "priority_label": label,
        "priority_reasoning": clean(parsed.get("priority_reasoning", "")),
    }


def build_clusters(rows, vectors, threshold=0.25, max_clusters=50):
    """Cluster tickets by description similarity within product boundaries.

    Two-step strategy (no agglomerative post-merge — that was the root cause
    of mega-clusters):

    Step 1 — Description similarity
        For every pair of tickets in the same product, compute TF-IDF cosine
        similarity.  Pairs above `threshold` are candidates to merge.
        Merges are applied in *descending* similarity order (best matches
        first) so that the most clearly related tickets lock in early.
        A hard per-cluster size cap prevents any cluster from snowballing:
        once a cluster reaches max_cluster_size, it cannot absorb more
        tickets through similarity alone.

    Step 2 — Categorical anchoring
        Tickets that share Product + Issue Type 1 + Issue Type 2 are
        always kept in the same cluster — these three structured fields
        together represent a specific, named requirement area.
        A slightly looser size cap (2× Step-1 cap) applies here too, so
        a single overly-broad Issue Type cannot create a 80-ticket blob.
    """
    n = len(rows)
    uf = UnionFind(n)

    # Hard cap: no cluster may exceed this many tickets.
    # Formula: 2× target average, with a floor of 15.
    # Example: 130 rows / 50 clusters → target avg 2.6 → cap = max(15, 5) = 15
    max_cluster_size = max(15, (n * 2) // max_clusters)
    cluster_sizes: dict = {}  # uf-root → current size of that cluster

    # ── Step 1: Similarity-based grouping ─────────────────────────────────────
    # Collect all above-threshold pairs, then merge best-first.
    pairs = []
    for i in range(n):
        for j in range(i + 1, n):
            if rows[i].get("Product") != rows[j].get("Product"):
                continue
            sim = (cosine_dense(vectors[i], vectors[j])
                   if isinstance(vectors[i], list)
                   else cosine_sparse(vectors[i], vectors[j]))
            if sim >= threshold:
                pairs.append((sim, i, j))

    # Sort descending — strongest similarity locks in first, prevents drift
    pairs.sort(reverse=True)

    for sim, i, j in pairs:
        ri, rj = uf.find(i), uf.find(j)
        if ri == rj:
            continue  # already same cluster
        si = cluster_sizes.get(ri, 1)
        sj = cluster_sizes.get(rj, 1)
        if si + sj > max_cluster_size:
            continue  # hard size cap — skip this merge
        uf.union(i, j)
        cluster_sizes[uf.find(i)] = si + sj

    # ── Step 2: Categorical anchoring ─────────────────────────────────────────
    # (Product, Issue Type 1, Issue Type 2) uniquely identifies a requirement
    # area — tickets sharing all three must stay together regardless of how
    # similar their descriptions look after Step 1.
    cat_groups: dict = {}
    for i, row in enumerate(rows):
        product = clean(row.get("Product", ""))
        i1 = clean(row.get("Issue Type 1", "") or row.get("issue_type_1", ""))
        i2 = clean(row.get("Issue Type 2", "") or row.get("issue_type_2", ""))
        if product and i1:
            cat_groups.setdefault((product, i1, i2), []).append(i)

    for idxs in cat_groups.values():
        anchor = idxs[0]
        for idx in idxs[1:]:
            ra, rb = uf.find(anchor), uf.find(idx)
            if ra == rb:
                continue
            sa = cluster_sizes.get(ra, 1)
            sb = cluster_sizes.get(rb, 1)
            # Categorical merges use a 2× looser cap — specific (P, I1, I2)
            # combos should stay together even if they form slightly larger groups
            if sa + sb > max_cluster_size * 2:
                continue
            uf.union(anchor, idx)
            cluster_sizes[uf.find(anchor)] = sa + sb

    # Build and return cluster lists
    groups: dict = {}
    for idx in range(n):
        groups.setdefault(uf.find(idx), []).append(idx)
    return list(groups.values())


def cluster_label(items):
    """Concise requirement name for the roadmap.

    Format:  [Product] Issue Type 1 > Issue Type 2 — <representative ticket title (≤70 chars)>
    Example: [IDT] GSTR Filing > Late Fee — Unable to pay late fee penalty on GSTN portal
    """
    product = clean(items[0].get("Product", "")) if items else ""

    def top_val(field):
        ctr = Counter(clean(x.get(field, "")) for x in items if clean(x.get(field, "")))
        return ctr.most_common(1)[0][0] if ctr else ""

    i1 = top_val("Issue Type 1")
    i2 = top_val("Issue Type 2")

    issue_parts = [x for x in [i1, i2] if x]
    issue_str = " > ".join(issue_parts)

    # Pick the most representative ticket title (highest word-overlap with
    # combined description centroid of the cluster).
    all_desc = " ".join(
        (clean(x.get("Description", "")) or clean(x.get("Title", "")))[:400]
        for x in items
    )
    centroid = word_vector(all_desc)
    rep_title, best_score = "", -1.0
    for x in items:
        t = clean(x.get("Title", ""))
        if t:
            s = cosine_sparse(word_vector(t), centroid)
            if s > best_score:
                best_score, rep_title = s, t
    # Cap title length so the label stays readable
    if len(rep_title) > 70:
        rep_title = rep_title[:67].rstrip() + "..."

    if product and issue_str:
        base = f"[{product}] {issue_str}"
    elif product:
        base = f"[{product}]"
    elif issue_str:
        base = issue_str
    else:
        base = "General Requirement"

    return f"{base} — {rep_title}" if rep_title else base


def generate_local_description(items):
    """PM-readable impact summary for the cluster (no LLM required).

    Covers: requirement category, customer & ARR impact, open vs closed,
    key themes extracted from actual description text, and the most
    representative complaint verbatim.
    """
    n = len(items)

    # ── Customer impact ───────────────────────────────────────────────────────
    cust_ctr = Counter(
        clean(x.get("Account Name", "")) for x in items
        if clean(x.get("Account Name", ""))
    )
    n_cust = len(cust_ctr)
    top_custs = [name for name, _ in cust_ctr.most_common(5)]
    cust_list = ", ".join(top_custs)
    if n_cust > 5:
        cust_list += f" (+{n_cust - 5} more)"

    # ── ARR impact ────────────────────────────────────────────────────────────
    arr_total = sum(
        parse_number(x.get("Account Active ARR") or x.get("account_active_arr") or "0")
        for x in items
    )
    arr_str = f"₹{arr_total:,.0f}" if arr_total > 0 else "ARR not available"

    # ── Ticket status breakdown ───────────────────────────────────────────────
    open_count = sum(
        1 for x in items
        if clean(x.get("Status", "")).lower() in {"open", "pending"}
    )

    # ── Issue category hierarchy ──────────────────────────────────────────────
    def top_val(field):
        ctr = Counter(clean(x.get(field, "")) for x in items if clean(x.get(field, "")))
        return ctr.most_common(1)[0][0] if ctr else ""

    i1 = top_val("Issue Type 1")
    i2 = top_val("Issue Type 2")
    i3 = top_val("Issue Type 3")
    product = clean(items[0].get("Product", "")) if items else ""
    category = " › ".join([x for x in [i1, i2, i3] if x]) or "General Request"

    # ── Keywords from all descriptions ────────────────────────────────────────
    all_text = " ".join(
        (clean(x.get("Description", "")) or clean(x.get("Title", "")))[:400]
        for x in items
    )
    kws = [w for w, _ in Counter(tokenize(all_text)).most_common(12)]

    # ── Most representative description ───────────────────────────────────────
    centroid = word_vector(all_text)
    best_desc, best_score = "", -1.0
    for x in items:
        d = clean(x.get("Description", "")) or clean(x.get("Title", ""))
        if d:
            s = cosine_sparse(word_vector(d), centroid)
            if s > best_score:
                best_score, best_desc = s, d

    t_word = "ticket" if n == 1 else "tickets"
    c_word = "customer" if n_cust == 1 else "customers"

    lines = [
        f"Requirement area: [{product}] {category}." if product else f"Requirement area: {category}.",
        f"Impact: {n} {t_word} from {n_cust} {c_word} ({cust_list}).",
        f"ARR at risk: {arr_str}. Open tickets: {open_count}/{n}.",
        f"Key themes from customer descriptions: {', '.join(kws[:8])}.",
    ]
    if best_desc:
        excerpt = best_desc[:300].rstrip()
        if len(best_desc) > 300:
            excerpt += "..."
        lines.append(f'Most representative complaint: "{excerpt}"')

    return " ".join(lines)


def write_outputs(rows, clusters, api_key="", model="gpt-4.1"):
    cluster_rows = []
    assignment_rows = []

    max_customers = 1
    max_tickets = 1
    max_arr = 1.0
    cache = []

    for cid, idxs in enumerate(clusters, start=1):
        items = [rows[i] for i in idxs]
        customers = {clean(x.get("Account Name", "")) for x in items if clean(x.get("Account Name", ""))}
        tickets = len(items)
        jira_tickets = sum(1 for x in items if clean(x.get("jira_issue_id", "") or x.get("JIRA Issue ID", "")))
        open_count = sum(1 for x in items if clean(x.get("Status", "") or x.get("status", "")).lower() in {"open", "pending"})
        open_ratio = open_count / tickets if tickets else 0
        arr_total = sum(
            parse_number(x.get("Account Active ARR") or x.get("account_active_arr") or x.get("active_asset_value"))
            for x in items
        )

        max_customers = max(max_customers, len(customers))
        max_tickets = max(max_tickets, tickets)
        max_arr = max(max_arr, arr_total)

        # Collect unique customer names sorted by ticket count (most impacted first)
        cust_tickets = Counter()
        for x in items:
            name = clean(x.get("Account Name", ""))
            if name:
                cust_tickets[name] += 1
        customer_names_ranked = [name for name, _ in cust_tickets.most_common()]

        # Description excerpts (first 180 chars each) — more useful than raw titles
        desc_excerpts = []
        for x in items[:5]:
            d = clean(x.get("Description", "")) or clean(x.get("Title", ""))
            if d:
                desc_excerpts.append(d[:180].rstrip() + ("..." if len(d) > 180 else ""))

        row = {
            "cluster_id": f"SEM-{cid:04d}",
            "cluster_label": cluster_label(items),
            "product": clean(items[0].get("Product", "Unknown")),
            "customer_count": len(customers),
            "ticket_count_total": tickets,
            "jira_ticket_count": jira_tickets,
            "account_active_arr_total": round(arr_total, 2),
            "open_count": open_count,
            "open_ratio": round(open_ratio, 4),
            "representative_examples": " | ".join(desc_excerpts),
            "request_ids": ", ".join(clean(x.get("Request ID", "")) for x in items[:15]),
            "customer_names": " | ".join(customer_names_ranked[:20]),
            "cluster_description": generate_local_description(items),
            "priority_label": "",
            "priority_reasoning": "",
        }
        cache.append({"summary": row, "items": items})

    for block in cache:
        row = block["summary"]
        n_c = row["customer_count"] / max_customers
        n_t = row["ticket_count_total"] / max_tickets
        n_arr = row["account_active_arr_total"] / max_arr if max_arr else 0.0
        n_o = row["open_ratio"]
        score = 0.35 * n_c + 0.25 * n_t + 0.25 * n_arr + 0.15 * n_o
        row["rank_score"] = round(score, 4)
        row["priority_label"] = priority_label_local(score)
        cluster_rows.append(row)

    cluster_rows.sort(key=lambda x: x["rank_score"], reverse=True)
    for i, c in enumerate(cluster_rows, start=1):
        c["rank"] = i

    # Map sorted cluster IDs back to raw cache entries for full assignments.
    id_lookup = {(c["cluster_label"], c["product"], c["request_ids"]): c["cluster_id"] for c in cluster_rows}

    # LLM deep-think: generate description + refine priority per cluster
    if api_key:
        block_by_key = {(b["summary"]["cluster_label"], b["summary"]["product"], b["summary"]["request_ids"]): b for b in cache}
        for i, row in enumerate(cluster_rows, start=1):
            key = (row["cluster_label"], row["product"], row["request_ids"])
            block = block_by_key.get(key)
            sample_items = block["items"] if block else []
            try:
                result = llm_describe_cluster(row, sample_items, api_key=api_key, model=model)
                row["cluster_description"] = result["description"]
                row["priority_label"] = result["priority_label"]
                row["priority_reasoning"] = result["priority_reasoning"]
            except Exception as e:
                print(f"  [warn] LLM describe failed for cluster {row['cluster_id']}: {e}")
            if i % 10 == 0:
                print(f"  described {i}/{len(cluster_rows)} clusters")
                time.sleep(0.1)

    for block in cache:
        row = block["summary"]
        items = block["items"]
        cluster_id = id_lookup.get((row["cluster_label"], row["product"], row["request_ids"]))
        if not cluster_id:
            continue
        for item in items:
            rid = clean(item.get("Request ID", ""))
            if rid:
                assignment_rows.append({"request_id": rid, "cluster_id": cluster_id, "cluster_label": row["cluster_label"]})

    with OUT_CLUSTER.open("w", encoding="utf-8", newline="") as fh:
        fields = [
            "rank", "cluster_id", "cluster_label", "product",
            "customer_count", "ticket_count_total", "jira_ticket_count",
            "account_active_arr_total", "open_count", "open_ratio", "rank_score",
            "priority_label", "priority_reasoning", "cluster_description",
            "representative_examples", "customer_names", "request_ids",
        ]
        w = csv.DictWriter(fh, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(cluster_rows)

    with OUT_ASSIGNMENT.open("w", encoding="utf-8", newline="") as fh:
        fields = ["request_id", "cluster_id", "cluster_label"]
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(assignment_rows)


def main():
    parser = argparse.ArgumentParser(description="Semantic clustering for Salesforce requests")
    parser.add_argument("--threshold", type=float, default=0.25, help="TF-IDF cosine similarity threshold (0-1); lower = fewer, larger clusters")
    parser.add_argument("--max-clusters", type=int, default=50, help="Hard cap on number of clusters (agglomerative post-merge)")
    parser.add_argument("--use-llm", action="store_true", help="Use OpenAI for canonicalization and embeddings")
    parser.add_argument("--deep-think", action="store_true", help="Use LLM to generate cluster descriptions and priority labels")
    parser.add_argument("--model", default="gpt-4.1-mini")
    parser.add_argument("--describe-model", default="gpt-4.1", help="Model used for cluster description deep-thinking")
    parser.add_argument("--embedding-model", default="text-embedding-3-small")
    args = parser.parse_args()

    rows = load_rows(IN_FILE)
    api_key = os.environ.get("OPENAI_API_KEY", "") if (args.use_llm or args.deep_think) else ""

    enriched = []
    for idx, row in enumerate(rows, start=1):
        if api_key and args.use_llm:
            try:
                norm = llm_canonicalize(row, api_key=api_key, model=args.model)
            except Exception:
                norm = canonical_local(row)
        else:
            norm = canonical_local(row)

        out = dict(row)
        out.update(norm)
        enriched.append(out)

        if idx % 100 == 0:
            print(f"normalized {idx}/{len(rows)}")
            time.sleep(0.01)

    if api_key and args.use_llm:
        # OpenAI path: include product + description + canonical for richer embedding
        texts = [
            f"{x.get('Product', '')} | {x.get('vector_text') or x.get('Description', '')[:300]} | {x['canonical_requirement']}"
            for x in enriched
        ]
        try:
            vectors = openai_embed(texts, api_key=api_key, model=args.embedding_model)
        except Exception:
            # Fallback to TF-IDF if OpenAI embedding fails
            vectors = build_tfidf_vectors(enriched)
    else:
        # Local path: TF-IDF on description text — weights rare specific terms
        # (GSTR-2B, TDS deduction, reconciliation) high and ignores boilerplate
        vectors = build_tfidf_vectors(enriched)

    clusters = build_clusters(enriched, vectors=vectors, threshold=args.threshold, max_clusters=args.max_clusters)

    # Use deep-think API key only when --deep-think flag is set
    describe_key = api_key if args.deep_think else ""
    write_outputs(enriched, clusters, api_key=describe_key, model=args.describe_model)

    print(f"Wrote {OUT_CLUSTER}")
    print(f"Wrote {OUT_ASSIGNMENT}")
    print(f"clusters={len(clusters)}, requests={len(enriched)}")


if __name__ == "__main__":
    main()
