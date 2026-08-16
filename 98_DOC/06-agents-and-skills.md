# Agent 與 Skill：技術說明

這份說明 **Agent** 和 **Skill** 是什麼、差在哪、各自負責什麼，以及 Claude Code 怎麼讀它們。

---

## 一句話分辨

| | Agent（角色） | Skill（能力） |
|--|--------------|--------------|
| 是什麼 | **「誰」**在做事——一個有身分、職責、規則的角色 | **「會做什麼／怎麼做」**——一個可重用的能力／動作 |
| 檔案 | `Agents/{name}/CLAUDE.md` + `SOUL.md` | `Skills/{verb-noun}/SKILL.md`（+ `scripts/` `references/` `examples/`） |
| 類比 | 員工 | 員工會的技能 |
| 觸發 | 接到對應領域的工作時「扮演」這個角色 | 由 description 關鍵字或 `/skill-name` 觸發 |

> 角色（Agent）會**使用**能力（Skill）。一個 Skill 可被多個 Agent 共用（例如 `update-soul`）。

---

## Agent（角色）

一個 Agent 是一個 `Agents/{name}/` 資料夾，內含：

- **`CLAUDE.md`（靜態身分）**：
  - **Identity / Mission**：這個角色是誰、負責什麼
  - **Skills Used**：它會用哪些 skill
  - **Rules / Pipeline**：它做事的規則與流程
- **`SOUL.md`（動態記憶）**：用 `update-soul` 把每次學到的東西 append 進去（append-only）。

Claude Code 接到某領域的請求時，讀對應 Agent 的 `CLAUDE.md`，**以該角色的身分**運作（規則、語氣、可用能力都照它）。

## Skill（能力）

一個 Skill 是一個 `Skills/{verb-noun}/` 資料夾，核心是 **`SKILL.md`**：

- **YAML frontmatter**：`name` + `description`（description 內含**觸發語**，決定何時被叫用）
- **本體**：做什麼、何時觸發、規則（DO/DO NOT）、Input/Output
- 視需要：`scripts/`（可執行腳本／MCP server）、`references/`（規格、對應表）、`examples/`

命名：`verb-noun`（動詞-名詞，小寫連字號）。觸發方式：使用者打 `/skill-name`，或說出 description 裡的觸發語。

### 兩種 Skill 形態
- **薄指令（shim）**：很短，讀某個「引擎 skill」後執行（例：`log-work`、`check-now` 讀 `manage-planner` 引擎；`review-weekly` 讀 `review-planner` 引擎）。
- **引擎／完整能力**：完整邏輯（例：`manage-planner`、`review-planner`、`sync-calendar`、`purge-file`）。

> **一個角色可以有多個聚焦的引擎。** Planner 就拆成四支、都由 `the-assistant` 操作：
> `manage-planner`（每日操作）、`review-planner`（週/月/年回顧）、`track-habits`（習慣追蹤）、
> `review-stage`（效率/餘裕的階段盤點）。資料格式集中在 `0_Planner/README.md`，引擎只負責「怎麼操作」。
> 這樣每支都好讀、好維護——比一個大而全的 skill 清楚。

---

## CLAUDE.md 怎麼運作（dispatch 的大腦）

`CLAUDE.md` 是 Claude Code **一進專案就自動載入的唯一檔案**——它一直在 AI 的記憶裡。裡面有兩樣東西：**專案規則** + **Dispatch 路由表**。

你開口（或打 `/指令`）時，AI 先看 CLAUDE.md：判斷這是什麼工作 → 對照路由表找到負責的 **agent / skill** → **臨場去讀** `Agents/{名}/CLAUDE.md`（扮演那個角色）和 `Skills/{名}/SKILL.md`（照那份步驟做）→ 執行。

換句話說：**CLAUDE.md 是入口與總機**，其他檔案是「用到才翻開」的工具書。就算某個技能沒被原生註冊，AI 也能靠 CLAUDE.md 找到它、讀它、執行它。

## 技能的兩種運作機制（本專案兩者都用）

同一份 `SKILL.md`，有兩條被叫用的路：

| | 機制 A — dispatch | 機制 B — 原生 `.claude/skills/` |
|---|---|---|
| 怎麼被叫 | AI 讀 CLAUDE.md 路由 → 臨場讀 `Skills/{名}/SKILL.md` → 執行 | Claude Code **自動發現**；打 `/` 有 autocomplete、注入完整內容 |
| 觸發 | 靠 AI 判斷你的意圖（**自然語言**最順） | **確定觸發**（你選了 `/指令` 就跑那份） |
| 源頭 | `Skills/`（頂層、看得到、**就是教材本身**） | `.claude/skills/`（鏡像，藏在設定夾） |

**本專案刻意兩者都留**：
- `Skills/` ＝ **唯一真實來源** + dispatch 路由目標 + 給你讀的教材。
- `.claude/skills/` ＝ **鏡像**，讓 `/log-work` 這類指令在 `/` 選單裡真的點得到、clone 下來開箱即用。

> ⚠️ 因為是兩份：**改完 `Skills/` 要跑 `npm run skills:sync`** 把鏡像對齊；刪掉某個 skill 時，記得手動清掉 `.claude/skills/` 裡對應的資料夾。

---

## Claude Code 怎麼讀到它們：`.claude` 的兩層

- **Project level（專案層）**：本專案資料夾內的 `.claude/`、`Skills/`、`Agents/` → **只在這個專案生效**。你下載的這套就是 project level。
- **User level（使用者層）**：`~/.claude/`（家目錄）→ 所有專案共用。這是 Claude Code 本身的機制，但**本包刻意不用它**——ai-pm-starter 的所有技能都留在專案層，跟著這個資料夾走、換專案不共用，保持乾淨單純。

更新／同步見 [`update-aipm`](../Skills/update-aipm/SKILL.md)；安全相關見 [04-security.md](04-security.md)。

---

## 本包的分工

### 3 個 Agent
| Agent | 角色 | 負責 | 用的 Skill |
|-------|------|------|-----------|
| **the-assistant** | Planner 助手 | 日常規劃：記錄、盤點、回顧、目標、行事曆；效率/餘裕盤點；啟動與健檢；版控；自身記憶 | manage-planner、review-planner、track-habits、review-stage、log-work、check-now、review-weekly、extract-todos、sync-calendar、setup-aipm、check-aipm、update-aipm、handle-git、update-soul |
| **the-gatekeeper** | 門 + 倉庫 | 外來進件的檢查 → 放置；三道安全閘 | purge-file（含 sandbox-guard）、ingest-file、ingest、safety-aipm |
| **the-smith** | 工坊 | 把原料加工成道具（skill/agent）或 AI 好讀文件；品質把關 | analyze-skill-quality、convert-pdf、refine-doc、update-soul |

### 進件 Pipeline（三者怎麼協作）
```
東西進 99_TEMP/ → the-gatekeeper 檢查 →（需要才）the-smith 加工 → the-gatekeeper 放進對的 domain/倉庫 → 問要不要刪 99_TEMP/ 原始檔
```
（`99_TEMP/` 是進件暫存區，內容 gitignore、只保留 README。）

### 資料層（Agent 操作的對象，不是角色）
`0_Planner/`（規劃中樞）、`1_Personal/`（個人）、`2_Project/`（專案）——這些是**資料**，沒有 CLAUDE.md，不是角色。