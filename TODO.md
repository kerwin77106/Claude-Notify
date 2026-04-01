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
- **一鍵跳轉**：點擊外部 session 直接跳到對應的終端視窗

## 開發階段

### Phase 1-3：基礎功能 ✅
- [x] Electron + React + xterm.js 基礎骨架
- [x] 多 Session 終端管理（內部 session）
- [x] Windows Toast 通知

### Phase 7 v2：外部 Session 偵測 + 視窗跳轉（Hook-driven）✅
- [x] **hook-report.ps1**：SessionStart/Stop/End hook 回報腳本
- [x] **Hook Server**：HTTP server (port 23847) 接收 hook 回報，管理外部 session
- [x] **自動偵測**：任意終端開 claude → Dashboard 即時顯示
- [x] **完成通知**：外部 session 完成時彈 Toast 通知
- [x] **視窗跳轉**：點擊外部 session → 用 HWND + AttachThreadInput + SetForegroundWindow 跳轉
- [x] **UI 區分**：側邊欄「外部」標籤 + 跳轉圖示

### Phase 8：PowerShell 底層 ✅
- [x] PTY spawn 改為 PowerShell → claude
- [x] 環境變數和 PATH 與使用者平常一致

### Phase 4：UI 美化（待做）
- [ ] 暗色主題精修（配色、字體）
- [ ] Session 重命名（雙擊編輯）
- [ ] 拖拽排序
- [ ] 快捷鍵（Ctrl+T/W/1~9）
- [ ] 分割畫面（左右同時顯示兩個終端）
- [ ] System Tray 常駐
- [ ] 記住視窗大小和位置

### Phase 5：進階功能（待做）
- [ ] Git diff 面板
- [ ] 快速指令範本
- [ ] Session 範本
- [ ] 終端內搜尋（Ctrl+F）
- [ ] 匯出對話為 .txt
- [ ] 通知歷史
- [ ] 使用統計

### Phase 6：打包發布（待做）
- [ ] NSIS 安裝檔
- [ ] 自動更新（GitHub Releases）
- [ ] 可攜版（.zip）
- [ ] 開機自動啟動

## 待優化項目

### 外部 Session
- [ ] CWD 顯示修正（目前 fallback 到 C:\Users\User，需取得 CLAUDE_PROJECT_DIR 或從 hook stdin 正確解析）
- [ ] 外部 session 的 Stop 通知（完成時推送 Toast）
- [ ] 多個外部 session 同時偵測測試
- [ ] Dashboard 內部 session 排除（避免重複顯示）

### 終端渲染
- [ ] 終端尺寸同步修正（選單文字重疊問題）
- [ ] fit addon 初始化時機優化

### 通知優化
- [ ] 智慧通知門檻（回應耗時超過 N 秒才通知）
- [ ] 自訂通知音效
- [ ] 勿擾模式（排程靜音）
- [ ] 錯誤通知區分（Stop vs StopFailure）

### 效能優化
- [ ] 非活躍終端不渲染（降低記憶體佔用）
- [ ] electron-store 資料上限清理
- [ ] 限制最大 session 數

### 未來可能
- [ ] 跨機器通知（LINE Notify / Telegram Bot / Discord webhook）
- [ ] SubAgent 通知（監聽 SubagentStop 事件）
