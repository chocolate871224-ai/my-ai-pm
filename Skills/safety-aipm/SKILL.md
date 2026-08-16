---
name: safety-aipm
description: >
  權限閘設定。檢視與增修 .claude/settings.json 的 permissions.deny（危險動作黑名單）與
  permissions.allow（安全動作白名單）。當使用者輸入 /safety-aipm，或說「設定安全防護」
  「設權限」「不想每次按允許」「太多允許很煩」「自動允許」「白名單」「黑名單」時觸發。
  預設繁體中文，回應跟隨使用者語言。
---

# /safety-aipm · 權限閘設定

> 三道安全閘的第三道（權限閘）。由 **the-gatekeeper** 掌管。
> 另兩道：內容閘（purge-file）、指令閘（sandbox-guard）。三道的完整說明見 `doc/SECURITY.md`。

## 這個 skill 管什麼

`.claude/settings.json` 的 `permissions`：
- **`deny`** — 黑名單：列在這裡的動作 Claude Code **直接拒絕**。
- **`allow`** — 白名單：列在這裡的動作**不必每次問**、直接執行。
- 優先序 **deny > ask > allow**（deny 最強，開白名單不會把危險的放出來）。

## 何時觸發
- `/safety-aipm`、「設權限」、「不想每次按允許」、「太多允許很煩」、「自動允許」、「白名單」、「黑名單」

## 執行

### Step 1 — 讀現況
讀 `.claude/settings.json`（本包**預設已帶**一份 `permissions.deny` 黑名單 + 一份精實 `allow`）。
- 檔案壞掉/非合法 JSON → **先告訴使用者、不要硬寫**。
- 顯示目前的 deny / allow 給使用者看。

### Step 2 — 黑名單（deny，安全地板）
確認預設黑名單在位（與 `sandbox-guard.sh` 雙保險）。典型項目：
`rm`、`sudo`、`git push --force`/`-f`、`git reset --hard`、`git clean`、`shutdown`/`reboot`、`dd`/`mkfs`、`curl`/`wget`。
使用者要加更多危險動作 → append 到 `permissions.deny`，保留既有。

### Step 3 — 白名單（allow，可選，少被打斷）
問使用者要不要把常用又安全的動作設成自動放行。提供分級：
- **輕度**：唯讀類（`Read`、`Bash(ls:*)`、`Bash(cat:*)`、`Bash(git status:*)`、`Bash(git log:*)`）
- **標準**：輕度 + `Bash(npm run:*)`、`mcp__gcal__gcal_list_events`（`git` 維持 `ask`、不放白名單——放行所有 git 太寬，危險的另有 deny）
- **自訂**：使用者指定哪些重複又安全
append 到 `permissions.allow`，保留既有。

### Step 4 — 回報
```
✅ 權限設好了
- 黑名單（deny）：N 條，危險動作會被直接擋
- 白名單（allow）：你選的是 [輕度/標準/自訂]，這些動作不再每次問：[列出]
deny > ask > allow——危險的永遠擋，沒列到的照樣會先問你。
```
提醒：改完 settings.json 要**重啟 Claude Code** 才生效。

## DO / DO NOT
- **DO** 保留既有設定（merge，不覆蓋）；deny 永遠優先。
- **DO** 解釋每條在放寬/收緊什麼。
- **DO NOT** 在使用者沒同意下開大白名單。
- **DO NOT** settings.json 壞掉還硬寫。
- **DO NOT** 把 `Bash(bash:*)`/`Bash(node:*)`/`Bash(python:*)` 放進白名單（會架空權限層）。

## 關聯
放寬 sandbox-guard 規則（不只 deny/allow）見 [05-sandbox-guard.md](../../98_DOC/05-sandbox-guard.md)。
