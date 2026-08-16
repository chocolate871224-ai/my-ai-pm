---
name: review-weekly
description: >
  週回顧 + 下週準備的指令。當使用者輸入 /review-weekly，或說「週回顧」「做這週的回顧」
  「準備下週」「本週做了什麼」時觸發。薄指令——讀 review-planner 引擎執行週回顧 workflow。
  預設繁體中文，回應跟隨使用者語言。
---

# /review-weekly · 週回顧 + 下週準備

> 這是指令捷徑，實際邏輯由 **review-planner** 引擎定義。

## 何時觸發
- `/review-weekly`、「週回顧」、「做這週的回顧」、「準備下週」、「本週做了什麼」

## 執行
1. 跑 `bash Skills/manage-planner/scripts/today.sh` 拿日期與本週檔。
2. 讀 `Skills/review-planner/SKILL.md`，依 **週回顧 + 下週準備** 執行：
   - **週回顧**：完成數、各 stream 量化 + 一段敘述、亮點、突發（`*` 殺入 vs `+` 衝刺）比例、延後項與去處、
     習慣統計（交 `track-habits`）、仍追的 pending、兩軸抓漏。
   - **下週準備**：建好下週檔（例行/習慣預填）、拉下週 `[o]` 事件、carry-over、衝突、寫下週主題。
3. 設計/研究型工作用文字描述進展，別只給 %。所有回顧遵守 review-planner 的報告規則。

## 收尾
完成後提示：要不要順手 `/sync-calendar` 把下週事件同步行事曆。完整慣例見 [review-planner](../review-planner/SKILL.md)。
