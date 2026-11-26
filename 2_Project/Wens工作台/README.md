# Wen's 工作台

Wendy 的個人工作台網頁：待辦、行程日曆、案件進度、工作日誌、待閱讀、靈感筆記、我的消費、麵包貝果。接了資料：麵包貝果、待辦（＋自動看信）、工作日誌、行程日曆（Google 日曆）；案件、待閱讀、靈感、消費還是範例內容。

## 新版：Google 試算表＋Apps Script（2026-11-23 起）

她決定改用 Google 試算表當資料庫（11/23 確認架構維持 Apps Script＋試算表，GitHub 只當版本備份，每次改版推一次）。舊的 artifact 版（下面那段）先留著，等新版裝好、確認可用後再停用。

| 東西 | 在哪裡 |
|---|---|
| **正式網址** | https://script.google.com/macros/s/AKfycbyAeORdxWSZ7pH8M1oU7ZFnHN0Xa5VpSOGPnmcrMs_miUR-qkBe682G9rlClX-dRoOSvw/exec （11/23 部署第 7 版：第 6 版＋行程日曆讀寫 Google 日曆（getEvents／addEvent／authorizeCalendar，已授權）；第 6 版是安全寫入、拒絕空白存檔、表格分頁可存、訂單平台欄與「已抵達」階段；只有 iamsyuanyu.chen 能開；網址不變） |
| Apps Script 專案 | 綁在試算表上 https://script.google.com/home/projects/1Aa4KQGoqLPyQm8NDsovoOyNBB15WpHl00LNiV_fLnojhOe9pwgVSsD0j/edit （只放 Code.gs） |
| 網頁檔（雲端硬碟） | 檔名「Wen's 工作台 · 網頁（Index.html）」。後台讀**同名檔案中最新建立的那一個**（第 2 版起）。**改網頁＝跑 `python3 -I 99_TEMP/build_gas.py`，再用 Drive 連接器 create_file 上傳一個同名新檔**（連接器不能覆寫舊檔），重新整理就生效，不用貼程式、不用重新部署。目前最新檔案 id `1V2t6PuNHSpvUW9xiyxuG-GVYLEZt0Oh4`（11/26 13:17：網友收購取貨＝寄貨便／面交，面交直接進「待取貨」（「已抵達」改名，試算表仍存「已抵達」）並記面交日期；簡易版進貨單和專業版主要欄位一樣（站、取貨、日期、單價、運費）；進貨單框內提示＋圖片分類按鈕；收據：線條貝果 icon、皺紙紋理＋折痕、貝果紙膠帶、條碼、窄版、拿掉「放台北 放得下」、短螢幕可捲；「收進」按鈕彈跳＋小特效、收據飛進該去的欄。改動在 `99_TEMP/basket/pickup_patches.py`（build_basket.py 最後套用；_tex_patch.py／_tape_patch.py／_v4_patch.py 是產生它的一次性腳本），尺寸檢查 `99_TEMP/basket/sizecheck.js`（320／375／768／1024／1440 都過）。前一版 `1XM0D8EfJVIsg7L1KsV2dOvOnZmxzSwqe`（11/25 05:03：手機版排版修正——階段分頁一行、數字卡 2×2、按鈕換行、近期節目名稱兩行；交付前跑「溢出檢查」：每個元素檢查超出外框／內容溢出／被省略號切掉／超出畫面，含左右滑動列裡被藏住的，寬 320–1440、高 568／800。前一版 `10A0zqBT3VWi1jzQT89Nc_FLLFnTPZrim` 11/25 04:44：待辦＋信件建議、工作日誌、行程 hover 卡、心得改種類（程式在 `99_TEMP/todo/`：todo_module.js＋todo.css 由 build_basket.py 透過 desk_patches.py 加進去，後台在 desk.gs 由 build_gas.py 接在 Code.gs 後面；試算表多「待辦／信件建議／工作日誌」三個分頁；要在編輯器執行一次 setupDesk 開每 30 分鐘看信、每晚 23:00 彙整）。前一版 `1Ny0KQVaIy8wopAfVpqxl5MUz8w_RfOG2` 11/25 04:09：提示框會自己消失／點一下關閉、網頁端也把 YOLON 改成 Yolan。前一版 `1YjBmoTypXgJtF928l7df_vIMC5YQ0YkL` 11/25 03:48，貝果 v5：物理冷凍庫（Matter.js）、冷凍庫與訂單／心得筆記本分頁、訂單卡拖曳＋✎原地編輯、來源配色、品牌 logo（品牌分頁）、進貨單單價＋運費＋收據 PNG 存雲端硬碟「Wen's 工作台 · 進貨單」、放進冷凍庫日、心得照片；來源在 `99_TEMP/basket/`，`python3 -I 99_TEMP/basket/build_basket.py --live` 從 `99_TEMP/basket/base.html`（加貝果前的頁面）產生 interaction-demo.html；非貝果的改動要改 base.html，示意版不加 --live。**要搭配後台第 11 版**（新 Code.gs：品牌分頁、運費／放進冷凍庫日／照片欄、saveReceipt、YOLON 讀成 Yolan）；備份在 `99_TEMP/backup_1125/`）；前一版 `1IzSIc-kSPDa8pOHDy94BZZTIppF6ZI-O`（11/24 00:57，搭配後台第 10 版：圖例改成可勾選（存在瀏覽器 localStorage `wens.calOff`）、貝果到貨 🥯、LIVE王 兩本收成「🎤 演出／🎫 售票」一組且不佔月曆格子只標 🎤／🎫、右側「近期節目」卡＝後台 getUpcoming(90)，依月份分段、行程說明／地點有網址就出「購票 ↗」；示意 mockups/cal-legend-check.html＝https://claude.ai/artifact/B4BkFCCHByYXCqoknwXD9C）；更早一版 `17Nletr7vQgrdA8lZ8Pbz7QCwUh_HezQ3`（11/23 15:49，行程日曆改讀 iamsyuanyu.chen 日曆清單裡的全部日曆＝calList_，分享／訂閱進來的自動出現、各自顏色）；更早一版 `1hlgDk-7hnCbiyMv5FLjZ9DPhqZfUwRKx`（11/23 15:28，側欄換頁修好：Apps Script 網頁在框裡，`#連結` 不會傳進來，改成頁面自己記目前分頁、用 google.script.history 同步網址）；更早一版 `1I5FUr_VLPqjv_L7zqMkzAswDSVLTpMXO`（11/23 15:14，行程日曆接 Google 日曆：讀 Work／chocolate871224／節假日，可新增；後台要貼新版 Code.gs＋執行 authorizeCalendar＋部署新版本，步驟頁 https://claude.ai/artifact/C5q7FNrJTmENFTQDMGTCsP；測試 `node 99_TEMP/test_cal.cjs`）；更早一版 `1Avzly76tL5hvVb5gK3ravz9bzqahd0kj`（11/23 15:04，延伸色淡藍紫 --em2、收據 v2（＋訂單也印）、「吃掉的」點一行開心得頁、半顆星；示意 mockups/lavender-receipt-review.html）；更早一版 `1slqjnuG9drTviR9AYqsAQo3ZflzYX97a`（11/23：三種來源＋平台 logo、手機版兩行卡片、已抵達欄）；前一版 `1omz_BBz9qPfAnoCbCsplT_ykm4RbOkI9`；舊檔 `1I7bRz-…` 只當備援 |
| 初始資料（雲端硬碟） | 「Wen's 工作台 · 初始資料（seed.json）」id `1_aAi5_aFdY7Lf6YqULnJlj2p66zqSb4N`，只在第一次開啟時用過 |
| 試算表（資料正本） | 「Wen's 工作台 · 貝果資料庫」 https://docs.google.com/spreadsheets/d/1OQIZFtB58dPozx_AaMIydJBx4pOnnD3rz9lbucIpdB4/edit （擁有者 iamsyuanyu.chen） |
| 後台程式 | `gas/Code.gs`（綁在試算表上的 Apps Script；`SEED` 是 11/23 從舊資料庫搬來的資料，只在第一次開啟時寫入） |
| 網頁 | `gas/Index.html`（由 `mockups/interaction-demo.html` 產生，改 google.script.run 讀寫） |
| 安裝步驟＋程式碼複製頁 | `gas/copy-page.html` → https://claude.ai/artifact/Bf9TkbB4kHmLLChrArjQ2E |
| 互動示範（設計確認用） | `mockups/interaction-demo.html` → https://claude.ai/artifact/A2H9BqW9CNtn4w4TdGPhgB |

試算表分頁：品項、訂單、吃掉紀錄、分類、來源、品牌（11/25 起；logo 存成圖片字串，每格上限 5 萬字，網頁會自動壓縮）。品項的「價格」欄改叫「單價」（每顆價格）。第一列是欄位名稱，不要改；階段用中文（製作中／已抵達／冷凍庫／吃完；舊的「運送中」讀進來會當成未到店，回到製作中）。

**訂單規則（11/23 起）**：來源三種——店家購買（填店家名稱）、網友收購、社團團購（後兩者填平台 IG／Threads／LINE／其他＋對方或團主名稱，平台存在「訂單 → 平台」欄）。一筆訂單只會在一欄；「運送中」不是一欄，而是製作中的訂單到了出貨日自動標示＋提醒；按「到店了」整筆移到「已抵達」。

> **11/23 事故**：品項分頁被轉成「表格」（欄位有型別），舊版存檔先清空再寫入、寫入失敗，品項全被清空。已用版本記錄還原到 11/23 凌晨 2:16。第 3、4 版起：寫入失敗會放回原資料、網頁送來 0 筆品項時拒絕存檔，分頁是不是表格都能存。資料出事先去「檔案 → 版本記錄」還原。
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
