# Google Calendar 同步設定（選配模組 B）

把 `0_Planner` 月檔的事件，和你**真正的 Google 行事曆**雙向同步。
這是**選配**——不做也完全能用（預設是 mock 假資料模式）。要做再照下面走。

> 為什麼步驟有點多：同步是透過**你自己的 Google API 憑證（OAuth）**，資料只在「你 ↔ Google」之間，不經過任何第三方。憑證只存在你電腦的 `.env`（已被 `.gitignore`，不會上傳）。

## 前置
- **Node.js 18+**（https://nodejs.org/ ，`node -v` 確認）
- 一個 **Google 帳號**

## 步驟

### 1. 安裝相依
```bash
npm install
```

### 2. 建立 Google Cloud 專案
- 到 https://console.cloud.google.com/ → 上方專案選單 → **新增專案** → 取個名字（例：my-planner）→ 建立。

### 3. 啟用 Google Calendar API
- 左側「**API 和服務 → 已啟用的 API 和服務**」→ **啟用 API 和服務** → 搜尋 **Google Calendar API** → **啟用**。

### 4. 設定 OAuth 同意畫面
- 「**API 和服務 → OAuth 同意畫面**」→ User Type 選 **External（外部）** → 建立。
- 填 App 名稱、你的 Email（其他可留空）→ 一路儲存。
- **接著二選一**（都只給你自己用）：
  - 🟢 **更簡單（建議）**：到 **「目標對象」（Audience）** → **發布狀態** → 點 **「發布應用程式」** 設成 **正式版（In production）**。這樣**完全不用維護 test user 清單**——反正只有你有金鑰，別人也用不了。
  - 🔵 **或**：維持 **測試（Testing）** 模式 → 到 **Test users（測試使用者）** 把**你自己的 Google 帳號**加進去。
- ⚠️ 不論哪種，因為沒送 Google 審核，待會兒授權時都會跳「應用程式未驗證」警告——**這正常**，到步驟 7 點「**進階 →（顯示不安全）繼續前往**」即可。

### 5. 建立 OAuth 用戶端 ID
- 從**左側選單**「**API 和服務 → 憑證**」進 → **建立憑證 → OAuth 用戶端 ID** → 應用程式類型選 **桌面應用程式（Desktop app）** → 建立。
  - 💡 **走選單 vs 走提示按鈕，流程不一樣**：照上面從**選單「憑證」**進，是「步驟 4 已設好同意畫面 → 這裡直接建用戶端」。但如果你是點 Google 跳出的**提示按鈕／「協助我選擇」**進，它會**先把你帶去設定同意畫面**（把步驟 4 夾在中間）、中途問「**使用者資料 vs 應用程式資料**」→ 選 **使用者資料**，再回來選 **桌面應用程式**。兩條路最後結果一樣，別被順序搞混——因為 Google 一律要求**先有同意畫面才能建用戶端**。
- 複製拿到的 **Client ID** 與 **Client Secret**。
- ⚠️ **不用設定重新導向 URI（redirect URI）**——桌面應用程式類型會自動允許 localhost；`npm run cal:auth` 用的就是這個 loopback（`http://localhost:53682`）。

### 6. 填進 `.env`
```bash
cp .env.example .env
```
打開 `.env`，填入：
```
GCAL_CLIENT_ID=你的_client_id
GCAL_CLIENT_SECRET=你的_client_secret
```

### 7. 授權、拿 token
```bash
npm run cal:auth
```
- 跑下去會**自動打開瀏覽器**讓你完成授權：用**你要同步的那個 Google 帳號**登入 → 按「**允許 / 繼續**」放行。
- 中途若跳「Google 尚未驗證這個應用程式」→ 正常（沒送審的自用 app）→ 點「**進階 →（顯示不安全）繼續前往 → 允許**」通過即可。
- 你**不用手動貼任何驗證碼**——腳本用 localhost 自動接回授權碼、換成 token。
- 通過後瀏覽器會顯示成功，refresh token **自動寫回 `.env`**。

### 8. 切到真實模式
打開 `.env`，把：
```
GCAL_MOCK_MODE=false
```

### 9. 測試
- 叫 AI：「**檢查行事曆連線**」（會跑 `gcal_check_token`）。
- 再叫：「**同步本月行事曆**」。
- 只有月檔 `## Calendar` 的 `[o]` **事件**會同步；任務（`[ ]`/`[x]`）不會。

## 疑難排解
| 狀況 | 處理 |
|------|------|
| 「應用程式未驗證」警告 | 正常——沒送審的自用 app。授權時點「**進階 →（不安全）繼續前往 → 允許**」即可（不論你是發布正式版、還是用 test user） |
| `cal:auth` 說「沒拿到 refresh_token」 | 通常是這帳號之前已授權過。到 https://myaccount.google.com/permissions 移除這個 app 的存取權，再重跑一次 |
| token 失效 / 過期 | 重跑 `npm run cal:auth` |
| 想退回安全測試 | `.env` 設回 `GCAL_MOCK_MODE=true`（回 mock，不連網） |

完整同步邏輯（push/pull、`@gcal` 標記）見 [`Skills/sync-calendar/SKILL.md`](../Skills/sync-calendar/SKILL.md)。
