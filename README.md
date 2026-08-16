# ai-pm-starter

> 用 **Claude Code** 打造你的子彈筆記，把人生當專案來管。

一套可直接部署的個人專案管理起始包。裝好 Claude Code（VSCode 外掛）、開這個資料夾，你就有一個會幫你**記錄、規劃、盤點**的 AI 專案經理助手——用對話寫日誌、排週計畫、追目標、把會議筆記變成待辦。

**核心是純 markdown、零 Node、純本機。** 雲端備份與 Google Calendar 同步是可選模組。

---

## 這是什麼

把子彈筆記（Bullet Journal）的精神——快速記錄、定期遷移、刻意取捨——交給 AI 操作。你用自然語言講，AI 依固定慣例把它寫進結構化 markdown；資料永遠是純文字、在你自己電腦上。

系統四部分：

| 部分 | 是什麼 |
|------|--------|
| **3 個 domain** | 你的資料：`0_Planner/`（規劃中樞）、`1_Personal/`（個人）、`2_Project/`（專案） |
| **3 個 agent** | AI 角色：the-assistant（助手）、the-gatekeeper（守門人）、the-smith（工坊） |
| **21 個 skill** | 能力：6 大日常指令 + Planner 引擎群 + 進件/安全 + 工坊加工 + 啟動/健檢/更新/版控 |
| **三道安全閘** | 內容 / 指令 / 權限，把操作鎖在專案內 |

---

## 前置作業

### 核心軌（必做）

| 工具 | 用途 |
|------|------|
| **git** | 本機版本控制 |
| **VSCode** | 編輯器 |
| **Claude Code 外掛** | AI 助手本體（VSCode 擴充市集搜「Claude Code」） |
| **付費 Claude 方案** | Claude Code 需付費 |

**外掛 vs CLI**：VSCode 外掛**內建一份 CLI 給聊天面板** → 裝外掛就能用，**不必另裝 CLI、不需要 Node**。想在終端機打 `claude` 才需另裝獨立 CLI（原生安裝、免 Node）。

**付費**：需 Claude **Pro / Max / Team / Enterprise** 或 **Console（API）** credits。⚠️ **免費 claude.ai 不含 Claude Code。**

### 選配模組另需
- **模組 A（雲端同步）**：GitHub 帳號（免費）。
- **模組 B（行事曆同步）**：Node.js 18+。

---

## 啟動

> 🔰 **第一次用、怕看不懂?** 先讀 [98_DOC/00-how-to-learn.md](98_DOC/00-how-to-learn.md)——看不懂就問 AI、卡住就截圖丟給它。

最快是讓 AI 帶你走：開 Claude Code 外掛面板，說

> 請閱讀 README.md，一步一步帶我啟動這個專案。

或直接 `/setup-aipm` 觸發啟動精靈。它會帶你完成核心軌（確認環境 → 自訂 stream → 設每日追蹤 → 設權限 → 開第一筆日誌），再問要不要做選配模組。逐步腳本的單一真實來源在 [`Skills/setup-aipm/SKILL.md`](Skills/setup-aipm/SKILL.md)。

完整安裝說明（工具下載、選配模組）見 [98_DOC/01-install.md](98_DOC/01-install.md)。

---

## 進件 Pipeline（外來東西怎麼進系統）

外來東西**先丟進 `99_TEMP/` 暫存區**（內容不進 git），檢查→加工→放置都在那裡發生：

```
東西進 99_TEMP/
  → ① the-gatekeeper 檢查（內容閘；指令/權限閘背景守著）
  → ② 需要加工？
        要 → the-smith 做成道具（skill/agent）或 AI 好讀文件（convert-pdf / refine-doc）→ 過品質閘
        不要 → 直接
  → ③ the-gatekeeper 把成品放入對的 domain + 倉庫
  → ④ 放置完成後，問你要不要刪掉 99_TEMP/ 的原始檔
```

一句話職責：**gatekeeper = 門＋倉庫｜smith = 工坊｜assistant = Planner 助手**。

---

## 6 大指令（日常）

| 指令 | 用途 |
|------|------|
| `/log-work` | 記錄/更新今日工作（記一筆、開日誌、回報完成/延後） |
| `/check-now` | 盤點現況（今天/本週/未確認）；說「盤點」也會進來 |
| `/review-weekly` | 週回顧 + 下週準備 |
| `/extract-todos` | 會議記錄抽待辦 |
| `/ingest` | 匯入外部資料（走進件 pipeline） |
| `/sync-calendar` | 月曆 ↔ Google Calendar（模組 B） |

工具/安全：`/setup-aipm`（啟動精靈）、`/check-aipm`（健檢）、`/update-aipm`（更新系統）、`/safety-aipm`（權限設定）。

完整使用情境與範例對話見 **[98_DOC/02-how-to-use.md](98_DOC/02-how-to-use.md)**。

---

## 模組

- **核心（純本機）**：規劃中樞 + AI 助手。零 Node、零帳號、純 markdown。
- **模組 A — 雲端同步/備份（GitHub）**：連私人 repo，多裝置同步。⚠️ repo 務必 Private。
- **模組 B — Google Calendar（Node）**：月檔 ↔ Google Calendar；預設 mock，`npm run cal:auth` 後接真實。完整設定見 [98_DOC/03-google-calendar-setup.md](98_DOC/03-google-calendar-setup.md)。

---

## 3 個 Agent

| Agent | 角色 | 做什麼 |
|-------|------|--------|
| **the-assistant** | Planner 助手 | 日/週/月/年規劃、盤點、追目標、效率/餘裕盤點、抽會議待辦、行事曆、自身記憶 |
| **the-gatekeeper** | 門 + 倉庫 | 外來進件的檢查 → 放置；掌三道安全閘 |
| **the-smith** | 工坊 | 把原料加工成道具（skill/agent）或 AI 好讀文件；品質把關 |

## 21 個 Skill

| 群組 | Skills |
|------|--------|
| 指令層（薄） | `log-work`、`check-now`（讀 `manage-planner`）、`review-weekly`（讀 `review-planner`） |
| Planner 引擎與週邊 | `manage-planner`（每日操作）、`review-planner`（週/月/年回顧）、`track-habits`（習慣）、`review-stage`（效率/餘裕盤點）、`extract-todos`、`sync-calendar`、`update-soul` |
| 進件與安全 | `purge-file`、`ingest-file`、`ingest`、`safety-aipm` |
| 工坊加工 | `analyze-skill-quality`、`convert-pdf`、`refine-doc` |
| 啟動/健檢/更新/版控 | `setup-aipm`、`check-aipm`、`update-aipm`、`handle-git` |

---

## Planner 概念（速覽）

- **四條 stream**：工作 / 生活 / 事業 / 學習（可在 `0_Planner/README.md` 自訂）
- **子彈符號**：`[ ]` 待辦　`[x]` 完成　`[>]` 順延　`[<]` 排程　`[o]` 事件　`[~]` 部分　`~~刪除線~~` 取消
- **兩種突發**：`*` 臨時殺入（被動）、`+` 臨時衝刺（主動）
- **每日追蹤**：內建「飲料」tracker 示範，可換（先設起算日）
- **時間層級**：年（goals）→ 月 → 週；年底做**年度盤點**
- **兩條軸**：時間軸（年→月→週，何時做）＋ 主題軸（`Collections/`，管長期專案）；階段性效率/餘裕盤點另存 `Reports/`

完整規格見 [0_Planner/README.md](0_Planner/README.md)。

---

## 安全與權限：三道閘

| 閘 | 擋什麼 | 載體 |
|----|--------|------|
| 內容閘 | 外來檔案/skill/agent 威脅 | `purge-file` |
| 指令閘 | 危險 Bash、逃出專案、直接 HTTP | `sandbox-guard.sh`（hook） |
| 權限閘 | 危險動作（deny）/ 安全動作（allow） | `.claude/settings.json` + `/safety-aipm` |

優先序 **deny > ask > allow**。逐次權限確認是正常的（第一道防線），sandbox-guard 是後盾。
細節與如何放寬：[98_DOC/04-security.md](98_DOC/04-security.md)、[98_DOC/05-sandbox-guard.md](98_DOC/05-sandbox-guard.md)。

## 注意事項

- **付費**：開工前備妥付費方案或 API credits（免費 claude.ai 不行）。
- **隱私**：雲端同步時 repo 一定設 Private——這是你的人生資料。
- **權限提問正常**：別嫌煩，那是第一道防線。

## 授權

MIT。拿去改成你自己的系統。
