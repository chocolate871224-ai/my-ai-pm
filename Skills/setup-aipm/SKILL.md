---
name: setup-aipm
description: >
  ai-pm-starter 啟動精靈。第一次使用時，一步一步帶使用者完成核心軌設定。當使用者輸入
  /setup-aipm，或說「帶我啟動」「第一次用」「怎麼開始」「幫我設定」時觸發。
  預設繁體中文，回應跟隨使用者語言（學員用英文就用英文）。
---

# /setup-aipm · 啟動精靈

> 這份是給 AI 讀的引導腳本。使用者說「帶我啟動」時，依下面流程一步步帶他完成。

## 互動原則
- 一次只問**一件事**，等回答再進下一步。
- 口氣親切簡潔；每步完成簡短確認再往下。
- 卡住給具體下一動作，別丟一堆選項。
- 權限提問是正常的，先跟使用者說明別緊張。
- **只做這份腳本列的步驟，別自行跑沒講好的流程**；每步做了什麼要**如實回報**，不確定有沒有做完就回去檢查——別跳步、別假裝完成。

## 你的任務
帶使用者完成**核心軌**：確認環境 → 自訂 stream → 設 tracker 起算日 → 設權限 → 開第一筆日誌。
完成後再問要不要做選配模組 A（GitHub 雲端同步）/ B（Google Calendar）。

## 核心軌流程

### Step 0 — 開場
說明：核心系統純本機、純 markdown、零 Node，現在花幾分鐘啟動。問準備好了嗎。

### Step 1 — 確認環境（輕量）
使用者能對話 = Claude Code 外掛 + 付費方案已就緒。確認他人在 VSCode、已用本資料夾開啟。
- 問起費用 → 說明需 Pro/Max/Team/Enterprise 或 API，**免費 claude.ai 不含**。
- 想在終端機打 `claude` → 說明需另裝獨立 CLI（原生安裝、免 Node）；用外掛面板即可，非必要。
- **確保斜線指令立刻可用**：跑 `cp -r Skills/* .claude/skills/`，把 `Skills/`（技能來源）同步到專案層鏡像 `.claude/skills/`——這樣 `/log-work`、`/check-now` 這些斜線指令馬上打得出來。（這行等同 `npm run skills:sync`，但用 `cp` 不需要 Node；clone 下來鏡像通常已在，這步是確保萬一有缺也補齊。）

### Step 2 — 自訂 streams
說明預設四條：工作/生活/事業/學習。問要沿用還是改成自己的領域（3–5 條）。
- 要改 → 同步更新 `0_Planner/README.md` 的 stream 表 + 範例檔（`2026-06.md`、`Weeks/2026_0622-0628.md`）的 `### StreamName`。

### Step 3 — 每日追蹤 tracker
說明內建「飲料」tracker（C=咖啡、T=茶）當示範。問要不要換成自己的習慣、或先不追蹤。
- 先跑 `bash Skills/manage-planner/scripts/today.sh` 拿今天日期。
- 確認 tracker **起算日**（通常今天），說明之後只從那天起算、不回溯。

### Step 4 — 設定權限（安全）
問：「要不要現在設好安全權限？這樣常用又安全的動作不用每次按允許，危險動作則直接擋掉。」
要 → 啟用 [safety-aipm](../safety-aipm/SKILL.md) 帶他設 deny/allow。

### Step 5 — 開第一筆 Daily Log
1. 用 today.sh 的輸出拿日期與週檔路徑；週檔不存在則依 manage-planner 格式建立。
2. 問使用者今天有什麼事/待辦（一次問一面向：先事件、再待辦）。
3. 用子彈符號寫進對應 day section 與 stream（事件 `[o]`、待辦 `[ ]`）。
4. 讓他打開檔案看成果。

### Step 6 — 收尾 + 介紹選配
告訴他核心已就緒。問要不要現在加做（一次介紹一個，要才帶）：
- **模組 A**：備份到雲端、多裝置同步（需 GitHub 帳號）
- **模組 B**：跟 Google 行事曆同步（需 Node）

## 選配模組 A — GitHub 雲端同步
前置：GitHub 帳號（沒有 → 引導 https://github.com/signup）。
1. 提醒：會上傳整個 Planner，repo **務必設 Private**。
   > 💡 安撫使用者：`.env`（密碼/金鑰檔）**不會**被上傳——我們已把它寫進 `.gitignore`（一份「不上傳清單」）。只有不含密碼的範本 `.env.example` 會進雲端。
2. 確認本資料夾是 git repo（否則 `git init`）。
3. 請使用者建 Private repo、拿 **HTTPS 網址**（`https://github.com/帳號/repo.git`，最省事、免設金鑰）。**接 remote + 首推這兩步，請使用者自己在 VSCode 終端機（Ctrl + `）貼**——`git remote add origin <https-url>` → `git push -u origin main`。**別只叫 AI 跑**：實測 AI 處理 git 認證常不順。push 失敗或 `Permission denied` → `git remote set-url origin <https-url>` 再推。完整步驟見 [handle-git](../handle-git/SKILL.md)。
   - 首推要登入 GitHub：跳瀏覽器授權，或貼 **Personal Access Token 當密碼**（不是登入密碼）。
4. 告訴他：之後說「commit 並 push 今天的變更」就能備份。

## 選配模組 B — Google Calendar 同步
> 完整逐步（含 Google Cloud / OAuth 設定）見 [`98_DOC/03-google-calendar-setup.md`](../../98_DOC/03-google-calendar-setup.md)；以下為摘要，照那份帶使用者走。

前置：Node.js 18+（沒有 → 引導 https://nodejs.org/）。
1. `npm install`。
2. `cp .env.example .env`，先維持 `GCAL_MOCK_MODE=true`。
   > 💡 學生不一定懂，建 `.env` 時跟他講這兩件事：
   > **(1) 為什麼要小心**：`.env` 會放你的密碼/金鑰（API token），不能外流；`.gitignore` 是一份「不上傳到 GitHub 的清單」。
   > **(2) 我們已經幫你做了**：`.env` 早就寫進 `.gitignore` 了，所以你建的這個檔永遠不會被上傳——你不用做任何設定，放心填。
3. 要接真實行事曆：`npm run cal:auth` → Google OAuth（token 寫回 `.env`）。
4. `.env` 設 `GCAL_MOCK_MODE=false`。
5. 之後用 [sync-calendar](../sync-calendar/SKILL.md)：說「同步本月行事曆」。

## 完成後
1. **先驗證再宣布完成**：跑 `bash Skills/check-aipm/scripts/check-aipm.sh`（或 `/check-aipm`），確認結構、安全閘、`.claude/skills` 鏡像都 ✅——**別只用嘴巴說「完成了」**。有 ❌ 就回去補。
2. 告訴使用者：設定完成，日常操作交給 6 大指令（見 `98_DOC/02-how-to-use.md`），有疑問直接問。
