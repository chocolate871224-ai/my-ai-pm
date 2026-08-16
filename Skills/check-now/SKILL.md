---
name: check-now
description: >
  盤點現況的指令。當使用者輸入 /check-now，或說「盤點」「盤點今天」「盤點一下」
  「現在有什麼」「還有什麼沒做」時觸發。薄指令——讀 manage-planner 引擎執行盤點；
  若情境其實是週回顧，改轉 review-weekly。預設繁體中文，回應跟隨使用者語言。
---

# /check-now · 盤點現況

> 這是指令捷徑，實際邏輯由 **manage-planner** 引擎定義。也是自然語言「盤點」的入口。

## 何時觸發
- `/check-now`、「盤點」、「盤點今天」、「盤點一下」、「現在有什麼」、「還有什麼沒做」

## 情境確認（重要）
使用者說「盤點」時可能指不同事——**先確認再執行**：
- 想看**今天/現況** → 本 skill（往下）
- 想做**本週回顧 + 下週準備**（週日/週末）→ 轉 [review-weekly](../review-weekly/SKILL.md)

不確定時問一句：「要盤點今天的現況，還是做本週的週回顧？」

## 執行
1. 跑 `bash Skills/manage-planner/scripts/today.sh` 拿今天日期。
2. 讀 `Skills/manage-planner/SKILL.md`，依 **Inventory patterns** 執行：
   - 「盤點今天」→ 列今天未完成項（按 stream）+ 問飲料/tracker
   - 純「盤點」→ drift-check：回看過去天未確認項、空白天主動問、按日期分組浮出
   - 「盤點明天/下週」→ 顯示指定未來區間
3. 浮出已排事件 `[o]`。

## 收尾
以一個具體下一項收尾。完整慣例見 [manage-planner](../manage-planner/SKILL.md)。
