#!/bin/bash
# 핀맵 로컬 미리보기 — 더블클릭하면 브라우저에서 402×874 휴대폰 화면으로 열려요.
# 로그인 없이 예시 데이터로 보여 주고, 이 폴더의 파일은 바꾸지 않아요(.local 폴더에만 미리보기용 파일을 만들어요).
cd "$(dirname "$0")" || exit 1
command -v python3 >/dev/null 2>&1 || { echo "python3가 필요해요. 터미널에서 'xcode-select --install'을 실행한 뒤 다시 열어 주세요."; read -r -p "Enter를 누르면 닫혀요."; exit 1; }
mkdir -p .local
python3 - <<'PY'
import re, pathlib
root = pathlib.Path('.')
env = (root / 'environment.js').read_text(encoding='utf-8')
env = re.sub(r'const requiresAuth = true', 'const requiresAuth = false', env)
env = re.sub(r'const development = true', 'const development = false', env)
(root / '.local' / 'env.js').write_text(env, encoding='utf-8')
app = (root / 'app.html').read_text(encoding='utf-8')
app = re.sub(r'<script src="app-entry-guard\.js[^"]*"></script>', '', app)
app = re.sub(r'environment\.js\?v=[^"]*', '.local/env.js', app)
app = app.replace('<head>', '<head><base href="../">', 1)
boot = "<script>addEventListener('load',()=>{if(location.search.includes('onboarding')&&typeof openOnboarding==='function')setTimeout(()=>openOnboarding(1),300)})</script>"
app = app.replace('</body>', boot + '</body>') if '</body>' in app else app + boot
(root / '.local' / 'app.html').write_text(app, encoding='utf-8')
(root / '.local' / 'preview.html').write_text('''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>핀맵 로컬 미리보기</title>
<style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;background:#e8e8e8;font:14px -apple-system,sans-serif;color:#333}
.bar{display:flex;gap:8px}.bar button{padding:8px 16px;border:0;border-radius:999px;background:#333;color:#f4f4f4;font:inherit;cursor:pointer}.bar button.alt{background:#fff;color:#333}
iframe{width:402px;height:874px;border:0;border-radius:40px;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,.18)}small{color:#6c6c6c}</style></head>
<body><div class="bar"><button onclick="f.src='app.html?onboarding&t='+Date.now()">온보딩부터 보기</button><button class="alt" onclick="f.src='app.html?t='+Date.now()">홈부터 보기</button><button class="alt" onclick="f.contentWindow.localStorage.setItem('pinmap-appearance',f.contentWindow.localStorage.getItem('pinmap-appearance')==='dark'?'light':'dark');f.contentWindow.location.reload()">라이트/다크 바꾸기</button></div>
<iframe id="f" src="app.html"></iframe><small>파일을 고친 뒤에는 '홈부터 보기'를 누르면 새로 불러와요. 창을 닫으려면 터미널 창을 닫아 주세요.</small></body></html>''', encoding='utf-8')
PY
PORT=8765
while lsof -i :"$PORT" >/dev/null 2>&1; do PORT=$((PORT+1)); done
echo "미리보기 주소: http://localhost:$PORT/.local/preview.html"
( sleep 1; open "http://localhost:$PORT/.local/preview.html" ) &
python3 -m http.server "$PORT" --bind 127.0.0.1
