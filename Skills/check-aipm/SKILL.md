---
name: check-aipm
description: >
  ai-pm-starter 安裝/設定健檢。檢查結構完整、腳本可執行、sandbox-guard 實測有效、
  設定檔正確、三道安全閘到位，以及選配模組狀態（GitHub / Node / gcal）。當使用者輸入
  /check-aipm，或說「健檢」「裝好了嗎」「設定還正常嗎」「檢查一下」「東西壞了」時觸發。
  預設繁體中文，回應跟隨使用者語言。
---

# /check-aipm · 安裝/設定健檢

> 像體檢：實測現況，不是猜。輸出 ✅/❌/⚠️ + 修復路徑。

## 何時觸發
- `/check-aipm`、「健檢」、「裝好了嗎」、「設定還正常嗎」、「檢查一下」、「東西壞了/發不出去」

## 執行
1. 跑掃描腳本：
   ```bash
   bash Skills/check-aipm/scripts/check-aipm.sh
   ```
   它會檢查：3 agents、關鍵 skills、0_Planner 範本、腳本可執行、**sandbox-guard 實測（pipe rm 確認被擋）**、`today.sh`、`.mcp.json`（只 gcal）、`settings.json`（deny 黑名單 + sandbox hook）、模組狀態（git remote / Node / gcal mock|real）。
2. 把輸出整理成人話報告，每項 ✅/❌/⚠️。
3. **對每個 ❌/⚠️ 給具體修復**：
   - **`.claude/skills` 鏡像缺項**（`Skills/` 有、鏡像沒有，斜線指令會叫不出來）→ **直接跑 `cp -r Skills/* .claude/skills/` 自動補齊**（等同 `npm run skills:sync`，用 `cp` 不需要 Node），補完重報一次——不用叫使用者手動處理。
   - 缺結構/設定 → 跑 `/setup-aipm` 或指出該補的檔
   - sandbox-guard 沒擋 rm → 嚴重，指 `Skills/purge-file/scripts/sandbox-guard.sh` 與 `doc/SECURITY.md`
   - 缺 deny 黑名單 → 跑 `/safety-aipm`
   - 模組未設 → 說明那是選配（要才設）

## 誠實原則（做得到 vs 做不到）
- 只報**實測**結果，不假裝預測未來（例如不宣稱 token 幾天後過期）。
- 模組「未設」不是錯——核心軌不需要它們，標 ⚠️ 提示即可。

## Usage（npm 無；直接跑腳本）
| 指令 | 用途 |
|------|------|
| `bash Skills/check-aipm/scripts/check-aipm.sh` | 印出結構+安全+模組健檢報告（✅/❌/⚠️） |

預期輸出結尾：`── 結果：✅ N　❌ N　⚠️ N ──`。`❌ 0` 代表結構與安全 OK。
