# 99_TEMP · 進件暫存區

外來東西要進系統，**先放這裡**。進件 pipeline（檢查 → 加工 → 放置）都在這個資料夾內發生。

## 怎麼用

1. 把外部檔案 / PDF / 別人的 skill·agent 丟進 `99_TEMP/`。
2. 說「匯入這個檔」或 `/ingest`，the-gatekeeper 接手：
   - **檢查**：`purge-file` 在這裡掃描，產 clearance report。
   - **加工**（需要才）：the-smith 在這裡把原料做成道具或 AI 好讀文件。
   - **放置**：`ingest-file` 把成品分類進 `0_Planner / 1_Personal / 2_Project`，skill→`Skills/`、agent→`Agents/`。
3. 放置完成後，AI 會**問你要不要刪掉這裡的原始檔**（成品已在系統內）。

## 規則

- 本資料夾**內容不進 git**（`.gitignore` 已排除），只保留這份 README。屬於暫存草稿區。
- 沒過 `purge-file` 的內容不會被放置。flagged → 移 `data/quarantine/`、回報、不放置。
- 這裡是暫存，不是長期倉庫——東西該被 ingest 出去或刪掉，別堆積。
