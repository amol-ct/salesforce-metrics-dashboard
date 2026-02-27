#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import time
from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib import request
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
DOC_MANIFEST = ROOT / "data" / "processed" / "docs_manifest.csv"
CLUSTERS = ROOT / "data" / "processed" / "salesforce_semantic_clusters.csv"
FALLBACK_CLUSTERS = ROOT / "data" / "processed" / "salesforce_clusters_seed_ranked.csv"
OUT_CSV = ROOT / "data" / "processed" / "shipped_detection_results.csv"
OUT_JSON = ROOT / "data" / "processed" / "shipped_detection_results.json"
CACHE_DIR = ROOT / "data" / "processed" / "doc_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

STOP = {
    "the", "and", "for", "that", "with", "from", "this", "please", "kindly", "issue", "request", "need",
    "unable", "not", "are", "was", "were", "have", "has", "had", "module", "data", "table", "gstr",
    "into", "your", "their", "what", "when", "where", "how", "via", "support", "feature",
}


class HtmlToText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.skip = True
        if tag in {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"}:
            self.skip = False
        if tag in {"p", "div", "li", "h1", "h2", "h3", "h4", "h5"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

    def get_text(self):
        text = unescape("".join(self.parts))
        return re.sub(r"\s+", " ", text).strip()


class HtmlSectionParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = False
        self.in_heading = False
        self.heading_id = ""
        self.heading_buf = []
        self.sections = []
        self.current = None

    def _flush_current(self):
        if not self.current:
            return
        self.current["text"] = clean("".join(self.current.get("text_parts", [])))
        self.current.pop("text_parts", None)
        if self.current["title"] or self.current["text"]:
            self.sections.append(self.current)
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.skip = True
            return
        if self.skip:
            return
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._flush_current()
            self.in_heading = True
            self.heading_buf = []
            attrs_map = dict(attrs or [])
            self.heading_id = clean(attrs_map.get("id", ""))
        if self.current and tag in {"p", "div", "br", "li"}:
            self.current["text_parts"].append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"}:
            self.skip = False
            return
        if self.skip:
            return
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"} and self.in_heading:
            title = clean("".join(self.heading_buf))
            self.current = {"title": title, "anchor": self.heading_id, "text_parts": []}
            self.in_heading = False
            self.heading_buf = []
            self.heading_id = ""
        if self.current and tag in {"p", "div", "li"}:
            self.current["text_parts"].append("\n")

    def handle_data(self, data):
        if self.skip:
            return
        if self.in_heading:
            self.heading_buf.append(data)
        else:
            if not self.current:
                self.current = {"title": "Document", "anchor": "", "text_parts": []}
            self.current["text_parts"].append(data)

    def get_sections(self):
        self._flush_current()
        return self.sections


class HtmlLinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        attrs_map = dict(attrs or [])
        href = clean(attrs_map.get("href", ""))
        if href:
            self.links.append(href)


def load_csv(path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def clean(text):
    return re.sub(r"\s+", " ", (text or "").strip())


def tokenize(text):
    words = re.findall(r"[a-zA-Z0-9]{3,}", clean(text).lower())
    return [w for w in words if w not in STOP]


def fetch_url(url, force_refresh=False):
    key = re.sub(r"[^a-zA-Z0-9]+", "_", url)[:120]
    html_cache = CACHE_DIR / f"{key}.html"
    text_cache = CACHE_DIR / f"{key}.txt"

    if html_cache.exists() and text_cache.exists() and not force_refresh:
        html = html_cache.read_text(encoding="utf-8", errors="ignore")
        text = text_cache.read_text(encoding="utf-8", errors="ignore")
        return {"html": html, "text": text}

    req = request.Request(url, headers={"User-Agent": "roadmap-detector/1.0"})
    with request.urlopen(req, timeout=45) as resp:
        html = resp.read().decode("utf-8", errors="ignore")

    parser = HtmlToText()
    parser.feed(html)
    text = parser.get_text()
    html_cache.write_text(html, encoding="utf-8")
    text_cache.write_text(text, encoding="utf-8")
    return {"html": html, "text": text}


def chunk_text(text, chunk_size=900, overlap=150):
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        end = min(n, i + chunk_size)
        piece = clean(text[i:end])
        if len(piece) > 80:
            chunks.append(piece)
        if end == n:
            break
        i = max(i + 1, end - overlap)
    return chunks


def parse_sections_from_html(html, url):
    parser = HtmlSectionParser()
    parser.feed(html)
    sections = parser.get_sections()
    if not sections:
        return [{"title": "Document", "anchor": "", "text": clean(html)}]
    return sections


def section_link(url, anchor):
    a = clean(anchor)
    if a:
        return f"{url}#{a}"
    return url


def normalize_doc_url(base_url, href):
    if not href:
        return ""
    abs_url = urljoin(base_url, href)
    p = urlparse(abs_url)
    if p.scheme not in {"http", "https"}:
        return ""
    if not p.netloc:
        return ""
    if p.fragment:
        abs_url = abs_url.split("#", 1)[0]
    if p.query:
        abs_url = abs_url.split("?", 1)[0]
    return abs_url.rstrip("/")


def link_allowed(seed_url, candidate_url):
    seed = urlparse(seed_url)
    c = urlparse(candidate_url)
    if not c.netloc or seed.netloc != c.netloc:
        return False
    seed_path = seed.path.rstrip("/")
    cand_path = c.path.rstrip("/")
    if seed_path and cand_path.startswith(seed_path):
        return True
    return "/product-help-and-support/" in cand_path


def extract_links(html, base_url):
    parser = HtmlLinkParser()
    parser.feed(html or "")
    out = []
    seen = set()
    for href in parser.links:
        u = normalize_doc_url(base_url, href)
        if not u:
            continue
        if u in seen:
            continue
        seen.add(u)
        out.append(u)
    return out


def crawl_doc_urls(seed_url, max_pages=20, force_refresh=False):
    seed = normalize_doc_url(seed_url, "")
    if not seed:
        seed = seed_url.rstrip("/")
    queue = [seed]
    seen = set()
    out = []
    while queue and len(out) < max_pages:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            fetched = fetch_url(url, force_refresh=force_refresh)
        except Exception as e:
            print(f"warn: unable to fetch {url}: {e}")
            continue
        out.append({"url": url, "html": fetched.get("html", ""), "text": fetched.get("text", "")})
        for link in extract_links(fetched.get("html", ""), url):
            if link in seen or link in queue:
                continue
            if link_allowed(seed_url, link):
                queue.append(link)
    return out


def score_chunk(query, chunk):
    q = tokenize(query)
    c = tokenize(chunk)
    if not q or not c:
        return 0.0
    qc = Counter(q)
    cc = Counter(c)
    overlap = sum(min(qc[k], cc.get(k, 0)) for k in qc)
    denom = (sum(qc.values()) * sum(cc.values())) ** 0.5
    return overlap / denom if denom else 0.0


def openai_request(payload, api_key):
    req = request.Request(
        url="https://api.openai.com/v1/responses",
        method="POST",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8"),
    )
    with request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def llm_verdict(cluster_label, evidence, api_key, model="gpt-4.1-mini"):
    prompt = (
        "Classify if the requirement is already shipped based only on evidence snippets. "
        "Return strict JSON keys: decision (SHIPPED|POSSIBLY_SHIPPED|NOT_SHIPPED), confidence (0-1), reason (string)."
    )
    payload = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "text", "text": prompt}]},
            {
                "role": "user",
                "content": [{
                    "type": "text",
                    "text": json.dumps({"cluster_label": cluster_label, "evidence": evidence}),
                }],
            },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "ship_verdict",
                "schema": {
                    "type": "object",
                    "properties": {
                        "decision": {"type": "string", "enum": ["SHIPPED", "POSSIBLY_SHIPPED", "NOT_SHIPPED"]},
                        "confidence": {"type": "number"},
                        "reason": {"type": "string"},
                    },
                    "required": ["decision", "confidence", "reason"],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        },
    }
    data = openai_request(payload, api_key)
    text = data.get("output", [{}])[0].get("content", [{}])[0].get("text", "{}")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"decision": "POSSIBLY_SHIPPED", "confidence": 0.5, "reason": "LLM parse failed."}


def heuristic_verdict(best_score, second_score):
    if best_score >= 0.22 and (best_score - second_score) > 0.03:
        return "SHIPPED", 0.78, "Strong lexical alignment in documentation snippets."
    if best_score >= 0.12:
        return "POSSIBLY_SHIPPED", 0.52, "Some alignment found, but evidence is not definitive."
    return "NOT_SHIPPED", 0.72, "No strong evidence found in indexed docs."


def main():
    parser = argparse.ArgumentParser(description="Detect shipped requirements with citations")
    parser.add_argument("--use-llm", action="store_true", help="Use OpenAI for verdicting")
    parser.add_argument("--model", default="gpt-4.1-mini")
    parser.add_argument("--top-k", type=int, default=3)
    parser.add_argument("--refresh-docs", action="store_true")
    parser.add_argument("--max-pages-per-doc", type=int, default=20)
    args = parser.parse_args()

    docs = load_csv(DOC_MANIFEST)
    clusters = load_csv(CLUSTERS) or load_csv(FALLBACK_CLUSTERS)
    if not docs:
        raise SystemExit(f"Docs manifest missing or empty: {DOC_MANIFEST}")
    if not clusters:
        raise SystemExit("No cluster file found. Run semantic clustering first.")

    corpus = []
    for d in docs:
        seed_url = clean(d.get("url_or_path", ""))
        if not seed_url:
            continue
        fetched_pages = crawl_doc_urls(
            seed_url,
            max_pages=max(1, int(args.max_pages_per_doc or 20)),
            force_refresh=args.refresh_docs,
        )
        for p_idx, page in enumerate(fetched_pages):
            page_url = page.get("url", seed_url)
            sections = parse_sections_from_html(page.get("html", ""), page_url)
            for s_idx, sec in enumerate(sections):
                chunks = chunk_text(sec.get("text", ""))
                for c_idx, chunk in enumerate(chunks):
                    corpus.append({
                        "doc_id": d.get("doc_id", ""),
                        "title": d.get("title", ""),
                        "url": page_url,
                        "section_title": clean(sec.get("title", "")) or "Section",
                        "section_anchor": clean(sec.get("anchor", "")),
                        "section_link": section_link(page_url, sec.get("anchor", "")),
                        "published_date": d.get("published_date", ""),
                        "chunk_id": f"{p_idx}:{s_idx}:{c_idx}",
                        "text": chunk,
                    })

    if not corpus:
        print("warn: no documentation corpus chunks available; writing verification-required output.")
        rows_out = []
        json_out = []
        fallback_url = clean(docs[0].get("url_or_path", "")) if docs else ""
        for i, c in enumerate(clusters, start=1):
            label = clean(c.get("cluster_label", ""))
            row = {
                "cluster_id": c.get("cluster_id", c.get("rank", f"R{i}")),
                "cluster_label": label,
                "product": clean(c.get("product", "")),
                "decision": "POSSIBLY_SHIPPED",
                "confidence": 0.3,
                "reason": "Documentation corpus unavailable in current environment. PM verification required.",
                "best_score": 0.0,
                "evidence_count": 0,
                "citation_1": fallback_url,
                "citation_2": "",
                "citation_3": "",
                "section_1": "",
                "section_2": "",
                "section_3": "",
                "snippet_1": "",
                "snippet_2": "",
                "snippet_3": "",
            }
            rows_out.append(row)
            json_out.append({
                "cluster": {"id": row["cluster_id"], "label": label},
                "decision": row["decision"],
                "confidence": row["confidence"],
                "reason": row["reason"],
                "evidence": [],
            })

        with OUT_CSV.open("w", encoding="utf-8", newline="") as fh:
            fields = [
                "cluster_id", "cluster_label", "product", "decision", "confidence", "reason", "best_score", "evidence_count",
                "citation_1", "citation_2", "citation_3", "section_1", "section_2", "section_3", "snippet_1", "snippet_2", "snippet_3",
            ]
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            w.writerows(rows_out)

        OUT_JSON.write_text(json.dumps(json_out, ensure_ascii=True, indent=2), encoding="utf-8")
        print(f"Wrote {OUT_CSV}")
        print(f"Wrote {OUT_JSON}")
        print(f"clusters processed: {len(rows_out)}")
        return

    api_key = os.environ.get("OPENAI_API_KEY", "") if args.use_llm else ""

    rows_out = []
    json_out = []

    for i, c in enumerate(clusters, start=1):
        label = clean(c.get("cluster_label", ""))
        scored = []
        for chunk in corpus:
            s = score_chunk(label, chunk["text"])
            if s > 0:
                scored.append((s, chunk))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[: args.top_k]

        evidence = []
        for score, chunk in top:
            evidence.append({
                "doc_id": chunk["doc_id"],
                "title": chunk["title"],
                "url": chunk["url"],
                "section_title": chunk.get("section_title", ""),
                "section_link": chunk.get("section_link", chunk["url"]),
                "published_date": chunk["published_date"],
                "chunk_id": chunk["chunk_id"],
                "score": round(score, 4),
                "snippet": clean(chunk["text"][:280]),
            })

        best_score = top[0][0] if top else 0.0
        second_score = top[1][0] if len(top) > 1 else 0.0

        if api_key and evidence:
            try:
                verdict = llm_verdict(label, evidence=evidence, api_key=api_key, model=args.model)
                decision = verdict.get("decision", "POSSIBLY_SHIPPED")
                confidence = float(verdict.get("confidence", 0.5))
                reason = clean(verdict.get("reason", ""))
            except Exception:
                decision, confidence, reason = heuristic_verdict(best_score, second_score)
        else:
            decision, confidence, reason = heuristic_verdict(best_score, second_score)

        row = {
            "cluster_id": c.get("cluster_id", c.get("rank", f"R{i}")),
            "cluster_label": label,
            "product": clean(c.get("product", "")),
            "decision": decision,
            "confidence": round(confidence, 4),
            "reason": reason,
            "best_score": round(best_score, 4),
            "evidence_count": len(evidence),
            "citation_1": evidence[0]["section_link"] if len(evidence) > 0 else "",
            "citation_2": evidence[1]["section_link"] if len(evidence) > 1 else "",
            "citation_3": evidence[2]["section_link"] if len(evidence) > 2 else "",
            "section_1": evidence[0]["section_title"] if len(evidence) > 0 else "",
            "section_2": evidence[1]["section_title"] if len(evidence) > 1 else "",
            "section_3": evidence[2]["section_title"] if len(evidence) > 2 else "",
            "snippet_1": evidence[0]["snippet"] if len(evidence) > 0 else "",
            "snippet_2": evidence[1]["snippet"] if len(evidence) > 1 else "",
            "snippet_3": evidence[2]["snippet"] if len(evidence) > 2 else "",
        }
        rows_out.append(row)
        json_out.append({"cluster": {"id": row["cluster_id"], "label": label}, "decision": decision, "confidence": confidence, "reason": reason, "evidence": evidence})

        if i % 25 == 0:
            print(f"processed {i}/{len(clusters)} clusters")
            time.sleep(0.01)

    with OUT_CSV.open("w", encoding="utf-8", newline="") as fh:
        fields = [
            "cluster_id", "cluster_label", "product", "decision", "confidence", "reason", "best_score", "evidence_count",
            "citation_1", "citation_2", "citation_3", "section_1", "section_2", "section_3", "snippet_1", "snippet_2", "snippet_3",
        ]
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows_out)

    OUT_JSON.write_text(json.dumps(json_out, ensure_ascii=True, indent=2), encoding="utf-8")

    print(f"Wrote {OUT_CSV}")
    print(f"Wrote {OUT_JSON}")
    print(f"clusters processed: {len(rows_out)}")


if __name__ == "__main__":
    main()
