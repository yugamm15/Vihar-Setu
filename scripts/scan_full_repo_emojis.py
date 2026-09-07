import os
import unicodedata
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ignore_dirs = {'.git', 'node_modules', '.gradle', 'android', 'ios', 'build', '.gemini', 'dist', '.agents'}

def is_emoji(ch):
    cp = ord(ch)
    if (0x1F000 <= cp <= 0x1FFFF) or \
       (0x2600 <= cp <= 0x27BF) or \
       (0x2300 <= cp <= 0x23FF) or \
       (0x2B50 <= cp <= 0x2B55) or \
       (0x200D == cp) or \
       (0xFE0E <= cp <= 0xFE0F):
        return True
    return False

emojis_found = []
count_files = 0
for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d not in ignore_dirs]
    for f in files:
        if f.endswith(('.js', '.jsx', '.ts', '.tsx', '.json', '.sql')):
            count_files += 1
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8', errors='ignore') as file:
                lines = file.readlines()
                for idx, line in enumerate(lines):
                    line_emojis = [ch for ch in line if is_emoji(ch)]
                    if line_emojis:
                        emojis_found.append({
                            'file': os.path.relpath(path, root_dir),
                            'line': idx + 1,
                            'emojis': ''.join(line_emojis),
                            'content': line.strip()
                        })

print(f"Scanned {count_files} files in entire repository (excluding build/node_modules)")
print(f"Total lines containing emojis: {len(emojis_found)}\n")

for item in emojis_found:
    print(f"{item['file']}:{item['line']} -> [{item['emojis']}] {item['content']}")
