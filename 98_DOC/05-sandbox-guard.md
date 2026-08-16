# sandbox-guard：怎麼運作、怎麼用（含放寬）

`sandbox-guard` 是指令閘（`Skills/purge-file/scripts/sandbox-guard.sh`，PreToolUse hook），每條 Bash 指令執行前都先過它。整套三道閘的全貌見 [04-security.md](04-security.md)；這份專講**怎麼用它、以及怎麼有意識地放寬／收緊**。

預設刻意偏嚴。等你熟了、或有實際需求，再照這份**有意識地**放寬。每放寬一項，先讀 [04-security.md](04-security.md) 知道自己在拿掉哪道防線。

> 動 `.claude/settings.json` 後，**重啟 Claude Code** 才會生效。
> 最簡單的方式是跑 **`/safety-aipm`**（由 the-gatekeeper 管），它會帶你檢視/增修 deny 與 allow；下面是手動細節。

---

## 0. deny / allow 的關係（先懂這個）

`permissions` 優先序 **deny > ask > allow**：
- `deny`（黑名單）= 直接拒絕，最強。本包預設帶一份（rm、sudo、force push、reset --hard、clean、shutdown、dd/mkfs、curl/wget）。
- `allow`（白名單）= 不必每次問。
- 兩者沒列到的 → 照樣問你（ask）。

**收緊** = 往 `deny` 加；**放寬** = 往 `allow` 加（或縮短 deny）。跑 `/safety-aipm` 最快。

## 1. 讓某些指令不必每次問（加進 allowlist）

編 `.claude/settings.json` 的 `permissions.allow`：

```json
"permissions": {
  "allow": [
    "Bash(git:*)",
    "Bash(your-command:*)"
  ]
}
```

- `Bash(指令:*)` 放行所有以該指令開頭的呼叫。
- 想免問某支腳本但又不想開整個解譯器 → **釘死整條路徑**：
  `"Bash(bash Skills/manage-planner/scripts/today.sh)"`
- ⚠️ **別加** `Bash(bash:*)`、`Bash(node:*)`、`Bash(python:*)`、`Bash(sh:*)`：這些能執行任意程式，等於把第一道防線整個關掉。

## 2. 少被打斷：開啟 acceptEdits

讓 AI 改檔案不必每次問（Bash 仍照 allowlist／提問）：

```json
"permissions": {
  "defaultMode": "acceptEdits",
  "allow": [ ... ]
}
```

或執行期間用 `/permissions` 切換模式。建議**自己的檔案熟悉後再開**。

## 3. 放寬 sandbox-guard 規則（最後手段）

直接編 `Skills/purge-file/scripts/sandbox-guard.sh`。常見鬆綁：

**a) 允許 `rm`（指令列刪檔）**
把第 1 道的 `\brm\b` 改回只擋 `\brm -rf\b`：
```bash
BLOCKED_COMMANDS="\brm -rf\b|\bsudo\b|..."   # 其餘不變
```
（風險：AI 能在專案內刪檔。建議仍只在你信任的流程裡開。）

**b) 允許某條外部絕對路徑**
在第 4 道的 `case` 允許清單加上你的路徑：
```bash
case "$P" in
  "$PROJECT_ROOT"*|/tmp*|/your/allowed/path/*) ;;   # Allowed
  *) echo "BLOCKED: ..." >&2; exit 2 ;;
esac
```

**c) 允許特定家目錄路徑**
第 3 道是「見 `~` 即擋」。要放行特定 `~/` 路徑，改成只在不符白名單時才擋——但這通常代表你該把資料移進專案，三思。

## 4. 反向：收得更緊（建議的話）

- **拿掉系統路徑**：從第 4 道 `case` 刪掉 `/tmp*`、`/Library/*`，把可寫的外部面積縮到最小。
- **縮短 allowlist**：刪掉你其實不常用的（如 `find`、`grep`），回到逐次提問。

---

## 改完檢查

```bash
# 確認 hook 還能跑、語法沒壞
printf '%s' '{"tool_input":{"command":"ls"}}' | bash Skills/purge-file/scripts/sandbox-guard.sh && echo "OK"
```

`OK` = 通過。改完務必重啟 Claude Code。
