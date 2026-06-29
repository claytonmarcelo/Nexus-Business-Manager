import json
from pathlib import Path

manifest = json.loads(Path('graphify-out/manifest.json').read_text(encoding='utf-8'))
print('Manifest keys:', manifest.keys())
if 'files' in manifest:
    print(f'Files tracked: {len(manifest["files"])}')
if 'all_files' in manifest:
    print(f'All files: {len(manifest["all_files"])}')