---
name: sync-calendar
description: >
  Bidirectional sync between the Planner Monthly Calendar and Google Calendar.
  Trigger when the user types /sync-calendar or says 「同步行事曆」「sync calendar」.
  Push [o] events and recurring meetings to GCal, pull externally-created events back,
  and keep the @gcal:<id> link in the Monthly file's ## Calendar section in sync.
---

# sync-calendar

## What it does

Planner **Monthly 檔的 `## Calendar` section** 與 Google Calendar 的雙向同步。把 Planner 的 `[o]` 事件與例行會議推到 GCal，把外部建立的 GCal 事件拉回 Planner，並維護綁住兩邊的 `@gcal:<id>` tag。

由 **the-assistant** 操作（與 [`manage-planner`](../manage-planner/SKILL.md) 同 owner）。預設 mock 模式（記憶體內），不連網也能測完整流程。

## When to trigger

- 使用者說「同步行事曆」/「sync calendar」/「push to Google Calendar」
- 週日下週準備時（推下週落在 Monthly Calendar 的事件）
- 月初建新 Monthly 檔時（建立當月事件 + 例行會議）
- [`recurring-items.md`](../../0_Planner/recurring-items.md) 的例行會議有變動（重建受影響的例行事件）
- 使用者問「我這個月有什麼會」且要查即時行事曆

## Hard rule — `@gcal` tag 住哪裡

**`@gcal:<id>` tag 只住在 Monthly 檔的 `## Calendar` section — 絕不在 Weekly。**

- Monthly Calendar 是**同步的真實來源**（事件/目標層）。
- Weekly 是執行層、不被同步。它可以*顯示*當天事件，但不帶 `@gcal` tag、不驅動同步。

Monthly `## Calendar` 行範例：
```
- [o] 6/23（一）14:00 固定實體會議 @gcal:abc123xyz
```

## 三種操作（由 `@gcal` tag 驅動）

| Planner 狀態 | 動作 |
|---------------|------|
| `[o]` 行**沒有** `@gcal` tag | **Push** → `gcal_create_event`，把回傳 id 寫回 `@gcal:<id>` |
| `[o]` 行**有** `@gcal` tag、內容改了 | **Update** → `gcal_update_event` |
| `~~刪除線~~` 行帶 `@gcal` tag | **Cancel** → `gcal_delete_event`，刪除線留作紀錄 |
| GCal 事件在 Monthly Calendar 找不到對應 `@gcal` | **Pull** → 新增一條 `[o]` 行帶其 `@gcal:<id>` |

### Source-of-truth policy（防同步迴圈）

- 對它擁有的行（`[o]` 事件 + 例行會議），**Planner 是 master**。push/update 覆蓋 GCal。
- **Pull 只「新增」**外部建立的事件（無 `@gcal` 對應）進 Monthly Calendar。Pull 絕不覆蓋 Planner 擁有的行。
- 一律先用 `@gcal:<id>` 配對。**絕不**只用標題/時間配對（易重複）。

## Sync workflow

### Step 0 — 拿今天日期（任何查詢前必做）

**絕不把日期寫死進查詢。** 永遠在查詢時從即時系統日期推算 `time_min` / `time_max`，跑與 manage-planner 同一支腳本：

```bash
bash Skills/manage-planner/scripts/today.sh
```

從這個基準在 args 算出區間：
- 「今天」→ `YYYY-MM-DDT00:00:00+08:00` 到 `…T23:59:59+08:00`
- 「明天」→ 基準 + 1 天
- 「本週」→ 用 `weekly_file` 行對應的週一 00:00 → 週日 23:59
- 「本月」→ 該月第一天 → 最後一天

再傳給 `mcp__gcal__gcal_list_events`。**別寫死日期的拋棄式腳本** — MCP 工具的 `time_min`/`time_max` 參數就是為此存在。

### Step 1 — 確認模式與憑證
呼叫 `gcal_check_token`。mock 模式永遠成功（記憶體行事曆）。real 模式若失敗，請使用者跑 `npm run cal:auth` 並設 `GCAL_MOCK_MODE=false`。**絕不**直接發 HTTP — 只用 `gcal_*` MCP 工具。

### Push（Planner → GCal）
1. 讀當前 Monthly 檔的 `## Calendar` section。
2. 每條沒 `@gcal` tag 的 `[o]` 行，組事件（見 [references/mapping.md](references/mapping.md)），呼叫 `gcal_create_event`。
3. 把回傳 `event_id` 寫回該行 `@gcal:<id>`。
4. 內容變過的 `[o]` 行，呼叫 `gcal_update_event`。
5. 仍帶 `@gcal` tag 的 `~~刪除線~~` 行，呼叫 `gcal_delete_event`（刪除線文字留作人類紀錄）。

### Pull（GCal → Planner）
1. 對當月區間呼叫 `gcal_list_events`（`time_min`=月初、`time_max`=月底，皆 `+08:00`）。
2. 每個回傳事件，找 Monthly Calendar 裡有對應 `@gcal:<id>` 的行。
3. 沒有 → 在正確 stream 子段加一條新 `[o]` 行帶 `@gcal:<id>`。由標題關鍵字推斷 stream；不清楚就放 `Notes` 並標給使用者分類。
4. 回報新增了什麼，讓使用者重新歸位被分錯 stream 的事件。

### 例行會議建立
[`recurring-items.md`](../../0_Planner/recurring-items.md) 的「每週例行會議」是來源清單。每個建成**一個**帶 RRULE 的例行 GCal 事件（見 [references/mapping.md](references/mapping.md) 的 RRULE 表），而非每週複製。把回傳 id 存一次，讓重建是更新而非重複。

## What NOT to sync

- 任務（`[ ]` / `[x]`）— 只有 `[o]` 事件同步。死線只留 markdown。
- Weekly 檔的行 — 絕不從 Weekly push。
- Drink tracker、週回顧、下週準備 — Planner 內部專用。

## MCP tools（gcal server）

| Tool | Purpose |
|------|---------|
| `gcal_check_token` | 驗證憑證／行事曆可達 |
| `gcal_list_events` | 取區間內事件（pull） |
| `gcal_create_event` | 建事件（timed / all-day / RRULE 例行） |
| `gcal_update_event` | 依 id patch 事件 |
| `gcal_delete_event` | 依 id 取消事件 |

## Setup（一次性，real 模式）

> 對使用者友善的完整版（含同意畫面、test user、疑難排解）見 [`98_DOC/03-google-calendar-setup.md`](../../98_DOC/03-google-calendar-setup.md)。下面是濃縮版：

1. Google Cloud Console → 新專案 → 啟用 **Google Calendar API**。
2. 建 OAuth client，類型 **Desktop app**。
3. 把 `GCAL_CLIENT_ID` / `GCAL_CLIENT_SECRET` 放進 `.env`。
4. 跑 `npm run cal:auth` → 瀏覽器同意 → refresh token 存回 `.env`。
5. `.env` 設 `GCAL_MOCK_MODE=false`（可選 `GCAL_CALENDAR_ID`）。

第 5 步前一律 mock 模式（記憶體），完整 push/pull 流程不需 Google 帳號就能測。

## Output style

- 簡短。把 push / pull / update 的結果按 stream 分組列出。
- 一定要浮出需要重新分類 stream 的 pulled 事件。
- 以即時計數收尾：「本月 GCal 共 N 個事件，新增 X、更新 Y、取消 Z。」
