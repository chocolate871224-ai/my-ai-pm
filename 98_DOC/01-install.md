# 01 · 安裝（Installation）

> ⏱️ **先有心理準備**：安裝大約 **30 分鐘，而且大半時間是在「等下載」**。這段是整套**最難的關卡**——卡住很正常，而且**只做一次**，裝好之後就一路順了。任何一步看不懂，回 [00-how-to-learn](00-how-to-learn.md)：**問 AI、卡住就截圖丟給它**。

**核心只要 git + VSCode + Claude Code 外掛**；後面是選配模組，要用再裝。

## 核心工具

| 工具 | 用途 | 哪裡拿 |
|------|------|--------|
| **VSCode** | 編輯器、跟 AI 對話的地方 | https://code.visualstudio.com/ |
| **git** | 版本控制（記錄檔案每次變更） | 見下方「裝 git」（依系統不同） |
| **Claude Code 外掛** | AI 助手本體 | VSCode 擴充市集搜「Claude Code for VS Code」 |

- ⚠️ **Claude Code 需付費方案**：Claude **Pro / Max / Team / Enterprise** 或 **Console（API）** credits。**免費的 claude.ai 不含 Claude Code。**
- 外掛**內建一份 CLI 給聊天面板** → 裝外掛就能用，**不必另裝 CLI、也不需要 Node.js**。

## 步驟 1 — 先裝 VSCode、學會叫出終端機

1. 到 https://code.visualstudio.com/ 下載安裝 **VSCode**，打開。
2. 之後所有「貼指令」都在 **VSCode 內建終端機**裡做：按 **Ctrl + `**（Esc 下面那顆鍵）叫出終端機，**不用另外找「終端機」App**。

## 步驟 2 — 裝 git（依你的系統不同）

### 🍎 Mac
Mac 內建沒有可直接用的 git，要先裝 **Homebrew**（套件管理員）再用它裝 git：

1. 在 VSCode 終端機貼上**官方 Homebrew 安裝指令**：
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. 過程會**要你輸入 Mac 開機密碼**——**打字時看不到游標或星號是正常的**，打完按 Enter；中途可能還要按幾次 Enter。
3. 裝完，Homebrew 會**印出 2 行設定 PATH 的指令**（Apple Silicon 與 Intel 不一樣）→ **照它印的貼上、執行**。少了這步，`brew`／`git` 會「找不到指令」。
4. **Xcode Command Line Tools**：常會被自動帶著裝；它**約 700MB+、下載很慢、不能跳過**——趁等待先去做別的。
5. 裝 git：`brew install git` → 完成後打 `git -v` 印出版本號就 OK。

### 🪟 Windows
Windows **不需要** Homebrew / Xcode 那一套：直接到 https://git-scm.com/downloads 下載 **Git for Windows** 安裝（一路 Next 即可），裝完在終端機打 `git -v` 確認。

## 步驟 3 — 註冊 GitHub（雲端同步/備份要用，可稍後）

- 到 https://github.com/signup 註冊一個帳號。
- ⚠️ **若卡在「旋轉圖片驗證碼」一直失敗**：多半是**瀏覽器太舊**——先把瀏覽器更新到最新版再試。

## 步驟 4 — 裝 Claude Code 外掛

1. VSCode 左側欄最下面的**擴充功能**（積木圖示）→ 搜「**Claude Code for VS Code**」→ 安裝 →（信任）。**裝外掛免費**，只有登入付費帳號使用才計費。
2. 裝好會多一個圖示 → 點開 → 登入（Google 授權）→ New session → 出現對話面板，就能開始。

## VSCode 一點點基本操作（零經驗也能上手）

- **放大字級**：`Cmd/Ctrl` + `+`。
- **收掉用不到的面板**：左側欄圖示再點一下可收合；畫面太擠就拖邊界縮掉，更清爽。
- **左側欄四顆常用**：檔案總管（看檔案）、搜尋、原始碼控制（git）、擴充功能。
- 💡 擴充市集裡還有不少好東西能讓編輯器更順手——有興趣自己去 **Extensions** 逛逛、搜搜看。

## 取得這個專案

- `git clone`（或下載）這個 repo → 用 **VSCode 開資料夾**、按「信任作者」。
- 開 Claude Code 面板，說「**請閱讀 README.md，帶我啟動**」。
  - 💡 第一次打開、skill 還沒載入時，`/setup-aipm` 這種**斜線指令可能打不出來**——這時**直接用講的**：「請尋找並執行 setup-aipm 的步驟」。詳見 [02-how-to-use](02-how-to-use.md)。

## 選配模組（要用再裝）

- 🎙️ **語音輸入（用說的）**：裝語音輸入工具就能對麥克風講、自動轉文字——推薦 **Typeless**：https://www.typeless.com/refer?code=YX9UCV7（Mac 也可用系統內建「聽寫」）。說出來更幫記憶。
- 🗓️ **Google 行事曆同步**：需 **Node.js 18+**（https://nodejs.org/）+ Google 帳號。完整設定見 [03-google-calendar-setup.md](03-google-calendar-setup.md)。
- ☁️ **雲端備份／多裝置**：GitHub 帳號 + 連 remote（`/setup-aipm` 模組 A 會帶）。
- ⌨️ **Claude Code 獨立 CLI**：想在終端機直接打 `claude`，或用 `npm run cal:sync` 這種**無人值守（headless）自動同步**，要另外裝**獨立 CLI**（原生安裝、免 Node；安裝方式見 Claude Code 官方文件）。日常在 VSCode 面板用不需要這個——外掛已內建一份。

裝好後的使用方式見 [02-how-to-use.md](02-how-to-use.md)；安全與權限見 [04-security.md](04-security.md)。
