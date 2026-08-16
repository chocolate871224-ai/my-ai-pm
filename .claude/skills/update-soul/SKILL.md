---
name: update-soul
description: >
  Append learnings about how the agent/skill handles its work better — effective
  approaches, patterns, and mistakes — to an agent's SOUL.md. Trigger at the end of
  any substantive agent session.
---

# update-soul

## What it does

把一場 session 學到「這個 agent/skill 怎麼把工作處理得更好」的東西（有效做法、運作模式、犯過的錯）append 到該 agent 的 SOUL.md。

## When to trigger

- 任何實質性的 agent session 結束時
- 發現值得記住的有效做法、運作模式或踩過的坑時

## Rules

- **Append-only** — 絕不覆蓋 SOUL.md 既有內容
- 條目簡潔、可執行
- 含日期與 session 脈絡
- SOUL.md 超過 ~200 行時，把較舊條目歸檔
- 絕不加重複條目 — 先查有沒有重複

## Input

- Agent 名稱（決定更新哪個 SOUL.md）
- Session 摘要：發生什麼、做了什麼決定、學到什麼

## Output

SOUL.md 內 append 的條目：
```markdown
## {YYYY-MM-DD} — {session summary}

- **Task**: {做了什麼}
- **Learnings**: {怎麼把工作處理得更好：有效做法、運作模式、犯過的錯}
- **Follow-up**: {下一步做什麼}
```
