# Claude Notify — 待開發清單

## 為什麼要做這個工具

在日常開發中，經常需要同時開啟多個 Claude Code 視窗並行處理不同任務。
當一個視窗的任務在跑時，會切換到其他視窗繼續工作，但 Claude Code 完成後**完全沒有任何通知**，
經常是任務跑完 5 分鐘甚至更久才發現，嚴重影響開發效率和工作節奏。

## 解決了什麼問題

- **即時感知**：不需要不斷手動切換視窗檢查，完成時自動收到 Windows 通知
- **減少空等時間**：任務完成後能立刻切回處理，不再浪費等待時間
- **多工效率提升**：放心地在多個視窗間切換，不怕遺漏任何完成的任務
- **零侵入性**：利用 Claude Code 原生 Hook 機制，不需額外背景程式或改動 Claude Code 本身
- **不改變習慣**：繼續在 PowerShell 開 claude，Dashboard 自動偵測並監控所有 session

## 開發階段

### Phase 1-3：基礎功能（已完成）
- [x] Electron + React + xterm.js 基礎骨架
- [x] 多 Session 終端管理（內部 session）
- [x] Windows Toast 通知

### Phase 4：UI 美化
- [ ] 暗色主題精修（配色、字體）
- [ ] Session 重命名（雙擊編輯）
- [ ] 拖拽排序
- [ ] 快捷鍵（Ctrl+T/W/1~9）
- [ ] 分割畫面（左右同時顯示兩個終端）
- [ ] System Tray 常駐
- [ ] 記住視窗大小和位置

### Phase 5：進階功能
- [ ] Git diff 面板
- [ ] 快速指令範本
- [ ] Session 範本
- [ ] 終端內搜尋（Ctrl+F）
- [ ] 匯出對話為 .txt
- [ ] 通知歷史
- [ ] 使用統計

### Phase 6：打包發布
- [ ] NSIS 安裝檔
- [ ] 自動更新（GitHub Releases）
- [ ] 可攜版（.zip）
- [ ] 開機自動啟動

### Phase 7：外部 Session 偵測與視窗跳轉（核心需求）

這是最貼近原始需求的功能 — 不改變使用者習慣，自動偵測並監控所有外部 Claude Code session。

- [ ] **程序掃描器**：定時掃描所有 `claude.exe` 程序，取得 PID + 工作目錄 + 父程序 PID
- [ ] **自動加入列表**：新偵測到的 claude 程序自動出現在側邊欄「外部偵測」區塊
- [ ] **狀態追蹤**：透過程序存活檢查 + Stop hook 回報，判斷 running / done / exited
- [ ] **完成通知**：外部 session 完成時發送 Windows Toast 通知
- [ ] **視窗跳轉（核心）**：點擊外部 session → 找到父程序 PowerShell 的視窗 → SetForegroundWindow 帶到前景
- [ ] **排除自身**：Dashboard 內部啟動的 claude 不重複出現在外部列表
- [ ] **UI 區分**：內部 session 和外部 session 視覺上明確區分

#### 視窗跳轉技術方案
1. 從 `claude.exe` PID → `Get-CimInstance Win32_Process` 取得 `ParentProcessId`
2. 父程序（PowerShell / Windows Terminal）→ `Get-Process -Id` 取得 `MainWindowHandle`
3. 呼叫 `SetForegroundWindow` + `ShowWindow(SW_RESTORE)` 帶到前景

#### Stop Hook 回報機制
修改 `notify-done.ps1`，完成時透過 HTTP POST 回報 Dashboard（`localhost:23847`）：
- 回報內容：PID、工作目錄
- Dashboard 收到後更新對應 session 狀態為 done

### Phase 8：內部 Session 改用 PowerShell 底層
- [ ] PTY spawn 改為啟動 PowerShell，再由 PowerShell 執行 claude
- [ ] 環境變數和 PATH 與使用者平常一致
- [ ] claude 結束後回到 PS 提示符（可繼續操作）
- [ ] 終端尺寸同步更穩定（PowerShell 正確處理 ConPTY resize）

## 優化項目

### 通知優化
- [ ] 智慧通知門檻（回應耗時超過 N 秒才通知）
- [ ] 自訂通知音效
- [ ] 勿擾模式（排程靜音）
- [ ] 錯誤通知區分（Stop vs StopFailure）

### 效能優化
- [ ] 非活躍終端不渲染（降低記憶體佔用）
- [ ] electron-store 資料上限清理（通知歷史保留 1000 筆）
- [ ] 限制最大 session 數（建議 10）

### 未來可能
- [ ] 跨機器通知（LINE Notify / Telegram Bot / Discord webhook）
- [ ] SubAgent 通知（監聽 SubagentStop 事件）
