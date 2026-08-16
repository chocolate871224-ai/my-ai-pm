---
name: update-aipm
description: >
  更新 ai-pm-starter 系統本身。從課程 GitHub repo 拉最新的系統檔差異，或把改過的技能同步到
  專案層鏡像 .claude/skills/（讓斜線指令更新／出現）。當使用者輸入 /update-aipm，或說「更新系統」
  「拉最新版」「同步技能／指令」「掃 GitHub 更新差異」時觸發。預設繁體中文，回應跟隨使用者語言。
---

# /update-aipm · 更新系統

> 更新的是**系統檔案**（skills / agents / 設定 / 文件），**不會動你的個人資料**
> （`0_Planner` / `1_Personal` / `2_Project` 永遠不碰）。

## 何時觸發
- `/update-aipm`、「更新系統」、「拉最新版」、「掃我們的 GitHub 更新差異」、「同步技能／指令」

## 兩種更新方式

### A. 從課程 GitHub 更新差異（拿我們的最新版）
我們會持續更新這套系統。這個動作把**系統檔**更新到最新：

1. 確認這是 git repo 且已接上課程 remote（沒有 → 請使用者先依 `/setup-aipm` 模組 A 接上，或給 repo 網址）。
2. `git fetch` 取得最新；**先給使用者看「什麼變了」**（`git log`／`git diff --stat` 摘要：哪些 skill/agent/文件有更新）。
3. 更新時**只動系統路徑**：`Skills/`、`Agents/`、`CLAUDE.md`、`98_DOC/`、`.claude/settings.json`、`package.json`、`README.md`。
4. **絕不覆蓋個人資料**：`0_Planner/`、`1_Personal/`、`2_Project/` 一律保留使用者版本。
5. 若使用者本地改過系統檔而起衝突 → **停下、說明衝突**，讓使用者決定保留哪邊，不要硬合併。
6. 更新後請使用者**重開／重新匯入** Claude Code，讓它讀到最新；建議接著跑 `/check-aipm`。

### B. 同步技能到專案鏡像（讓斜線指令可用）
改過 `Skills/` 裡的技能、或用 A 拉了新版之後，要把它同步到**專案層鏡像** `.claude/skills/`——斜線指令（`/log-work`、`/check-now` 等）才會更新、新技能才會在 `/` 選單出現：

1. 跑 `cp -r Skills/* .claude/skills/`（等同 `npm run skills:sync`，但用 `cp` 不需要 Node）。
2. 提醒：鏡像是**複製**一份——每次改完 `Skills/` 都要再同步一次，`.claude/skills/` 才會跟上。

> 本包**只用專案層**：技能跟著這個資料夾走，不同步到家目錄、也不跨專案共用（保持乾淨單純）。`setup-aipm` 啟動時、`check-aipm` 發現鏡像缺項時，都會自動做這個同步。

## 規則
- **DO**：先 diff 給使用者看再更新；只動系統檔；衝突先停下問。
- **DO NOT**：不要 `git reset --hard`/`git clean`/force（那會毀掉本地變更——而且這些已被權限閘 deny）；不要碰 `0_Planner`/`1_Personal`/`2_Project`；不要在衝突時硬合併。

## Usage（git 操作；無 npm 指令）
| 動作 | 指令（AI 代跑，會先給你看差異） |
|------|------|
| 看遠端有什麼更新 | `git fetch` → `git log --oneline HEAD..@{u}` |
| 看哪些檔變了 | `git diff --stat HEAD @{u}` |
| 更新系統檔 | 針對系統路徑套用更新（保留個人資料） |

> 這支由 **the-assistant** 提供；它動到 git，請依權限提問逐次確認。
