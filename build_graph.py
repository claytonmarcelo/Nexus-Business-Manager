import json
import sys
from pathlib import Path

# Add graphify to path
sys.path.insert(0, str(Path.home() / 'AppData' / 'Roaming' / 'Python' / 'Python314' / 'site-packages'))

from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json

# Load AST extraction
extraction = json.loads(Path('graphify-out/.graphify_ast.json').read_text(encoding='utf-8'))
detection = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))

print(f'Building graph from {len(extraction["nodes"])} nodes, {len(extraction["edges"])} edges...')

# Build graph
G = build_from_json(extraction, root='.', directed=False)
print(f'Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')

if G.number_of_nodes() == 0:
    print('ERROR: Graph is empty')
    sys.exit(1)

# Cluster
communities = cluster(G)
cohesion = score_all(G, communities)
print(f'Communities: {len(communities)}')

# Analyze
gods = god_nodes(G)
surprises = surprising_connections(G, communities)
labels = {cid: f'Community {cid}' for cid in communities}
questions = suggest_questions(G, communities, labels)

# Export
wrote = to_json(G, communities, 'graphify-out/graph.json')
print(f'Graph written: {wrote}')

# Generate report
tokens = {'input': extraction.get('input_tokens', 0), 'output': extraction.get('output_tokens', 0)}
report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, '.', suggested_questions=questions)
Path('graphify-out/GRAPH_REPORT.md').write_text(report, encoding='utf-8')
print('Report generated')

# Save analysis
analysis = {
    'communities': {str(k): v for k, v in communities.items()},
    'cohesion': {str(k): v for k, v in cohesion.items()},
    'gods': gods,
    'surprises': surprises,
    'questions': questions,
}
Path('graphify-out/.graphify_analysis.json').write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding='utf-8')

print('Done!')