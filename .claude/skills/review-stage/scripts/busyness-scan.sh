#!/bin/bash
# busyness-scan.sh — per-week busyness metrics for review-stage pillar 3 (忙碌曲線)
#
# 每個週檔兩軸：
#   完成量  = [x] 數        → 做了多少（也餵 pillar 2 量的實證）
#   突發    = [x]/[ ] *     → 那週被插進來的突發（不可預期）
#   突發占比 = 突發 ÷ 完成量  → 那週有多混亂
#
# 用法：bash busyness-scan.sh [WEEKS_DIR]
#   WEEKS_DIR 預設 0_Planner/Weeks（相對專案根目錄）。
#
# 註：週檔從你開始用 Planner 那週起算，更早沒資料——當基線、別捏造。

set -e

WEEKS_DIR="${1:-0_Planner/Weeks}"

if [ ! -d "$WEEKS_DIR" ]; then
  echo "Weeks dir not found: $WEEKS_DIR" >&2
  exit 1
fi

cd "$WEEKS_DIR"

printf "%-16s %8s %8s %10s\n" "WEEK" "完成量" "突發*" "突發占比"
for f in *_*.md; do
  [ -e "$f" ] || continue
  done=$(grep -cE '^\s*[0-9.]*\s*-?\s*\[x\]' "$f" || true)
  # 真突發：checkbox 後緊接 * 為突發前綴
  adhoc=$(grep -cE '\[[x ]\] \*' "$f" || true)
  if [ "$done" -gt 0 ]; then pct=$((adhoc * 100 / done)); else pct=0; fi
  wk=$(echo "$f" | sed 's/.md$//')
  printf "%-16s %8s %8s %9s%%\n" "$wk" "$done" "$adhoc" "$pct"
done

echo ""
echo "讀法：低完成量 + 高突發% ≠ 輕鬆週（是被打斷，不是閒）。看曲線不看單週。"
