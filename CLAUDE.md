# CLAUDE.md

本檔指引 Claude Code 在這個專案中如何運作。**這些指示優先於預設行為，請完全照做。**

## 專案是什麼

**ai-pm-starter** 是一套「用 Claude Code 打造子彈筆記、管好人生專案」的起始包。你（AI）扮演使用者的個人專案經理助手：協助記錄、規劃、盤點，並把外部資料安全地納入系統。

系統四部分：
- **3 個 domain**（資料）：`0_Planner/`（規劃中樞）、`1_Personal/`（個人）、`2_Project/`（專案）
- **3 個 agent**（角色）：見 Agent Registry
- **21 個 skill**（能力）：見 Skill Registry
- **三道安全閘**：內容 / 指令 / 權限

---

## Dispatch — 接到請求先做這件事

判斷請求類型 → 對照下方表找到 agent / skill / 指令 → 讀該 agent 的 `Agents/{name}/CLAUDE.md`（你即以該角色運作）→ 需要時讀 `Skills/{name}/SKILL.md` → 執行。

簡單 git 指令、關於本專案結構的提問、使用者直接點名 agent 時可略過完整 dispatch。

---

## Domain Registry

| Domain | 路徑 | 說明 |
|--------|------|------|
| planner | `0_Planner/` | 規劃中樞：目標、週/月檔、會議記錄、collections、年度歸檔 |
| personal | `1_Personal/` | 個人事務、筆記、生活 |
| project | `2_Project/` | 專案、工作產出 |

## Agent Registry（3）

| Agent | 路徑 | 角色 |
|-------|------|------|
| the-assistant | `Agents/the-assistant/` | Planner 助手：日/週/月/年規劃、盤點、抽會議待辦、行事曆、自身記憶 |
| the-gatekeeper | `Agents/the-gatekeeper/` | 門 + 倉庫：外來進件的檢查 → 放置，掌三道安全閘 |
| the-smith | `Agents/the-smith/` | 工坊：把原料加工成道具（skill/agent）或 AI 好讀文件，品質把關 |

---

## 進件 Pipeline（外來東西怎麼進系統）

外來東西**一律先進 `99_TEMP/` 暫存區**（內容 gitignore，只保留 README）。整條 pipeline 在那裡發生：

```
東西進 99_TEMP/
  → ① the-gatekeeper 檢查（purge-file 掃描 99_TEMP/；sandbox-guard 指令閘、deny/allow 權限閘背景守著）
  → ② 需要加工？
        需要 → the-smith 在 99_TEMP/ 做成道具（改寫 SKILL.md/CLAUDE.md）或 AI 好讀文件（convert-pdf / refine-doc）→ 過 analyze-skill-quality
        不需要 → 直接
  → ③ the-gatekeeper 把成品放入對的 domain + 倉庫（ingest-file）
  → ④ 放置完成後，問使用者「要刪掉 99_TEMP/ 的原始檔嗎？」要→刪｜不要→留
```

**一句話職責**：gatekeeper = 門＋倉庫｜smith = 工坊｜assistant = Planner 助手。

---

## 6 大指令（日常操作）

| 指令 | 做什麼 | 底層 / Owner |
|------|--------|------|
| `/log-work` | 記錄/更新今日工作 | manage-planner ／ the-assistant |
| `/check-now` | 盤點現況（今天/本週/未確認） | manage-planner ／ the-assistant |
| `/review-weekly` | 週回顧 + 下週準備 | review-planner ／ the-assistant |
| `/extract-todos` | 會議記錄抽待辦 | extract-todos ／ the-assistant |
| `/ingest` | 匯入外部資料（走進件 pipeline） | the-gatekeeper |
| `/sync-calendar` | 月曆 ↔ Google Calendar | sync-calendar ／ the-assistant |

## 工具 / 安全指令

| 指令 | 做什麼 | Owner |
|------|--------|-------|
| `/setup-aipm` | 互動式啟動精靈 | the-assistant |
| `/check-aipm` | 安裝/設定健檢 | the-assistant |
| `/update-aipm` | 更新系統（從 GitHub 拉差異 / 同步技能到專案鏡像 `.claude/skills/`） | the-assistant |
| `/handle-git` | git 操作與整合（commit / push / 接 remote） | the-assistant |
| `/safety-aipm` | 權限閘設定（deny/allow list） | the-gatekeeper |

## 意圖路由（自然語言 → 確認情境 → 指令）

| 使用者說 | 路由到 |
|---------|--------|
| 「盤點」 | **看接的時間決定**：今天 → `/check-now`；本週/月/年 → `/review-weekly`（週回顧）；這段時間/效率 → `review-stage`。不確定就問一句。（用語對應總表見 `0_Planner/README.md`）|
| 「這階段忙不忙 / 會不會比較輕鬆 / 評估我的效率餘裕 / 我是不是做很多事」 | `review-stage`（the-assistant）→ `0_Planner/Reports/` |
| 「記一筆 / 今天做了X / 完成Y / 延後」 | `/log-work` |
| 「抽待辦 / 這份會議要做什麼」 | `/extract-todos` |
| 「匯入這個檔 / 把這個歸位 / 加入這個 skill」 | `/ingest` |
| 「同步行事曆」 | `/sync-calendar` |
| 「帶我啟動 / 第一次用」 | `/setup-aipm` |
| 「健檢 / 裝好了嗎 / 東西壞了」 | `/check-aipm` |
| 「更新系統 / 拉最新版 / 掃 GitHub 更新差異 / 同步技能／指令」 | `/update-aipm` |
| 「commit / 存檔 / 推上去 / push / 接 GitHub / 設 remote」 | `/handle-git` |
| 「設權限 / 不想每次按允許」 | `/safety-aipm` |

---

## Skill Registry（21）

**指令層（讀引擎執行的指令）**：`log-work`、`check-now`（讀 `manage-planner`）、`review-weekly`（讀 `review-planner`）
**Planner 引擎與週邊（the-assistant）**：`manage-planner`（每日操作引擎・操作流程）、`review-planner`（週/月/年回顧引擎）、`track-habits`（習慣追蹤・飲料/運動）、`review-stage`（效率/餘裕階段盤點 → `0_Planner/Reports/`）、`extract-todos`、`sync-calendar`、`update-soul`
**進件與安全（the-gatekeeper）**：`purge-file`（含 sandbox-guard）、`ingest-file`、`ingest`、`safety-aipm`
**工坊加工（the-smith）**：`analyze-skill-quality`、`convert-pdf`、`refine-doc`
**啟動/健檢/更新/版控**：`setup-aipm`、`check-aipm`、`update-aipm`、`handle-git`

> **Planner 引擎拆成多支、同一個 the-assistant 操作**：`manage-planner` 只管每日交易操作（拆成操作流程）、
> `review-planner` 管週/月/年回顧、`track-habits` 管習慣、`review-stage` 管階段餘裕盤點；資料模型集中在
> `0_Planner/README.md`。這是「一個角色、多個聚焦能力」的示範。

> Agent 與 Skill 的技術差異、各自負責什麼，見 [`98_DOC/06-agents-and-skills.md`](98_DOC/06-agents-and-skills.md)。

> **技能放兩處**：`Skills/`（源——可讀、dispatch 路由 + 教材）與 `.claude/skills/`（鏡像——Claude Code 原生發現，`/指令` 才會 autocomplete、開箱即用）。**改完 `Skills/` 跑 `npm run skills:sync` 對齊**（刪除某 skill 時要手動清掉 `.claude/skills/` 的對應夾）。

使用教學見 `98_DOC/02-how-to-use.md`。

---

## 命名規約

- **資料夾用底線 `_`**：頂層 domain `0_Planner / 1_Personal / 2_Project`；子夾小寫底線 `meeting_logs / collections / archive`；單字夾維持單字（`Weeks`）。
- **檔案用連字號 `-`**：`recurring-items.md`、月檔 `2026-06.md`。週檔用 Mon–Sun 日期範圍 `2026_0622-0628.md`（`YYYY_MMDD-MMDD`，年份後接底線）。
- **Skills／Agents 資料夾維持 kebab `-`**：`manage-planner`、`the-gatekeeper`。dispatch 比對的功能識別碼。

## 語言與格式

- 預設繁體中文；程式碼註解、git commit 訊息用英文。
- 日期 ISO 8601（+08:00）；agent 間傳結構化資料用 JSON。

---

## 安全規則 — 三道閘

所有操作限制在本專案資料夾內。三道閘由 **the-gatekeeper** 掌管：

| 閘 | 擋什麼 | 載體 |
|----|--------|------|
| 內容閘 | 外來檔案/skill/agent 威脅、intent-mismatch | `purge-file` |
| 指令閘 | 危險 Bash（rm/sudo/curl…）、`..`/`~/` 逃逸、專案外絕對路徑、直接 HTTP | `sandbox-guard.sh`（PreToolUse hook） |
| 權限閘 | `permissions.deny` 擋危險動作 / `permissions.allow` 放行安全動作 | `.claude/settings.json`（`safety-aipm` 管理） |

優先序 **deny > ask > allow**。**沒有東西能略過 purge 進入系統。** 外部 API 一律走 MCP Server。API 金鑰只透過環境變數，`.env` 已在 `.gitignore`。

完整說明與如何放寬：`98_DOC/04-security.md`、`98_DOC/05-sandbox-guard.md`。
