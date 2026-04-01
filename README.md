# Claude Notify Dashboard

Windows 11 專用的 Claude Code 多工管理桌面應用。
在單一視窗中管理多個 Claude Code session，提供即時狀態監控與完成通知，解決多視窗切換不知道哪個跑完了的問題。

## 功能特色

### 已實作
- **多 Session 終端管理** — 以分頁方式同時開啟多個 Claude Code session
- **即時狀態監控** — 自動偵測每個 session 的狀態（starting / running / idle / exited）
- **Windows Toast 通知** — Claude 完成回應時自動推送桌面通知 + 音效
- **暗色主題 UI** — 深色介面，長時間使用不傷眼
- **Git Diff 面板** — 顯示當前工作目錄的 git 變更統計
- **拖曳排序** — 側邊欄 session 可拖曳重新排列
- **純通知模式** — 不需 Dashboard，只用 PowerShell 腳本接收通知

### 規劃中
- **外部 Session 偵測** — 自動偵測所有外部啟動的 Claude Code 程序，顯示狀態並在完成時通知
- **視窗跳轉** — 點擊外部 session 直接跳轉到對應的 PowerShell 視窗
- **PowerShell 底層** — 內部 session 改用 PowerShell 啟動 Claude，環境與平常一致

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

## 快速開始（純通知模式）

不需要 Dashboard，只想在 Claude Code 完成時收到 Windows Toast 通知：

```powershell
cd <你的 claude-notify 目錄>
powershell -ExecutionPolicy Bypass -File install.ps1
```

腳本會自動將 Stop hook 寫入 `~\.claude\settings.json`，重新開啟 Claude Code session 即生效。

移除通知：

```powershell
powershell -ExecutionPolicy Bypass -File uninstall.ps1
```

## 操作說明

### Session 管理

| 操作 | 方式 |
|------|------|
| 新增 Session | 點擊 `+` 按鈕 或 `Ctrl+T` |
| 切換 Session | 點擊 Tab 或 `Ctrl+1` ~ `Ctrl+9` |
| 關閉 Session | `Ctrl+W` |
| 重新命名 Session | 雙擊側邊欄名稱 |

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
│   │   ├── pty-manager.ts     # node-pty 終端管理
│   │   ├── session-manager.ts # Session 生命週期
│   │   ├── status-detector.ts # 狀態偵測引擎
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
│   │   ├── components/        # UI 元件（14 個）
│   │   ├── hooks/             # 自訂 Hooks（5 個）
│   │   ├── stores/            # Zustand 狀態管理（5 個）
│   │   └── styles/            # 全域樣式
│   └── shared/                # 共用型別與常數
├── notify-done.ps1            # 純通知模式腳本
├── install.ps1                # 純通知模式安裝
├── uninstall.ps1              # 純通知模式移除
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

## 開發指南

### 架構分層

- **Main Process** (`src/main/`) — Node.js 環境，負責 PTY 管理、系統通知、視窗管理等
- **Preload** (`src/preload/`) — contextBridge 安全橋接，定義 Renderer 可呼叫的 API
- **Renderer** (`src/renderer/`) — 瀏覽器環境，React + Tailwind 負責 UI 呈現與互動

### 常用指令

```bash
npm run dev        # 開發模式（含 HMR）
npm run build      # 編譯產出
npm run package    # 打包為安裝檔
npm run typecheck  # TypeScript 型別檢查
```

## License

MIT
