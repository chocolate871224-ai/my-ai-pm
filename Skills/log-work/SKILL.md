---
name: log-work
description: >
  記錄與更新今日工作的指令。當使用者輸入 /log-work，或說「記一筆」「開今天的日誌」
  「我今天做了X」「完成Y」「Z 延後」時觸發。薄指令——讀 manage-planner 引擎執行日誌
  記錄與狀態更新。預設繁體中文，回應跟隨使用者語言。
---

# /log-work · 記錄今日工作

> 這是指令捷徑，實際邏輯由 **manage-planner** 引擎定義。

## 何時觸發
- `/log-work`、「記一筆」、「開今天的日誌」
- 「我今天做了 X」、「完成 Y」、「Z 延後到明天」

## 執行
1. 跑 `bash Skills/manage-planner/scripts/today.sh` 拿今天日期與週檔路徑。
2. 讀 `Skills/manage-planner/SKILL.md`，依其 **Reporting completion** 與 **Daily file format** 規則執行：
   - 新增任務 → 寫進今天的對應 stream（工作/生活/事業/學習）
   - 回報完成 → 標 `[x]`，保留註記
   - 回報延後 → 原行 `[>] 延 M/D`，目標日加 `從 M/D`
   - 突發 → `*`（臨時殺入）或 `+`（臨時衝刺）前綴
3. 沒帶內容時先問一句：「今天想記什麼？事件還是待辦？哪條 stream？」

## 收尾
以一個具體下一項收尾（「剩下：…」）。完整慣例見 [manage-planner](../manage-planner/SKILL.md)。
