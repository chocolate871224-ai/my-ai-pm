# 安全與權限說明

這份起始包讓 AI 在你的電腦上動檔案、跑指令。下面說清楚**有哪些防線、各擋什麼、哪裡有缺口**，讓你不是在用一個黑盒子。

安全由 **the-gatekeeper（守門人）** 掌管，分**三道閘**：

```
你的指示
  → 內容閘（purge-file）   外來檔案/skill/agent 先被掃描
  → 指令閘（sandbox-guard）每條 Bash 指令先被攔截檢查
  → 權限閘（deny/allow）   危險動作直接擋、安全動作免問
  → 執行
```

加上你親眼看到的**權限提問**，總共構成「人 + 三道閘」的防護。

---

## 第一線：權限提問（你親自放行）

Claude Code 執行 Bash、改檔案前會問你。**你看過才放行**——人在迴圈裡，這是最重要的一道。下面三道閘是後盾，讓你就算放行也有保護、且常用動作可以不必每次問。

---

## 閘 1：內容閘（purge-file）

任何**外來內容**（檔案、外部 skill、外部 agent）一律先落在 `99_TEMP/` 暫存區（內容 gitignore），進系統前先由 `purge-file` 在那裡掃描：
- 可執行碼、寫死的憑證/token、可疑檔案、過大檔、prompt injection
- **intent-mismatch**：宣稱用途 vs 實際行為是否一致（skill/agent 尤其要查）

flagged → 移 `data/quarantine/`、回報，不放置。**沒有東西能略過 purge 進系統。** 放置完成後會問你要不要刪掉 `99_TEMP/` 的原始檔。

## 閘 2：指令閘（sandbox-guard）

`Skills/purge-file/scripts/sandbox-guard.sh` 是 PreToolUse hook，每條 Bash 指令先過它（**allowlist 不會 bypass 這道**）。5 道檢查：

| # | 檢查 | 擋掉 |
|---|------|------|
| 1 | 危險指令 | `rm`（**全部**，非只 -rf）、`sudo`、`chmod`、`chown`、`curl`、`wget`、`ssh`、`dd`、`kill`、`shutdown`、`eval`、`exec`… |
| 2 | 路徑跳脫 | 含 `../` 想逃出專案 |
| 3 | 家目錄 | 任何 `~/` 路徑 |
| 4 | 專案外絕對路徑 | 專案外的 `/...`（少數系統路徑除外，見已知缺口） |
| 5 | 直接 HTTP | 程式內 `fetch()`、`http.request`、`requests.get`… → 連網走 MCP |

這是**強化版**：第 1 道擋所有 `rm`、第 3 道擋 `~/`。

## 閘 3：權限閘（deny / allow，由 `safety-aipm` 管）

`.claude/settings.json` 的 `permissions`，優先序 **deny > ask > allow**：

- **`deny`（黑名單）**：列在這裡的動作 Claude Code **直接拒絕**。本包**預設出貨**就帶一份（與 sandbox-guard 雙保險）：
  `rm`、`sudo`、`git push --force`/`-f`、`git reset --hard`、`git clean`、`shutdown`/`reboot`、`dd`/`mkfs`、`curl`/`wget`。
- **`ask`**：`git`（全系列）放這裡——**每次都會問你**。放行所有 `git` 太寬，所以不進白名單；真正危險的 `git push --force`／`reset --hard`／`clean` 另由 `deny` 直接擋。
- **`allow`（白名單）**：列在這裡的動作**不必每次問**。本包預設只放唯讀/安全類（mkdir、mv、cp、ls、cat、echo、pwd、head、tail、grep、find、npm install、npm run、釘死的 today.sh、gcal 唯讀）。

要檢視/增修 deny/allow，跑 **`/safety-aipm`**（owner：the-gatekeeper）。
deny 永遠優先——開白名單不會把危險的放出來。

### Allowlist 設計原則（重要）
- 比對的是**指令前綴字串**：`Bash(cat:*)` 放行所有 `cat ...`。
- **不要放行 `bash:*`、`node:*`、`python:*`**：那能跑任意程式，等於架空權限層。要免問某腳本就**釘死整條路徑**（如 `Bash(bash Skills/manage-planner/scripts/today.sh)`）。

## 權限模式（acceptEdits）

本包**刻意不開** `acceptEdits`——AI 每次改檔都會問你。學習階段最安全。熟了想少被打斷，見 `05-sandbox-guard.md`。

---

## 已知缺口（誠實揭露）

- **專案內寫檔繞道**：`echo > 檔案`、`cat > 檔案` 能在專案內寫檔（規劃工具本來就要寫檔），sandbox-guard 不擋；但 `rm` 已全擋（deny + guard 雙重），指令列刪檔擋住——要刪檔請在編輯器手動刪。
- **少數系統路徑**：第 4 道仍放行 `/tmp`、`/Library`、`/usr/bin` 等（執行 node 等所需）。要更嚴見 `05-sandbox-guard.md` 反向收緊。
- **比對靠正則**：刻意混淆有可能繞過字串比對。**第一線「權限提問」才是真正擋下未知行為的關鍵——別把什麼都加進 allowlist。**

## 心法

- 看不懂它要跑什麼 → **先別放行**，請它解釋。
- 清單越短越安全。
- 要放寬 → 讀 [05-sandbox-guard.md](05-sandbox-guard.md)，知道自己在放寬什麼再動手。