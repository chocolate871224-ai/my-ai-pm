# Wen's 工作台

Wendy 的個人工作台網頁：待辦、行程日曆、案件進度、工作日誌、待閱讀、靈感筆記、我的消費、麵包貝果。目前只有「麵包貝果」接了資料庫，其他頁還是範例內容。

## 新版：Google 試算表＋Apps Script（2026-11-23 起）

她決定改用 Google 試算表當資料庫。舊的 artifact 版（下面那段）先留著，等新版裝好、確認可用後再停用。

| 東西 | 在哪裡 |
|---|---|
| **正式網址** | https://script.google.com/macros/s/AKfycbyAeORdxWSZ7pH8M1oU7ZFnHN0Xa5VpSOGPnmcrMs_miUR-qkBe682G9rlClX-dRoOSvw/exec （11/23 部署第 2 版，只有 iamsyuanyu.chen 能開；網址不變） |
| Apps Script 專案 | 綁在試算表上 https://script.google.com/home/projects/1Aa4KQGoqLPyQm8NDsovoOyNBB15WpHl00LNiV_fLnojhOe9pwgVSsD0j/edit （只放 Code.gs） |
| 網頁檔（雲端硬碟） | 檔名「Wen's 工作台 · 網頁（Index.html）」。後台讀**同名檔案中最新建立的那一個**（第 2 版起）。**改網頁＝跑 `python3 -I 99_TEMP/build_gas.py`，再用 Drive 連接器 create_file 上傳一個同名新檔**（連接器不能覆寫舊檔），重新整理就生效，不用貼程式、不用重新部署。11/23 第二版檔案 id `19_4EOSYTy_ZvWfeUuHri4keV_LWD54qY`；舊檔 `1I7bRz-…` 只當備援 |
| 初始資料（雲端硬碟） | 「Wen's 工作台 · 初始資料（seed.json）」id `1_aAi5_aFdY7Lf6YqULnJlj2p66zqSb4N`，只在第一次開啟時用過 |
| 試算表（資料正本） | 「Wen's 工作台 · 貝果資料庫」 https://docs.google.com/spreadsheets/d/1OQIZFtB58dPozx_AaMIydJBx4pOnnD3rz9lbucIpdB4/edit （擁有者 iamsyuanyu.chen） |
| 後台程式 | `gas/Code.gs`（綁在試算表上的 Apps Script；`SEED` 是 11/23 從舊資料庫搬來的資料，只在第一次開啟時寫入） |
| 網頁 | `gas/Index.html`（由 `mockups/interaction-demo.html` 產生，改 google.script.run 讀寫） |
| 安裝步驟＋程式碼複製頁 | `gas/copy-page.html` → https://claude.ai/artifact/Bf9TkbB4kHmLLChrArjQ2E |
| 互動示範（設計確認用） | `mockups/interaction-demo.html` → https://claude.ai/artifact/A2H9BqW9CNtn4w4TdGPhgB |

試算表分頁：品項、訂單、吃掉紀錄、分類、來源。第一列是欄位名稱，不要改；階段用中文（製作中／運送中／冷凍庫／吃完）。
重建：`python3 -I 99_TEMP/build_gas.py`（從示範頁產生 gas/），測試：`node 99_TEMP/test_gas.cjs`，複製頁：`python3 -I 99_TEMP/copy_page.py`。

## 舊版：三個地方，各管一件事

| 東西 | 在哪裡 | 誰是正本 |
|---|---|---|
| 網頁的設計和程式 | `2_Project/Wens工作台/index.html` | **這個檔案** |
| 線上網址（手機、電腦都開這個） | https://claude.ai/artifact/4R8JXN1Yr4kU5jcBA3rAjv | 由上面那個檔案發佈 |
| 貝果資料 | 網址自己的資料庫，文件 `bagel/state` | **資料庫**（頁面上改、或叫 Claude 改都會寫進這裡） |
| 本機預覽用的假資料 | `bagel-sample.json` | 只給本機預覽用，線上不會讀它 |

設計規範：Wen's 設計系統 https://claude.ai/artifact/SZvGVrCiMguDEUntmp253A（外框中性灰白、品牌色只在內容裡、框內文字置中、螢光色只當底色配深字）。

## 改設計的流程（任何一個 Claude 都照這個做）

1. **先同步**：用 Artifact 工具 `read` 線上網址，比對 `index.html`。線上比較新（例如在 claude.ai 聊天裡改過），就先把線上版本存回 `index.html`。
2. **改 `index.html`**，用本機預覽看：`.claude/launch.json` 的 `wens-desk-preview`（http://127.0.0.1:8766）。本機預覽讀 `bagel-sample.json`，改了不會存到線上。
3. **給 Wendy 看示意**，她確認後再發佈。
4. **發佈**：Artifact 工具 publish，`url` 填上面的網址、`file_path` 填 `index.html` 的完整路徑。不要拿掉 `db` 能力，資料庫規則是 `read/write: admin`（只有 Wendy 讀寫）。
5. 改設計**不會動到資料**；資料只在資料庫。

## 改資料的流程

- Wendy 自己在頁面上改：點卡片就能改剩餘數量、品牌、分類、價格、階段、哪個家；拖曳換階段；拖到 😋 吃掉。都會自動存。
- 叫 Claude 改：用 ArtifactData 工具讀 `bagel` / `state`，改完用 `set` 寫回（帶上讀到的 `if_version`）。
- 她傳整份現況清單時：頁面上的「📋 貼上清單 → 用這份清單更新全部狀態」最快；Claude 也可以照同樣規則改資料庫。

## 資料格式（`bagel/state`）

```
{ v: 1,
  items:  [{ id, name, brand, qty, cat, guess, status, order, home, price }],
  orders: { <id>: { id, source: 'shop'|'resale'|'', seller, date: 'YYYY-MM-DD'|null, pickup: '超商'|'面交'|'宅配' } },
  eaten:  [{ d, n, b, per, id, r }],
  cats:   [{ id, label, emoji, color, per, unit }] }
```

- `status`：`making` 製作中 → `shipping` 出貨中 → `arrived` 已抵達 → `fridge` 冰箱 → `done` 吃完
- `home`：`台北` / `高雄`（只有在冰箱時有值）
- 一份的算法：空貝 1 顆、夾餡半顆、酸種片 2.5 片（`cats[].per`）
- `guess: true`＝分類是 Claude 依品名猜的，等 Wendy 確認

## 還沒確認的事

- 高雄的抹茶酸種 3 片：Phang 還是 ICF？
- 芝麻姥姥、奶香金萱、抹茶草莓奶酥、咖啡奶酥：是不是夾餡？
- 紅烏龍：是不是空貝？
- 重點色選哪一組（頁面最上方的「重點色比較」）
