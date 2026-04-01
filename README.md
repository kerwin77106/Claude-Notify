# Claude Notify Dashboard

Windows 11 專用的 Claude Code 多工管理桌面應用。
在單一視窗中管理多個 Claude Code session，提供即時狀態監控與完成通知，解決多視窗切換不知道哪個跑完了的問題。

## 功能特色

### 內部 Session（Dashboard 內開啟）
- **多 Session 終端管理** — 以分頁方式同時開啟多個 Claude Code session
- **即時狀態監控** — 自動偵測每個 session 的狀態（starting / running / idle / exited）
- **Windows Toast 通知** — Claude 完成回應時自動推送桌面通知 + 音效
- **暗色主題 UI** — 深色介面，長時間使用不傷眼
- **PowerShell 底層** — 內部 session 用 PowerShell 啟動 Claude，環境與平常一致

### 外部 Session 偵測（Hook-driven）
- **自動偵測** — 不管從 PowerShell、Windows Terminal、Explorer 網址列開的 claude，都會自動出現在 Dashboard
- **視窗跳轉** — 點擊外部 session 直接跳轉到對應的終端視窗
- **完成通知** — 外部 session 完成時一樣會收到 Toast 通知
- **零掃描** — 利用 Claude Code Hook 機制主動回報，不做任何程序掃描，完全無 lag

### 純通知模式
- 不需要 Dashboard，只用 PowerShell 腳本接收完成通知

## 系統需求

- Windows 10 / 11
- Node.js 20+
- Claude Code CLI（已安裝並可執行 `claude`）

## 快速開始（Dashboard 模式）

```bash
# 1. 取得原始碼
git clone https://github.com/kerwin77106/Claude-Notify.git
cd Claude-Notify

# 2. 安裝相依套件
npm install

# 3. 開發模式啟動
npm run dev

# 4. 打包為可執行檔
npm run build
npm run package
```

啟動 Dashboard 後，需要安裝 Hook 才能偵測外部 session：

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

新開的 Claude Code session 會自動回報給 Dashboard。

## 快速開始（純通知模式）

不需要 Dashboard，只想在 Claude Code 完成時收到 Windows Toast 通知：

```powershell
cd <你的 claude-notify 目錄>
powershell -ExecutionPolicy Bypass -File install.ps1
```

腳本會自動將 Hook 寫入 `~\.claude\settings.json`，重新開啟 Claude Code session 即生效。

移除：

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

## 運作原理

### 外部 Session 偵測（Hook-driven 架構）

```
你在任意終端開啟 claude
  → Claude Code 觸發 SessionStart hook
    → hook-report.ps1 找到終端視窗 HWND + 回報 Dashboard
      → Dashboard 側邊欄顯示新的外部 session

Claude Code 完成回應
  → 觸發 Stop hook → hook-report.ps1 回報 Dashboard
    → Dashboard 更新狀態為 done + 彈 Toast 通知

你在 Dashboard 點擊外部 session
  → Dashboard 用儲存的 HWND 呼叫 SetForegroundWindow
    → 直接跳轉到那個終端視窗
```

不做任何程序掃描，完全靠 Hook 事件驅動，零 CPU 消耗、零延遲。

## 操作說明

### Session 管理

| 操作 | 方式 |
|------|------|
| 新增內部 Session | 點擊 `+` 按鈕 或 `Ctrl+T` |
| 切換內部 Session | 點擊 Tab 或 `Ctrl+1` ~ `Ctrl+9` |
| 關閉內部 Session | `Ctrl+W` |
| 跳轉外部 Session | 點擊側邊欄「外部」區塊的 session |
| 重新命名 | 雙擊側邊欄名稱 |

### 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl+T` | 新增 Session |
| `Ctrl+W` | 關閉目前 Session |
| `Ctrl+1` ~ `Ctrl+9` | 切換到第 N 個 Session |
| `Ctrl+Tab` | 切換到下一個 Session |
| `Ctrl+Shift+Tab` | 切換到上一個 Session |
| `Ctrl+F` | 終端內搜尋 |

## 專案結構

```
claude-notify/
├── src/
│   ├── main/                  # Electron 主程序
│   │   ├── index.ts           # 應用程式進入點
│   │   ├── pty-manager.ts     # node-pty 終端管理（PowerShell 底層）
│   │   ├── session-manager.ts # Session 生命週期
│   │   ├── status-detector.ts # 狀態偵測引擎
│   │   ├── hook-server.ts     # HTTP server 接收 Hook 回報 (port 23847)
│   │   ├── focus-window.ts    # Win32 SetForegroundWindow 跳轉
│   │   ├── notification-manager.ts  # 通知管理
│   │   ├── settings-manager.ts # 設定管理（electron-store）
│   │   ├── ipc-handler.ts     # IPC 通訊處理
│   │   ├── window-manager.ts  # 視窗管理
│   │   ├── tray-manager.ts    # 系統匣管理
│   │   ├── git-service.ts     # Git 操作服務
│   │   └── stats-service.ts   # 統計資料服務
│   ├── preload/               # Preload 腳本（安全橋接）
│   │   └── index.ts
│   ├── renderer/              # React 前端
│   │   ├── App.tsx
│   │   ├── components/        # UI 元件
│   │   ├── hooks/             # 自訂 Hooks
│   │   ├── stores/            # Zustand 狀態管理
│   │   └── styles/            # 全域樣式
│   └── shared/                # 共用型別與常數
├── scripts/
│   ├── hook-report.ps1        # Hook 回報腳本（SessionStart/Stop/End）
│   └── focus-hwnd.ps1         # 視窗跳轉腳本（Win32 API）
├── notify-done.ps1            # 純通知模式腳本
├── install.ps1                # Hook 安裝
├── uninstall.ps1              # Hook 移除
├── electron.vite.config.ts    # Electron Vite 設定
├── package.json
└── tsconfig.json
```

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Electron 34 |
| 前端 | React 19 + TypeScript |
| 終端模擬 | xterm.js 5 + node-pty |
| 樣式 | Tailwind CSS 4 |
| 狀態管理 | Zustand 4 |
| 持久化儲存 | electron-store |
| 建構工具 | electron-vite 5 + Vite 6 |
| 打包 | electron-builder |
| 外部偵測 | Claude Code Hooks + HTTP server |
| 視窗跳轉 | Win32 SetForegroundWindow + AttachThreadInput |

## 開發指南

### 架構分層

- **Main Process** (`src/main/`) — Node.js 環境，負責 PTY 管理、Hook server、通知、視窗管理
- **Preload** (`src/preload/`) — contextBridge 安全橋接，定義 Renderer 可呼叫的 API
- **Renderer** (`src/renderer/`) — 瀏覽器環境，React + Tailwind 負責 UI 呈現與互動
- **Scripts** (`scripts/`) — PowerShell 腳本，負責 Hook 回報和視窗跳轉

### 常用指令

```bash
npm run dev        # 開發模式（含 HMR）
npm run build      # 編譯產出
npm run package    # 打包為安裝檔
npm run typecheck  # TypeScript 型別檢查
```

## License

MIT
