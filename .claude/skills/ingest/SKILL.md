---
name: ingest
description: >
  匯入外部資料的指令。當使用者輸入 /ingest，或說「匯入這個檔」「把這個歸位」「收進來」
  「加入這個 skill/agent」時觸發。薄指令——觸發 the-gatekeeper 的進件 pipeline
  （檢查 → 必要時交 the-smith 加工 → 放置）。預設繁體中文，回應跟隨使用者語言。
---

# /ingest · 匯入外部資料

> 這是指令捷徑，實際由 **the-gatekeeper** 執行整條進件 pipeline。

## 何時觸發
- `/ingest`、「匯入這個檔」、「把這個歸位」、「收進來」、「加入這個 skill/agent」

## 執行（進件 pipeline）
外來東西**先放 `99_TEMP/` 暫存區**。以 the-gatekeeper 身分（讀 `Agents/the-gatekeeper/CLAUDE.md`）在那裡執行：

```
（東西已在 99_TEMP/）
① 檢查：purge-file 掃描 99_TEMP/ → clearance report
     flagged → 停、移 data/quarantine/、回報，不放置
② 需要加工？
     skill/agent、PDF、雜亂文件 → 交 the-smith（convert-pdf / refine-doc / 改寫 SKILL.md|CLAUDE.md）
                                     skill 類過 analyze-skill-quality
     乾淨可直接用 → 跳過
③ 放置：ingest-file 分類進 0_Planner / 1_Personal / 2_Project；skill→Skills/、agent→Agents/
④ 清理：放置完成後，問使用者「要刪掉 99_TEMP/ 的原始檔嗎？」要→刪｜不要→留
```

## 規則
- **不得跳過檢查**：沒有 clearance report 不放置。
- 外來內容只在 `99_TEMP/` 落地，不直接寫進 domain。
- 分類信心低 → 先問使用者。
- 放置完成才問刪除；**未確認前不刪** `99_TEMP/`。
- 回報「掃描結果 + 是否加工 + 放置位置 + 暫存處置」。

詳見 [the-gatekeeper](../../Agents/the-gatekeeper/CLAUDE.md)、[purge-file](../purge-file/SKILL.md)、[ingest-file](../ingest-file/SKILL.md)。
