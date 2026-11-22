"""Refresh local asset URLs from their content. Run after map, CSS, or JS edits."""
from pathlib import Path
import hashlib
import re
root=Path(__file__).resolve().parents[1]
def version(match):
    name=match.group(1)
    file=root/name
    return name+'?v='+hashlib.sha256(file.read_bytes()).hexdigest()[:12] if file.is_file() else match.group()
for name in ['app.html','index.html','auth.html','checkout.html','plans.html','terms.html','privacy.html','refunds.html']:
    file=root/name
    text=file.read_text()
    text=re.sub(r'(?<=["\'])([^"\'?<>]+\.(?:css|js))(?:\?v=[^"\'<>]+)?(?=["\'])',version,text)
    file.write_text(text)
