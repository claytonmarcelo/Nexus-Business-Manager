import json
from graphify.detect import detect
from graphify.extract import collect_files, extract
from pathlib import Path

# Detect files
result = detect(Path('.'))
print(f'Total files: {result["total_files"]}')
print(f'Code files: {len(result["files"].get("code", []))}')

# Extract only code files via AST
code_files = []
for f in result['files'].get('code', []):
    code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

print(f'Processing {len(code_files)} code files...')
ast_result = extract(code_files, cache_root=Path('.'))
print(f'AST: {len(ast_result["nodes"])} nodes, {len(ast_result["edges"])} edges')

# Save for graph building
Path('graphify-out/.graphify_ast.json').write_text(json.dumps(ast_result, indent=2))
print('Saved AST results')