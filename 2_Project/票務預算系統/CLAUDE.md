# 票務預算系統 — 開發規則

在這個資料夾改 Ticket & Seat 系統時照這些做。專案說明、連結、流程見 README.md。

## 使用者偏好
- 任何畫面或流程的改動，先做示意圖（Artifact 網頁），使用者確認後才改程式。使用者常用手機遠端，示意圖一律做成 Artifact 連結。
- 配色維持原本的紫＋萊姆＋米白；字級、emoji 圖示不要改。
- 用語：「銷售」，不要寫「販售」。

## 程式
- 只改 `src/`；`dist/` 由 `python3 -I tools/build.py` 產生。改完一定跑 build 和 `node tests/test_sales.cjs src/Code.gs`。
- `src/Index.html` 是單一檔案前端：沒有在 Apps Script 時自動用 `MOCK` 示範資料（`MOCKAPI`）。後端新增函式時，`MOCKAPI` 也要加對應的假版本，示範版才能用。
- `const MOCK=`、`const BUDGET=` 兩行是示範資料，建置 Apps Script 版時會整行拿掉，所以要各自保持在一行。
- 後端寫試算表前先 `LockService` 鎖、寫完 `recalc_()` 讓 countcoloredcells 重算、`log_()` 留紀錄。
- 「票價座位」是底稿，銷售相關程式不能改它的格子。

## 上線（貼進 Apps Script）
- 內建瀏覽器打開 Apps Script 專案後，cmd+v 貼不進編輯器。可行做法：用 javascript_tool 讀 `monaco.editor.getModels()`，用逐行雜湊比對只傳差異行，在頁面裡組回整份檔案後 `setValue`，比對雜湊一致才寫入，再按存檔。
- 部署：部署 ›「管理部署作業」› 鉛筆 › 版本「建立新版本」› 部署。截圖常落後一步，用 javascript_tool 讀 `[role=dialog]` 的文字確認狀態。
- 部署後用正式網址開一次，確認讀得到試算表資料；不要自己按「儲存到試算表」寫入測試資料，除非使用者同意。
