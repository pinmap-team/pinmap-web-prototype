#!/bin/bash
# 로그인 없이 내 컴퓨터에서 바로 확인하는 미리보기 (예시 데이터). GitHub에는 올라가지 않아요.
cd "$(dirname "$0")"
mkdir -p .local
sed -e 's/const requiresAuth = true/const requiresAuth = false/' -e 's/const development = true/const development = false/' environment.js > .local/env.js
sed -e 's#<head>#<head><base href="../">#' -e 's#<script src="app-entry-guard.js[^"]*"></script>##' -e 's#environment.js?v=[^"]*#.local/env.js#' -e 's#</body>#<script>if(new URLSearchParams(location.search).has("onboarding"))addEventListener("load",()=>setTimeout(()=>{try{openOnboarding(1)}catch(e){}},300));</script></body>#' app.html > .local/app.html
cat > .local/preview.html <<'HTML'
<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>핀맵 로컬 미리보기</title>
<style>html,body{margin:0;height:100%;background:#e9e9ec;display:grid;place-items:center;font:13px system-ui}
iframe{width:402px;height:874px;border:0;border-radius:44px;background:#fff;box-shadow:0 20px 60px #0003;transform-origin:center;scale:min(1,calc((100vh - 48px) / 874px))}
p{position:fixed;top:8px;left:0;right:0;text-align:center;color:#666;margin:0}
nav{position:fixed;left:16px;top:40px;display:grid;gap:8px}nav button{padding:10px 14px;border:0;border-radius:999px;background:#111;color:#fff;font:600 13px system-ui;cursor:pointer}nav button+button{background:#fff;color:#111}</style></head>
<body><p>로컬 미리보기 · 예시 데이터 · 새로고침(⌘R)하면 수정한 내용이 보여요</p><nav><button onclick="document.querySelector('iframe').src='app.html?onboarding&t='+Date.now()">온보딩부터 보기</button><button onclick="document.querySelector('iframe').src='app.html?t='+Date.now()">홈부터 보기</button></nav><iframe src="app.html?onboarding"></iframe></body></html>
HTML
PORT=8093
if ! lsof -i :$PORT >/dev/null 2>&1; then python3 -m http.server $PORT --bind 127.0.0.1 >/dev/null 2>&1 & sleep 1; fi
open "http://127.0.0.1:$PORT/.local/preview.html"
echo "미리보기를 열었어요. 이 창을 닫으면 미리보기 서버도 꺼져요."
wait
