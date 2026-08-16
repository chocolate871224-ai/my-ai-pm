---
name: track-habits
description: >
  記錄與統計你在 Planner 每日標題上追蹤的習慣。內建兩個範例 tracker——飲料（咖啡/茶）與運動——
  你可以換成、或加上自己想追的任何習慣。負責 WHEN 問、HOW 記、HOW 統計；tracker 的格式與起算日
  通則定義在 0_Planner/README.md。由 manage-planner（盤點收尾）與 review-planner（週/月統計）呼叫。
---

# track-habits

## What it does

記錄並統計你的每日習慣 tracker，全部存在 Planner 的每日標題 `## M/D（週）[tracker]`。

**內建兩個範例——你可自訂：**
- **飲料**：咖啡 / 茶 杯數
- **運動**：當天是否運動（或次數）

> 這兩個只是**示範**。tracker 是「你想對自己保持誠實的東西」——早起、專注時數、步數、心情…都行。
> 換掉或新增時，套 README 的**起算日通則**（先設起算日、之後不回溯補算）。

tracker 的**格式**（day header 寫法、起算日通則）定義在
[`0_Planner/README.md`](../../0_Planner/README.md)。本 skill 負責**行為**：何時問、記什麼、怎麼統計。

## When to trigger

- 被 `manage-planner` 在盤點（尤其一天收尾/睡前最後一次盤點）呼叫
- 被 `review-planner` 在週/月回顧需要統計時呼叫
- 使用者主動報習慣（「今天喝了兩杯咖啡」「昨天有運動」）
- 使用者問習慣趨勢（「這週喝多少咖啡」「這個月運動幾次」）

## 記什麼（格式見 README，行為在這裡）

範例 tracker 的記法：
- **飲料**：接在星期後，`C`=咖啡、`T`=茶，加法（`CTC` = 2 咖啡 + 1 茶）。問法：`今天咖啡和茶喝了多少？`
- **運動**：當天有運動就在 tracker 標 `運`（或次數）。問法：`今天有運動嗎？`
- 自訂 tracker：用一個短碼放進同一個 day header，記法同上。

```
## 6/23（二）｜CT 運      ← 2 咖啡 1 茶、有運動
## 6/24（三）｜C          ← 1 咖啡、沒運動
## 6/25（四）｜           ← clean day（可留空或省略）
```

> 起算日通則（README）：開始追任何 tracker **先設一個起算日**，只從那天起算、不回溯補算。

## 何時問（timing）

- **每天收尾問一次**（day wrap-up / 最後一次盤點），把當天所有 tracker 一起問完——**別為了追蹤器反覆打斷使用者**。
- 回溯盤點某過去天時，若該天 header 缺 tracker 碼，補問（如「6/22 喝了多少咖啡和茶？有運動嗎？」）。
- 若某天沒被問就過了 → 下次「盤點」回頭檢查漏記時補提。
- 例行、直接記；使用者已主動講就不再問。

## 怎麼統計（給 review-planner）

週回顧 / 月底需要 統計 時：
- **飲料**：C 與 T **分開計數**。
- **運動**：數該期間**做了幾次**（對照目標次數，如每週 2 次）。
- **自訂 tracker**：依其性質給對應統計（次數 / 天數 / 趨勢）。

（月底 統計 需讀每個與該月重疊的週檔；跨月週只算在月內的日子——見 review-planner 月底流程。）

## References

- 格式與起算日通則：[`0_Planner/README.md`](../../0_Planner/README.md)
- 呼叫者：[`manage-planner`](../manage-planner/SKILL.md)（盤點收尾）、[`review-planner`](../review-planner/SKILL.md)（週/月 統計）
