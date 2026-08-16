# 99 · 完成確認 Checklist（走一遍，確認你都會了）

讀完前面的教材後，照這份**從頭實際做一遍**——不是用看的，是真的動手。
任何一項卡住，回 [00-how-to-learn](00-how-to-learn.md) 的做法：**直接問 AI、真的看不懂就截圖丟給它**。

> 標 **（選配）** 的兩大模組（A 雲端同步 / B 行事曆）不做也能用核心；要用就照該區塊走完設定。

## A. 裝好了嗎
- [ ] git、VSCode、**Claude Code 外掛**、付費方案都就緒
- [ ] 用 VSCode 開了這個資料夾，Claude Code 面板能跟你對話

## B. 啟動
- [ ] 跑過 `/setup-aipm`：自訂了 stream、設了每日 tracker 起算日、設了權限、開了第一筆日誌
- [ ] `/check-aipm` 健檢通過（選配模組沒設會顯示 ⚠️，那不是錯誤）

## C. 日常會用（核心指令）
- [ ] `/log-work`：用講的記一筆 → 進了當週檔、stream 正確
- [ ] 「盤點」→ `/check-now`：看得到今天 / 本週
- [ ] `/review-weekly`：做過一次週回顧，未完成項自動 migrate 到下週
- [ ] `/extract-todos`：丟一段會議筆記 → 存成會議記錄 + 抽出**你的**待辦
- [ ] 丟個檔到 `99_TEMP/` → `/ingest`：掃描 → 放進對的資料夾 → 問你要不要刪原始檔

## D. 安全你懂了嗎
- [ ] 試著叫 AI「刪掉某個檔」→ 它被**擋下**（指令閘 sandbox-guard）
- [ ] 知道 AI 改檔 / 跑指令前會跳「確認」——**你看過才放行**；`git` 也會問你
- [ ] 知道 `.env`（放密碼/金鑰）**不會上傳**——已在 `.gitignore`
- [ ] （選配）`/safety-aipm` 看過 deny / allow 設定

## E.（選配）模組 A — 雲端同步 / 備份到 GitHub
> 把你的 Planner 備份到雲端、多裝置同步。⚠️ repo **務必設 Private**（這是你的人生資料）。細節見 [`/handle-git`](../Skills/handle-git/SKILL.md)。
- [ ] 在 GitHub 建好一個 **Private** repo
- [ ] 接上 remote（**HTTPS 最省事**）：`git remote add origin https://github.com/<你的帳號>/<repo>.git`
- [ ] 首次推送：`git push -u origin main` → 用 **Personal Access Token 當密碼** 登入成功
- [ ] 之後說「commit 並 push 今天的變更」→ `/handle-git` 幫你備份
- [ ] 確認 GitHub 上**看不到 `.env`**（只有 `.env.example`）

## F.（選配）模組 B — Google 行事曆同步
> 月檔 ↔ Google Calendar。需 **Node.js 18+**。完整逐步（OAuth）見 [`03-google-calendar-setup.md`](03-google-calendar-setup.md)。
- [ ] 裝了 **Node.js 18+**
- [ ] `npm install`（裝相依套件）
- [ ] `cp .env.example .env`（AI 會提醒：`.env` 放金鑰、已 gitignore、不會上傳）
- [ ] **先測 mock**：`GCAL_MOCK_MODE=true` 時 `/sync-calendar` 能跑（不連網）
- [ ] 接真實：`npm run cal:auth` → Google 授權 → refresh token 自動寫回 `.env`
- [ ] `.env` 設 `GCAL_MOCK_MODE=false` → `/sync-calendar` 真的同步到你的 Google Calendar

---

**A–D 全打勾 = 核心你已經會用了 🎉** E、F 要用再補。之後就是每天 `/log-work`、週末 `/review-weekly`。
