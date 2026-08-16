---
name: refine-doc
description: >
  把雜亂的外來文件整理成乾淨、結構化、AI 好讀的 Markdown。當需要清理 HTML dump、逐字稿、
  網頁複製、混亂筆記，或在進件 pipeline 中「加工成 AI 好讀文件」時觸發。由 the-smith 使用。
  （PDF 專用請改 convert-pdf。）
---

# refine-doc

## What it does

把雜亂的外來文字（HTML dump、逐字稿、網頁複製貼上、隨手筆記）整理成**乾淨、結構化、AI 好讀**的 Markdown。是 the-smith「加工成 AI 好讀文件」能力的一環，用在進件 pipeline 的②加工步。

## When to trigger

- 進件 pipeline 判定某文件「需要加工成 AI 好讀」
- 使用者給一段雜亂文字要整理
- PDF → 改用 [convert-pdf](../convert-pdf/SKILL.md)

## Rules

### DO
- 去雜訊：移除導覽列、廣告、cookie 提示、重複頁首頁尾、亂碼空白
- 加結構：補上標題層級（`#`/`##`/`###`）、把清單轉 `-`/`1.`、把表格資料轉 Markdown 表
- 保留所有**實質內容**與原意；只重組、不改寫語意
- 檔首加 source metadata 區塊
- 長文分段處理時確保跨段連續

### DO NOT
- 不杜撰原文沒有的內容
- 不摘要（除非使用者要求）——目標是「清理＋結構化」，不是縮短
- 不丟掉表格資料（轉成 Markdown 表，不要攤平成純文字）

## Input
- 雜亂文字（貼上）或檔案路徑
- 可選：output 路徑（預設同目錄、同檔名 `.md`）

## Output

```markdown
# [標題]

> Source: [來源]
> Refined: [YYYY-MM-DD]

---

[整理後的結構化內容]
```

## 限制
- 影像不抽取，留位置標記 `[Image: 描述]`
- 多欄/複雜版面可能需人工微調
