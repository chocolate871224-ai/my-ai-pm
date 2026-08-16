#!/usr/bin/env bash
# Print today's date and the corresponding Planner weekly file.
# Weekly file is named by its Mon–Sun date range: YYYY_MMDD-MMDD (year = Monday's year).
# Usage (from project root): bash Skills/manage-planner/scripts/today.sh

set -euo pipefail

today=$(date '+%Y-%m-%d')
dow=$(date '+%u')                # 1=Mon ... 7=Sun
weekday_zh=("一" "二" "三" "四" "五" "六" "日")

# Monday and Sunday of the current ISO week (portable: BSD/macOS + GNU date)
if date -v-1d >/dev/null 2>&1; then          # BSD / macOS date
  mon=$(date -v-$((dow - 1))d '+%Y_%m%d')
  sun=$(date -v+$((7 - dow))d '+%m%d')
else                                          # GNU date
  mon=$(date -d "-$((dow - 1)) days" '+%Y_%m%d')
  sun=$(date -d "+$((7 - dow)) days" '+%m%d')
fi
week="${mon}-${sun}"             # e.g. 2026_0622-0628

echo "today: $today (${weekday_zh[$((dow - 1))]})"
echo "weekly_file: 0_Planner/Weeks/${week}.md"
