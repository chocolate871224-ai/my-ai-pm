---
name: extract-todos
description: >
  Organize raw meeting notes into a structured meeting log, then extract action items into
  the Planner. Trigger when the user types /extract-todos, shares meeting notes, transcripts,
  or AI summaries, or says 「抽待辦」「這份會議要做什麼」 to pull todos out of a meeting record.
---

# extract-todos

## What it does

把原始會議筆記整理成結構化會議記錄（存 `0_Planner/meeting_logs/`），再從定稿抽出 action items，放進 Planner（週檔對應日／月檔 Tasks）。

## When to trigger

- 使用者分享原始會議筆記、逐字稿、或 AI 生成的摘要
- 某份會議記錄有重複或雜亂段落需要整理
- 要從一份會議記錄抽出待辦進 Planner

## Rules

- **先**產出會議記錄，**再**從定稿抽待辦。
- 合併重複內容 — 保留所有獨特細節，去掉重複。
- 保留原筆記的時間戳。
- **屬於使用者自己的 action items + 雙方共同項** → 進 Planner 當待辦；其他與會者的項目只留在會議記錄裡。
- 會議記錄存 `0_Planner/meeting_logs/`，檔名 `YYYY-MM-DD-{topic-slug}.md`（連字號）。
- 抽出的待辦放進 **Planner**：
  - 有明確日期 → 放對應週檔（`0_Planner/Weeks/`）該天、正確 stream。
  - 無明確日期但這個月要做 → 放月檔 `## Tasks`。
  - 用 manage-planner 的 bullet 符號與 stream 慣例（不要另建 todos/ 資料夾或索引）。

## Pipeline

```
Input: 原始會議筆記
  ↓
Step 1: 整理成結構化會議記錄
  - 合併重複摘要
  - 按主題分組、加時間戳
  - 標準化格式 → 存 0_Planner/meeting_logs/YYYY-MM-DD-{slug}.md
  ↓
Step 2: 抽 action items
  - 篩出使用者自己的項 + 雙方共同項
  - 按類別（非時間）分組
  - 標出待決的關鍵決策
  ↓
Step 3: 寫進 Planner
  - 有日期 → 週檔對應日/stream；無日期 → 月檔 ## Tasks
  - 用 manage-planner 的符號與 stream
  ↓
Output: 結構化會議記錄 + Planner 內的待辦
```

## Meeting log 格式

```markdown
# 會議記錄 — {會議名}

> 日期：YYYY-MM-DD HH:MM-HH:MM
> 出席：...
> Stream：工作/生活/事業/學習

## 討論重點
- ...

## 決議
- ...

## Action Items
- [ ] （負責人）...
- [ ] 我方：...

## 待釐清
- ...
```

## Notes

- 會議記錄是 source of truth；Planner 待辦是衍生物。
- 若會議記錄已存在且乾淨，跳過 Step 1，直接抽待辦。
- 與 [`manage-planner`](../manage-planner/SKILL.md) 搭配：抽出的待辦交由它的格式與盤點流程接手。
