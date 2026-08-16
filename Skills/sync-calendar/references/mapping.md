# Planner ↔ Google Calendar mapping

Monthly `## Calendar` 行如何對應到 GCal 事件，以及例行會議的 RRULE 表。

## 行 → 事件欄位對應

Monthly Calendar 行形狀：
```
- [o] M/D（週）[HH:MM] <title> [@stream:X] @gcal:<id>
```

| Planner 元素 | GCal 欄位 | 備註 |
|-----------------|-----------|------|
| `<title>` | `summary` | 解析後去掉開頭的日期/時間 |
| `M/D` + 年（取自 Monthly 檔名 `YYYY-MM`） | `start.date` / `start.dateTime` | 年來自月檔名 |
| `HH:MM` 時間 | `start.dateTime` | timed 事件；時區 `Asia/Taipei` |
| 沒給時間 | all-day | `start.date` = `YYYY-MM-DD`，`end.date` = 次日（exclusive） |
| 時段（例 `17:00-19:00`） | `start`/`end` dateTime | 只給開始則預設 1 小時 |
| `@gcal:<id>` | event `id` | 連結；create 後寫回 |

### Timed 事件 args（push）
```
gcal_create_event(
  summary = "固定實體會議",
  start   = "2026-06-23T14:00:00+08:00",
  end     = "2026-06-23T15:00:00+08:00"
)
```

### All-day 事件 args（push）
```
gcal_create_event(
  summary = "繳房租",
  start   = "2026-06-10",
  all_day = true
)   // end 自動填次日（exclusive）
```

## 例行會議 → RRULE 表

來源清單：[`0_Planner/recurring-items.md`](../../../0_Planner/recurring-items.md) →「每週例行會議」。每個建成**一個**例行事件，而非每週複製。`UNTIL` 用 UTC（`Z`）。

下面是**通用範例**（對應 recurring-items 的範例會議），換成你自己的：

| Meeting | Stream | Day/Time | RRULE | Until |
|---------|--------|----------|-------|-------|
| 固定實體會議 | 工作 | 週一 14:00–15:00 | `RRULE:FREQ=WEEKLY;BYDAY=MO` | 無 |
| 固定線上會議 | 工作 | 週四 10:00–11:00 | `RRULE:FREQ=WEEKLY;BYDAY=TH` | 無 |

### Recurring create 範例
```
gcal_create_event(
  summary    = "固定實體會議",
  start      = "2026-06-22T14:00:00+08:00",
  end        = "2026-06-22T15:00:00+08:00",
  recurrence = ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
)
```
`start`/`end` 定義第一次發生；RRULE 重複它。第一次發生挑在建立日當天或之後。

### BYDAY codes
`MO TU WE TH FR SA SU`

### 假日 / 單週處理
- 跳過某週的例行會議：**不要刪整個 series**。在 Weekly 檔（執行層）把該週那行標 `~~刪除線~~`。GCal series 保持完整。
- 永久結束：靠 RRULE 的 `UNTIL`，不需手動清理。

## Stream inference（pull）

Pull 到無 `@gcal` 對應的外部事件時，由標題推斷 stream（對應你自訂的四條 stream）：

| 標題關鍵字（範例） | Stream |
|------------------|--------|
| 公司、客戶、週會、報告 | 工作 |
| 家庭、就醫、繳費、聚餐 | 生活 |
| 直播、社群、品牌、出貨 | 事業 |
| 課程、上課、研究、論文 | 學習 |
| （都不符） | Notes — 標給使用者分類 |

> 關鍵字依你的實際生活調整；這只是起點。
