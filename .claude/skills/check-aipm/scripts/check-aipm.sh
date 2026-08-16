#!/usr/bin/env bash
# check-aipm — structural + module health scan for ai-pm-starter.
# Usage (from project root): bash Skills/check-aipm/scripts/check-aipm.sh
# Prints ✅ / ❌ / ⚠️ lines. Non-destructive (read-only + one sandbox smoke test).

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pass=0; fail=0; warn=0
ok()   { echo "✅ $1"; pass=$((pass+1)); }
bad()  { echo "❌ $1"; fail=$((fail+1)); }
note() { echo "⚠️  $1"; warn=$((warn+1)); }

echo "── ai-pm-starter 健檢 ──"
echo "root: $ROOT"
echo ""
echo "[結構]"

# Agents (expect exactly 3)
agents=$(find Agents -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
[ "$agents" = "3" ] && ok "agents = 3" || bad "agents = $agents（預期 3：the-assistant / the-gatekeeper / the-smith）"
for a in the-assistant the-gatekeeper the-smith; do
  [ -f "Agents/$a/CLAUDE.md" ] && ok "agent $a" || bad "缺 Agents/$a/CLAUDE.md"
done
# no leftover merged agents
if find Agents -maxdepth 1 -type d \( -name the-purge -o -name the-quartermaster \) | grep -q .; then
  bad "仍殘留 the-purge / the-quartermaster（應已合併為 the-gatekeeper）"
else ok "無 the-purge / the-quartermaster 殘留"; fi

# Skills
skills=$(find Skills -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
ok "skills 數量 = $skills"
for s in manage-planner purge-file ingest-file safety-aipm setup-aipm check-aipm handle-git log-work check-now review-weekly; do
  [ -f "Skills/$s/SKILL.md" ] && ok "skill $s" || bad "缺 Skills/$s/SKILL.md"
done
# .claude/skills 原生鏡像（讓 /指令 autocomplete）應與 Skills/ 一致
mirror=$(find .claude/skills -maxdepth 1 -mindepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
if [ "$mirror" = "0" ]; then bad ".claude/skills 未建鏡像（/指令不會出現在選單；跑 npm run skills:sync）"
elif [ "$mirror" = "$skills" ]; then ok ".claude/skills 鏡像同步（$mirror）"
else note ".claude/skills 鏡像（$mirror）≠ Skills（$skills）；跑 npm run skills:sync 對齊"; fi

# Planner templates
for f in 0_Planner/README.md 0_Planner/goals.md 0_Planner/recurring-items.md; do
  [ -f "$f" ] && ok "範本 $f" || bad "缺 $f"
done

echo ""
echo "[腳本與安全]"
# Scripts executable
for s in Skills/purge-file/scripts/sandbox-guard.sh Skills/manage-planner/scripts/today.sh; do
  [ -x "$s" ] && ok "可執行 $s" || note "$s 非可執行（chmod +x）"
done
# today.sh runs
if bash Skills/manage-planner/scripts/today.sh >/dev/null 2>&1; then ok "today.sh 可跑"; else bad "today.sh 執行失敗"; fi

# sandbox-guard smoke test: a fake rm must be BLOCKED (exit 2)
if printf '%s' '{"tool_input":{"command":"rm something"}}' | bash Skills/purge-file/scripts/sandbox-guard.sh >/dev/null 2>&1; then
  bad "sandbox-guard 沒擋下 rm（指令閘失效！）"
else
  ok "sandbox-guard 實測：rm 被擋"
fi

# .mcp.json only gcal
if [ -f .mcp.json ]; then
  if grep -q '"gcal"' .mcp.json && ! grep -qE '"(instagram|facebook|discord|x-twitter|linkedin|threads)"' .mcp.json; then
    ok ".mcp.json 只含 gcal"
  else note ".mcp.json 內容非預期（應只有 gcal）"; fi
else bad "缺 .mcp.json"; fi

# settings.json: deny list + sandbox hook
if [ -f .claude/settings.json ]; then
  grep -q '"deny"' .claude/settings.json && ok "settings.json 有 permissions.deny 黑名單" || note "settings.json 缺 permissions.deny（跑 /safety-aipm 設定）"
  grep -q 'sandbox-guard.sh' .claude/settings.json && ok "settings.json 掛了 sandbox-guard hook" || bad "settings.json 缺 sandbox-guard hook"
else bad "缺 .claude/settings.json"; fi

echo ""
echo "[模組狀態]"
echo "（⚠️ = 選配模組未啟用，不是錯誤；核心照常運作）"
# Module A: git remote
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if git remote -v 2>/dev/null | grep -q .; then ok "模組 A：git remote 已設（雲端同步可用）"; else note "模組 A：未設 git remote（要雲端同步跑 /setup-aipm 模組 A）"; fi
else note "模組 A：尚未 git init"; fi
# Module B: node + gcal mock
if command -v node >/dev/null 2>&1; then ok "模組 B：Node 已安裝（$(node -v)）"; else note "模組 B（選配）：未裝 Node — 想用行事曆同步『再裝 Node + npm install』即可；核心不受影響"; fi
if [ -f .env ]; then
  grep -q 'GCAL_MOCK_MODE=false' .env && ok "模組 B：gcal = 真實模式" || note "模組 B：gcal = mock 模式（預設；要接真實跑 npm run cal:auth）"
else note "模組 B：尚無 .env（核心軌不需要；模組 B 才需 cp .env.example .env）"; fi

echo ""
echo "── 結果：✅ ${pass}  ❌ ${fail}  ⚠️ ${warn} ──"
[ "$fail" -eq 0 ] && echo "結構與安全 OK。" || echo "有 ❌ 要修——對應修復見 98_DOC/04-security.md 或跑 /setup-aipm。"
