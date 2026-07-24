#!/usr/bin/env python3
"""
Reproducibly (re)build the Personus knowledge graph.

Inputs:
  - .graphify/docs-semantic.json  — committed doc extraction (the expensive LLM
    step; captured once so the graph rebuilds for free on any machine).
  - live monorepo TypeScript        — structural AST extraction (deterministic,
    no API cost), re-read every run.

Outputs (into graphify-out/, gitignored):
  graph.json · GRAPH_REPORT.md · graph.html · wiki/

Effectiveness rules baked in:
  - CURRENT-ONLY: nodes from docs/archive/** or with status=superseded are
    dropped, so queries never surface stale/retired claims as if live.
  - AUTO-LABELED: each community is named after its highest-degree node, so the
    build stays reproducible with no hand-labeling step.

Usage:  bun run graph:build   (or:  python3 scripts/graph/build-graph.py)
Fresh clone with no committed semantic? Run `/graphify docs` once to generate it.
"""

import json
import sys
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.export import to_html, to_json
from graphify.extract import extract
from graphify.report import generate
from graphify.wiki import to_wiki

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "graphify-out"
SEMANTIC = ROOT / ".graphify" / "docs-semantic.json"
CODE_ROOTS = ["packages", "apps"]
CODE_EXCLUDE = ("node_modules/", "/.next/", "/dist/", "/.turbo/")


def is_current(node: dict) -> bool:
    """Drop retired knowledge so the graph reflects the shipped system."""
    if node.get("status") == "superseded":
        return False
    return not str(node.get("source_file", "")).startswith("docs/archive/")


def load_semantic() -> dict:
    if not SEMANTIC.exists():
        sys.exit(
            f"missing {SEMANTIC.relative_to(ROOT)} — run `/graphify docs` once to "
            "generate the doc extraction, then re-run this build."
        )
    sem = json.loads(SEMANTIC.read_text())
    keep = {n["id"] for n in sem["nodes"] if is_current(n)}
    nodes = [n for n in sem["nodes"] if n["id"] in keep]
    edges = [e for e in sem["edges"] if e.get("source") in keep and e.get("target") in keep]
    hyper = [h for h in sem.get("hyperedges", []) if all(n in keep for n in h.get("nodes", []))]
    dropped = len(sem["nodes"]) - len(nodes)
    print(f"docs: {len(nodes)} current nodes ({dropped} archived/superseded dropped)")
    return {"nodes": nodes, "edges": edges, "hyperedges": hyper}


def code_ast() -> dict:
    files = []
    for base in CODE_ROOTS:
        for pat in ("*.ts", "*.tsx"):
            files += (ROOT / base).rglob(pat)
    files = [p for p in files if not any(x in str(p) for x in CODE_EXCLUDE)]
    result = extract(files, cache_root=ROOT)
    print(f"code: {len(result['nodes'])} AST nodes from {len(files)} files")
    return result


def auto_labels(graph, communities: dict) -> dict:
    """Name each community after its highest-degree member — reproducible, no hand-mapping."""
    labels = {}
    for cid, members in communities.items():
        top = max(members, key=lambda n: graph.degree(n)) if members else None
        name = graph.nodes[top].get("label", f"Community {cid}") if top else f"Community {cid}"
        labels[cid] = name[:48]
    return labels


def main() -> None:
    sem = load_semantic()
    ast = code_ast()

    seen = {n["id"] for n in ast["nodes"]}
    nodes = list(ast["nodes"])
    for n in sem["nodes"]:
        if n["id"] not in seen:
            nodes.append(n)
            seen.add(n["id"])
    extraction = {
        "nodes": nodes,
        "edges": ast["edges"] + sem["edges"],
        "hyperedges": sem.get("hyperedges", []),
        "input_tokens": 0,
        "output_tokens": 0,
    }

    G = build_from_json(extraction)
    communities = cluster(G)
    cohesion = score_all(G, communities)
    labels = auto_labels(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)
    questions = suggest_questions(G, communities, labels)
    detection = {"total_files": 0, "total_words": 0, "files": {}}

    OUT.mkdir(exist_ok=True)
    report = generate(
        G, communities, cohesion, labels, gods, surprises, detection,
        {"input": 0, "output": 0}, "docs+code", suggested_questions=questions,
    )
    (OUT / "GRAPH_REPORT.md").write_text(report)
    # force: our current-only build intentionally has fewer nodes than a prior
    # full build (archive dropped), so bypass graphify's shrink-guard.
    to_json(G, communities, str(OUT / "graph.json"), force=True)
    to_html(G, communities, str(OUT / "graph.html"), community_labels=labels)
    to_wiki(G, communities, str(OUT / "wiki"), community_labels=labels,
            cohesion=cohesion, god_nodes_data=gods)

    print(
        f"graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges, "
        f"{len(communities)} communities → graphify-out/{{graph.json,GRAPH_REPORT.md,graph.html,wiki/}}"
    )


if __name__ == "__main__":
    main()
