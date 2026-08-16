---
name: handle-git
description: >
  日常 git 操作與「git 怎麼整合在一起」的指南。當使用者說「commit」「存個檔」「推上去」
  「push / pull」「開分支」「接 GitHub」「設 remote」「版本控制」「checkpoint」時觸發。
  只涵蓋會用到的那幾個指令，並把接 remote、拉系統更新、安全閘串成一張整合地圖。
  預設繁體中文，回應跟隨使用者語言。
---

# handle-git

> Owned by **the-assistant**（系統生命週期：setup / check / update / 版控）。動到 git，依權限閘逐次確認。

## What it does

包住日常會用到的少數 git 指令，套上一致的提交慣例；並說明這個專案**怎麼跟 git 整合**（接 remote、拉系統更新、三道閘怎麼影響 git）。不重造輪子——整合的設定步驟指向既有 skill。

## When to trigger

- 「commit / 存檔 / checkpoint」、「push / 推上去」、「pull / 拉下來」、「開分支」
- 「接 GitHub / 設 remote / 雲端同步」、「版本控制怎麼用」

## 日常指令（會用到的就這幾個）

| 想做什麼 | 指令 |
|---------|------|
| 看現在狀態 | `git status` |
| 看改了什麼 | `git diff`（已 add 的加 `--staged`） |
| 加入要提交的檔 | `git add <檔>`（全部 `git add -A`） |
| 提交 | `git commit -m "..."`（訊息用**英文**） |
| 推到遠端 | `git push` |
| 拉遠端更新 | `git pull` |
| 開新分支 | `git switch -c <branch>` |

## 提交策略（分批、原子化）

- **一個邏輯變更一個 commit**：不同目的的改動分開提交，歷史才讀得懂、可回溯（bisect）。
- **改動跨很多檔 → 分批 commit**：依「概念」分組（例：先「週檔格式」一批、再「文件重整」一批、再「新 skill」一批），逐批提交，每批一句清楚的**英文**訊息。
- 跨概念的共用檔（如 `CLAUDE.md`、`README.md`）若同時被多批改到，無法用 `git add <檔>` 拆開 → 併入最相關的那一批，並在訊息說明。
- 只在使用者要求時才 commit / push——**不自動推**。
- 個人單人 repo 直接 commit 到 `main` 即可；要做實驗性大改再開分支。

## 安全（三道閘怎麼影響 git）

- 危險 git 動作（`reset --hard`、`clean`、force push）已被**權限閘 deny**——這是設計，別繞道。
- 指令閘 `sandbox-guard` 擋掉 `rm`（含 `git rm`）等危險 Bash；**要刪檔請在編輯器手動刪，別用 mv 搬到專案外當刪除**。詳見 [`98_DOC/04-security.md`](../../98_DOC/04-security.md)、[`98_DOC/05-sandbox-guard.md`](../../98_DOC/05-sandbox-guard.md)。
- ⚠️ **commit 訊息別寫到被封鎖的字**：指令閘掃整條 Bash 指令字串，所以 `git commit -m "..."` 的訊息若含 `rm`、`ssh`、`sudo`、`curl`、`eval` 等被擋字詞，**整條 commit 會被擋下**。換句話描述即可（例：「blocks deletion」而非「blocks rm」、「key-based」而非「ssh」）。

## git 整合地圖（怎麼串在一起）

| 我要 | 去哪 |
|------|------|
| **第一次接上自己的 GitHub remote** | 見下方步驟 |
| 雲端同步 / 多裝置備份（模組 A） | [`setup-aipm`](../setup-aipm/SKILL.md) 模組 A 會帶（建 Private repo → 接 remote → 首推） |
| 拉「課程系統」最新差異 | [`update-aipm`](../update-aipm/SKILL.md)（`git fetch` → 看差異 → 合併，不碰個人資料） |
| 哪些檔不進 git / 三道閘 | [`98_DOC/04-security.md`](../../98_DOC/04-security.md)、`.gitignore` |

### 接上自己的 GitHub remote（一次性，**你自己在終端機做**）

前置：GitHub 帳號、已建好一個 **Private** repo（⚠️ 這是你的人生資料，務必 Private）。

> ⚠️ **這幾步請使用者自己在 VSCode 終端機（Ctrl + `）貼上、執行**——**別只叫 AI 跑**。實測 AI 處理 git 認證常常不順（例如它聽不懂「改用 HTTPS」），自己貼最穩。把網址換成你自己的。

**用 HTTPS（最省事，不必設金鑰）：**

```bash
git remote add origin https://github.com/<你的帳號>/ai-pm-starter.git
git branch -M main
git push -u origin main
```

首推會要你登入 GitHub：跳**瀏覽器授權**登入，或要你貼 **Personal Access Token 當密碼**（不是帳號登入密碼）。

**推不上去 / 出現 `Permission denied (publickey)`？**（多半是之前用了 SSH 網址）把網址改成 HTTPS 再推：

```bash
git remote set-url origin https://github.com/<你的帳號>/ai-pm-starter.git
git push -u origin main
```

**進階（已設好 SSH 金鑰才用）：** 用 `git@github.com:<你的帳號>/ai-pm-starter.git`；沒把公鑰加到 GitHub 會 `Permission denied (publickey)`。

> 接上後，日常就是 `git add` → `git commit` → `git push`；拉系統更新走 `/update-aipm`。

## Output

簡短回報：做了哪個 git 動作、結果（commit hash / 推到哪 / 狀態），並以一個具體的下一步收尾。
