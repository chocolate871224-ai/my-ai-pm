# CHANGELOG — ai-pm-starter

> 本檔記錄 **整體功能版本釋出**——每次手動、對使用者有感的功能升級。
> 有別於 git commit 的逐筆技術變更；這裡只寫「這個版本讓使用者多了什麼能力」。
> 最新在上。

---

## 2026-07-25 — Planner 引擎拆分（一角色、多聚焦能力）

原本一支大而全的 `manage-planner` 引擎，拆成數支各自聚焦、都由同一個 the-assistant 操作。每支更好讀、好維護。

- **拆分**：
  - `manage-planner` — 只管**每日交易操作**（盤點／標記完成／新增／延遲・等外部），拆成明確操作流程。
  - `review-planner`（新）— **週/月/年回顧引擎**，內含三層共用的報告規則。`/review-weekly` 改讀這支。
  - `track-habits`（新）— **習慣追蹤**（飲料／運動範例，可自訂），被盤點收尾與週/月統計呼叫。
  - `review-stage`（新）— **效率／餘裕／忙碌的階段盤點**（季末・半年・轉折點才做的深度回顧），產出報告到新資料夾 `0_Planner/Reports/`。
- **資料模型單一真實來源**：所有格式／慣例集中到 `0_Planner/README.md`；引擎只負責「怎麼操作」，不再各自重複定義格式。
- **用語對應表**（`0_Planner/README.md`）：一句話＝動作×情境×時間，**「時間」決定用哪支**——盤點今天 → `manage-planner`；本週/月/年 → `review-planner`；這段時間/效率 → `review-stage`。
- **工具**：技能同步從「同步到 user level（跨專案）」改為**專案層鏡像 `.claude/skills/`**——本包所有技能只留在專案層、跟著資料夾走、換專案不共用。`/setup-aipm` 啟動時與 `/check-aipm` 發現鏡像缺項時都會自動補齊。
- Skill 數 **18 → 21**。

---

## 2026-07-18 — Collections 分類制度

主題軸（Collections）從「靜態清單」升級為「可管理的專案視圖」。

- **兩軸模型**：時間軸（goals→月→週，答「何時做」）× 主題軸（Collections，答「什麼屬於一起」）。兩軸對照，長期專案不再散落各週、半途爛尾。
- **命名／狀態慣例**（從檔名／位置一眼看出狀態）：
  - `_` 前綴 ＝ 持續性（清單、暫存）
  - 一般檔名 ＝ 進行中專案
  - `Collections/Done/` ＝ 完成歸檔
- **`_inbox` 暫存區**：未成形構想的落腳處；成熟後升格為具名 collection。
- **命名紀律**：正式 collection 必須有明確主題名稱（模糊分類名不合格）。
- **文件**：設計原理與用法寫入 `0_Planner/Collections/README.md` 與 `0_Planner/README.md`。

---

## 基礎摘要（Collections 之前的既有功能）

此為 changelog 起點，摘要當時已具備的整體功能。

**Planner 規劃中樞**
- 時間層級：`goals.md`（年＋Future Log）→ 月檔 → `Weeks/`（週誌）；四條可自訂 stream。
- 格式：bullet 符號（任務／完成／順延／future log／事件／取消）、任務 tag、父任務＋checklist、Weekly／Monthly 分工。

**六大核心工作流**
1. 盤點掌握進度（定期狀態盤點）
2. 設定當月目標（ask the why）
3. 每日 Rapid Logging（mental inventory）
4. 行事曆同步（Google Calendar；scheduled／future log）
5. 定期統計盤點（週回顧＋下週準備，量化＋敘述）
6. ingest 擷取外部資料 → 收編成 collections 合輯

**其他機制**
- 完成回報 ＋ migration（未完成順延）。
- 會議流程：排會 → 列印／簽到 → 記錄 → 整理進 `meeting_logs/`（extract-todos 抽待辦）。
- 年度盤點：歸檔舊年度、結轉 goals。
- 自訂每日 tracker（習慣追蹤，起算日通則）。
- Agents ＋ Skills 架構；6 大指令；三道安全閘（含 sandbox-guard）。
