---
name: ingest-file
description: >
  Place cleared external content into the right home — classify files into domains
  (0_Planner / 1_Personal / 2_Project) and install external skills/agents into Skills/ and Agents/.
  Trigger after purge-file returns clean.
---

# ingest-file

## What it does

把**通過安全掃描**的外來內容放到正確的家。兩種情況：

1. **一般檔案** → 分類進 domain：`0_Planner/`、`1_Personal/`、`2_Project/`。
2. **外部 skill / agent** → 安裝進 `Skills/`、`Agents/`，拆成正確的資料夾結構。

## When to trigger

- purge-file 產出 "clean" clearance report 之後
- the-gatekeeper 呼叫此 skill 做放置

## Hard rule

- 來源在 `99_TEMP/` 暫存區，**只**處理有 purge-file 有效 clearance report 的檔案。沒過掃描的不碰。
- 分類信心低時，先問使用者再放。
- 保留原檔名，除非撞名。
- 所有放置記到 `data/logs/`。
- **放置完成後**，問使用者要不要刪掉 `99_TEMP/` 的原始檔（成品已在系統內）。未確認前不刪。

## 情況 1：一般檔案 → domain 分類

| 分類 | 放哪 | 判準 |
|------|------|------|
| 規劃／待辦／目標／會議相關 | `0_Planner/`（會議記錄進 `0_Planner/meeting_logs/`） | 與時間排程、任務追蹤有關 |
| 個人事務／筆記／生活 | `1_Personal/` | 不隨週月流動的個人長期內容 |
| 專案內容／工作產出 | `2_Project/{專案名}/` | 屬於某個進行中的專案 |

PDF 先用 [`convert-pdf`](../convert-pdf/SKILL.md) 轉成 Markdown 再分類。

## 情況 2：外部 skill / agent → 安裝

判斷外來內容是 skill 還是 agent：

- **Skill**（有 `SKILL.md`，或是一組執行某能力的腳本）→ 放進 `Skills/{verb-noun}/`，補齊標準結構：
  ```
  Skills/{verb-noun}/
  ├── SKILL.md          # 能力、何時觸發、規則
  ├── scripts/          # 可執行腳本（如有）
  ├── examples/         # 範例輸入/輸出（如有）
  └── references/       # 規格/文件（如有）
  ```
  名稱用 `verb-noun` kebab-case。安裝後交給 [`analyze-skill-quality`](../analyze-skill-quality/SKILL.md) 評分（見 the-smith 的強制管線）。

- **Agent**（有 `CLAUDE.md`／角色定義）→ 放進 `Agents/{agent-name}/`：
  ```
  Agents/{agent-name}/
  ├── CLAUDE.md         # 靜態身分：是誰、規則、用哪些 skill
  └── SOUL.md           # 動態記憶（新 agent 給最小起始版）
  ```
  role 型 agent 用 `the-` 前綴。

安裝 skill/agent **必須先過 purge-file 的 intent-mismatch 檢查**（確認宣稱用途 vs 實際行為一致）。

## 放置後：清理暫存

成品落到 domain / `Skills/` / `Agents/` 後，**問使用者**：

> 「已放到 `{destination}`。要刪掉 `99_TEMP/` 的原始檔嗎？」

- 要 → 刪除 `99_TEMP/` 的對應原料，`temp_cleanup: "deleted"`。
- 不要 → 留著，提醒這是暫存非長期倉庫，`temp_cleanup: "kept"`。
- 未回覆 → `temp_cleanup: "pending"`，不刪。

## Input

- 已清關檔案的路徑（位於 `99_TEMP/`）
- purge-file 的 clearance report

## Output

Placement report（JSON）：
```json
{
  "ingest_id": "ingest_{YYYYMMDD}_{sequence}",
  "source": "99_TEMP/path/to/item",
  "kind": "file|skill|agent",
  "destination": "0_Planner|1_Personal|2_Project|Skills/...|Agents/...",
  "confidence": "high|medium|low",
  "temp_cleanup": "deleted|kept|pending",
  "timestamp": "ISO 8601"
}
```
