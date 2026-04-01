# Claude Notify Dashboard — 技術規格書

## 專案概述

### 目標
打造一個 Windows 11 原生桌面應用程式，在單一視窗中管理多個 Claude Code CLI session，
提供即時終端輸出、狀態監控、完成通知等功能，解決多視窗切換造成的效率損失問題。

### 核心問題
- 同時開多個 Claude Code 視窗時，完成後沒有通知，經常 5 分鐘後才發現
- 不斷手動切換視窗檢查狀態，打斷工作節奏
- 無法一眼掌握所有 session 的進度

### 設計原則
- **Windows-first**：從一開始就針對 Windows 11 設計，不做跨平台妥協
- **輕量精簡**：只做真正需要的功能，不複製 Superset 全部功能
- **漸進式開發**：每個 Phase 都是可用的完整產品，後續 Phase 是加值

---

## 技術棧

| 類別 | 技術 | 選擇原因 |
|------|------|----------|
| 桌面框架 | Electron 34+ | 成熟穩定、xterm.js 原生支援、Windows 相容性好 |
| 前端框架 | React 19 + TypeScript | 元件化開發、生態系豐富 |
| 建置工具 | Vite + electron-vite | 快速 HMR、Electron 整合良好 |
| 終端模擬 | xterm.js 5.x | 業界標準終端渲染（VS Code / Superset 同款） |
| 虛擬終端 | node-pty | Windows ConPTY 支援、完整彩色輸出 |
| 樣式 | Tailwind CSS 4 | 快速開發暗色主題 UI |
| 狀態管理 | Zustand | 輕量、簡單、不需樣板程式碼 |
| 打包 | electron-builder | Windows NSIS installer 輸出 |

---

## Phase 1：單一終端視窗（基礎骨架）

### 目標
建立 Electron 應用基礎架構，能在視窗中啟動並操作一個 Claude Code session。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P1-01 | Electron 視窗 | 啟動後顯示一個暗色主題視窗（1200x800 預設大小） |
| P1-02 | 終端渲染 | 視窗中嵌入 xterm.js 終端，支援彩色輸出、捲動、選取複製 |
| P1-03 | 啟動 Claude Code | 透過 node-pty 在指定工作目錄啟動 `claude` CLI |
| P1-04 | 雙向互動 | 使用者可在終端中輸入文字，與 Claude Code 正常互動 |
| P1-05 | 視窗標題 | 顯示當前工作目錄名稱 |

### 技術實作

#### 專案結構
```
claude-notify/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── electron/
│   ├── main.ts              ← Electron 主程序、視窗管理
│   ├── preload.ts           ← contextBridge 暴露 IPC API
│   └── pty-manager.ts       ← node-pty 封裝：spawn / write / resize / kill
├── src/
│   ├── main.tsx             ← React 進入點
│   ├── App.tsx              ← 主畫面容器
│   ├── components/
│   │   └── Terminal.tsx     ← xterm.js 終端元件
│   └── styles/
│       └── global.css       ← Tailwind + xterm 樣式覆寫
└── resources/
    └── icon.ico             ← 應用程式圖示
```

#### IPC 通訊設計
```
Renderer (React)          Main (Electron)
     │                         │
     │── pty:create ──────────>│  建立 PTY 程序
     │── pty:write ───────────>│  傳送使用者輸入
     │── pty:resize ──────────>│  終端尺寸變更
     │── pty:kill ────────────>│  終止程序
     │                         │
     │<─── pty:data ───────────│  終端輸出資料
     │<─── pty:exit ───────────│  程序結束事件
```

#### node-pty 啟動參數
```typescript
const pty = spawn('claude', [], {
  name: 'xterm-256color',
  cols: 120,
  rows: 30,
  cwd: workingDirectory,
  env: { ...process.env, FORCE_COLOR: '1' },
  useConpty: true  // Windows ConPTY
});
```

### 驗收條件
- [ ] 雙擊 exe 或 `npm run dev` 可啟動視窗
- [ ] 視窗中顯示 xterm.js 終端
- [ ] 能自動或手動啟動 Claude Code
- [ ] 可以正常輸入提示詞、看到 Claude 的回應
- [ ] 彩色輸出正確顯示（ANSI escape codes）
- [ ] 終端可捲動、可選取文字複製

---

## Phase 2：多 Session 管理（核心功能）

### 目標
支援同時管理多個 Claude Code session，左側欄顯示列表，中間區域切換顯示不同終端。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P2-01 | Session 列表 | 左側欄顯示所有 session，包含名稱、狀態、工作目錄 |
| P2-02 | 新增 Session | 點擊「+」按鈕，選擇工作目錄後啟動新的 Claude Code |
| P2-03 | Tab 切換 | 頂部 Tab 列或點擊左側欄切換不同 session 的終端畫面 |
| P2-04 | 關閉 Session | 可關閉單一 session（終止 Claude Code 程序） |
| P2-05 | 狀態指示 | 每個 session 顯示狀態：啟動中 / 執行中 / 等待輸入 / 已結束 |
| P2-06 | Session 保持 | 切換 Tab 時，非活躍 session 的終端狀態不會遺失 |

### UI 佈局設計

```
┌──────────────────────────────────────────────────────┐
│  Claude Notify                              ─  □  ✕  │
├────────┬─────────────────────────────────────────────┤
│        │  [Session 1] × [Session 2] × [Session 3] + │
│ ● Proj │─────────────────────────────────────────────│
│   A    │                                             │
│        │  $ claude                                   │
│ ◉ Proj │  Claude Code v2.x.x                        │
│   B    │                                             │
│        │  > 請幫我修改 login 功能...                  │
│ ● Proj │                                             │
│   C    │  我來看看 login 相關的程式碼...               │
│        │  [正在執行中...]                              │
│        │                                             │
│        │                                             │
│        │                                             │
├────────┴─────────────────────────────────────────────┤
│  3 sessions │ 1 running │ 1 waiting │ 1 done         │
└──────────────────────────────────────────────────────┘

左側欄圖示說明：
  ● 綠色圓點 = 執行中（Claude 正在回應）
  ◉ 黃色圓點 = 等待輸入（Claude 已完成回應，等你下指令）
  ○ 灰色圓點 = 已結束
```

### 技術實作

#### 新增檔案
```
├── electron/
│   └── pty-manager.ts       ← 擴充：管理多個 PTY instance（Map<sessionId, PtyProcess>）
├── src/
│   ├── App.tsx              ← 改為三欄佈局
│   ├── components/
│   │   ├── Sidebar.tsx      ← 左側 session 列表
│   │   ├── TabBar.tsx       ← 頂部 Tab 列
│   │   ├── Terminal.tsx     ← 終端元件（支援隱藏/顯示切換）
│   │   ├── NewSession.tsx   ← 新增 session 對話框（選擇資料夾）
│   │   └── StatusBar.tsx    ← 底部狀態列
│   └── stores/
│       └── session-store.ts ← Zustand store：session 狀態管理
```

#### Session 資料模型
```typescript
interface Session {
  id: string;                          // UUID
  name: string;                        // 顯示名稱（工作目錄名稱）
  cwd: string;                         // 工作目錄完整路徑
  status: 'starting' | 'running' | 'idle' | 'exited';
  createdAt: number;                   // 建立時間戳
  lastActivityAt: number;              // 最後活動時間戳
}
```

#### 狀態偵測邏輯
```
終端輸出持續產生中   → status = 'running'（綠色）
輸出停止 + 出現 > 提示符  → status = 'idle'（黃色）
PTY 程序結束        → status = 'exited'（灰色）
```

具體實作方式：
- 監聽 `pty.onData`，每次收到資料時更新 `lastActivityAt` 並設為 `running`
- 設定一個 2 秒的 debounce timer，若 2 秒內沒有新資料，改為 `idle`
- 監聽 `pty.onExit`，設為 `exited`

### 驗收條件
- [ ] 可同時開啟 3 個以上的 Claude Code session
- [ ] 左側欄正確顯示所有 session 及其狀態
- [ ] 點擊 Tab 或左側欄可切換終端畫面
- [ ] 切換後回來，之前的終端輸出仍完整保留
- [ ] 可關閉單一 session
- [ ] 底部狀態列顯示 session 總數和各狀態數量

---

## Phase 3：通知系統（核心價值）

### 目標
當任何 session 的 Claude Code 完成回應時，發送 Windows 桌面通知，
即使應用程式不在前景也能收到。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P3-01 | 完成通知 | session 從 running 變為 idle 時，發送 Windows Toast 通知 |
| P3-02 | 通知內容 | 顯示專案名稱 + 「Claude Code 已完成回應」 |
| P3-03 | 點擊跳轉 | 點擊通知後，將視窗帶到前景並切換到對應的 session Tab |
| P3-04 | 音效提示 | 通知附帶系統音效 |
| P3-05 | 通知設定 | 可開關通知、設定靜音時段 |
| P3-06 | 智慧門檻 | 可設定最短執行時間門檻（例如 running 超過 10 秒才通知），避免短回應也跳通知 |

### 技術實作

#### 通知流程
```
pty-manager 偵測到 session 狀態變為 idle
  → 檢查該 session 在 running 狀態持續了多久
    → 若超過門檻（預設 10 秒）
      → Electron Notification API 發送通知
      → 通知帶有 session ID metadata
        → 使用者點擊通知
          → mainWindow.show() + mainWindow.focus()
          → 透過 IPC 通知 Renderer 切換到該 session Tab
```

#### 設定資料模型
```typescript
interface NotifySettings {
  enabled: boolean;                // 是否啟用通知（預設 true）
  soundEnabled: boolean;           // 是否播放音效（預設 true）
  minRunningSeconds: number;       // 最短執行時間門檻（預設 10 秒）
  quietHoursStart: string | null;  // 靜音開始時間（例如 "22:00"，null 表示不啟用）
  quietHoursEnd: string | null;    // 靜音結束時間（例如 "08:00"）
}
```

#### Electron Notification 範例
```typescript
const notification = new Notification({
  title: `Claude Code 已完成`,
  body: `[${session.name}] 任務已完成，請切換回查看結果`,
  icon: path.join(__dirname, '../resources/icon.ico'),
  silent: false
});

notification.on('click', () => {
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send('session:focus', session.id);
});

notification.show();
```

### 驗收條件
- [ ] Claude Code 完成回應後，Windows 右下角出現 Toast 通知
- [ ] 通知顯示正確的專案名稱
- [ ] 點擊通知可跳轉到對應的 session
- [ ] 短回應（< 10 秒）不會觸發通知
- [ ] 可在設定中調整門檻時間
- [ ] 靜音時段內不發通知

---

## Phase 4：UI 美化與體驗優化

### 目標
打磨視覺風格和使用體驗，使其接近 Superset 的質感。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P4-01 | 暗色主題 | 完整的暗色 UI（參考 Superset 配色：深灰背景 + 彩色重點） |
| P4-02 | Session 重命名 | 雙擊左側欄 session 名稱可自訂名稱 |
| P4-03 | 拖拽排序 | 左側欄 session 可拖拽調整順序 |
| P4-04 | 快捷鍵 | Ctrl+T 新增 session / Ctrl+W 關閉 / Ctrl+1~9 切換 Tab |
| P4-05 | 分割畫面 | 支援左右分割，同時顯示兩個終端（類似 VS Code split） |
| P4-06 | 系統列圖示 | 最小化到系統列（System Tray），顯示執行中的 session 數量 |
| P4-07 | 記住視窗狀態 | 關閉時記住視窗大小和位置，下次啟動恢復 |
| P4-08 | 啟動畫面 | 空白狀態顯示歡迎頁面 + 快速開始指引 |

### UI 配色方案（參考 Superset）
```
背景色：     #1a1a2e（深藍灰）
側邊欄背景： #16213e（更深藍灰）
卡片背景：   #0f3460（深藍）
主要文字：   #e0e0e0（淺灰白）
次要文字：   #888888（灰色）
強調色：     #00d4aa（綠色，用於 running 狀態）
警告色：     #f59e0b（黃色，用於 idle 狀態）
連結色：     #60a5fa（藍色）
危險色：     #ef4444（紅色，用於 error）
```

### 快捷鍵定義
```
Ctrl + T         → 新增 Session
Ctrl + W         → 關閉當前 Session
Ctrl + 1~9       → 切換到第 N 個 Tab
Ctrl + Tab       → 切換到下一個 Tab
Ctrl + Shift+Tab → 切換到上一個 Tab
Ctrl + \         → 切換分割畫面
Ctrl + ,         → 開啟設定
```

### 驗收條件
- [ ] 整體 UI 為暗色主題，配色協調
- [ ] 所有快捷鍵正常運作
- [ ] 可分割畫面同時顯示兩個終端
- [ ] 最小化到系統列後，仍能收到通知
- [ ] 視窗大小和位置在重啟後恢復

---

## Phase 5：進階功能（加值項目）

### 目標
加入更多實用功能，提升日常開發效率。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P5-01 | Git 變更摘要 | 右側面板顯示當前 session 工作目錄的 git diff 摘要（新增/修改/刪除行數） |
| P5-02 | 快速指令 | 預設常用提示詞範本（例如「修 bug」「加功能」「code review」），一鍵送出 |
| P5-03 | Session 範本 | 儲存常用的工作目錄 + 初始指令組合，一鍵建立 session |
| P5-04 | 搜尋終端輸出 | Ctrl+F 搜尋當前終端的歷史輸出 |
| P5-05 | 匯出對話 | 將某個 session 的完整終端輸出匯出為文字檔 |
| P5-06 | 通知歷史 | 記錄所有通知的時間和 session，可回顧 |
| P5-07 | 使用統計 | 追蹤每日 session 數量、總使用時間、平均回應時間 |

### Git 變更摘要面板設計
```
┌─ Git 變更 ─────────────┐
│                         │
│  分支：feature/login    │
│  變更：5 files          │
│                         │
│  src/auth/login.ts  +42 │
│  src/auth/types.ts  +15 │
│  src/api/routes.ts  +8  │
│  test/auth.test.ts  +35 │
│  package.json       +2  │
│                         │
│  合計：+102 / -12       │
│                         │
│  [查看完整 Diff]        │
└─────────────────────────┘
```

實作方式：每隔 5 秒在 session 的 cwd 執行 `git diff --stat` 和 `git branch --show-current`，
透過 IPC 傳回前端渲染。

### 驗收條件
- [ ] 右側面板顯示即時 git diff 摘要
- [ ] 快速指令範本可新增、編輯、刪除
- [ ] Ctrl+F 可搜尋終端歷史輸出
- [ ] 可匯出 session 對話為 .txt 檔
- [ ] 通知歷史面板可查看近 7 天的通知紀錄

---

## Phase 6：打包與發布

### 目標
將應用打包為 Windows 安裝檔，方便分享和安裝。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P6-01 | NSIS 安裝檔 | 打包為 `.exe` 安裝檔（Windows Installer） |
| P6-02 | 自動更新 | 透過 GitHub Releases 檢查並下載更新 |
| P6-03 | 可攜版 | 另外提供免安裝的 portable 版本（`.zip`） |
| P6-04 | 開機自動啟動 | 可設定開機時自動啟動（最小化到系統列） |

### electron-builder 配置
```typescript
{
  appId: 'com.claude-notify.app',
  productName: 'Claude Notify',
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'zip', arch: ['x64'] }
    ],
    icon: 'resources/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: 'resources/icon.ico'
  }
}
```

### 驗收條件
- [ ] 執行 `npm run build` 可產出 `.exe` 安裝檔和 `.zip` 可攜版
- [ ] 安裝後桌面和開始選單有捷徑
- [ ] 應用可檢查更新並提示下載
- [ ] 開機自動啟動選項正常運作

---

## 附錄

### A. 系統需求
- Windows 10 21H2+ 或 Windows 11
- Node.js 20+（開發階段）
- Claude Code CLI 已安裝並可在終端執行
- 約 200MB 磁碟空間（安裝後）

### B. 風險與因應

| 風險 | 影響 | 因應方式 |
|------|------|----------|
| node-pty Windows 編譯失敗 | 無法啟動終端 | 使用 prebuild 二進位檔，或改用 node-pty-prebuilt-multiarch |
| Claude Code 輸出格式變更 | idle 偵測失準 | 偵測邏輯以 timeout 為主，不依賴特定輸出格式 |
| Electron 記憶體佔用過高 | 多 session 時卡頓 | 限制最大 session 數（建議 10），非活躍終端不渲染 |
| Windows Defender 誤報 | 安裝被阻擋 | 申請 Windows 程式碼簽章憑證（長期），短期提供 portable zip |

### C. 與現有 notify-done.ps1 的關係
Phase 3 完成後，通知功能由 Electron app 內建處理，不再需要 Stop hook 和 notify-done.ps1。
但 install.ps1 / uninstall.ps1 會保留，供不想使用 Dashboard 的情境下單獨使用通知功能。

---

## Phase 7：外部 Session 偵測與視窗跳轉（核心需求）

### 背景與動機
使用者日常習慣是直接在各專案資料夾開 PowerShell 輸入 `claude` 啟動 Claude Code。
同時開多個視窗時，不知道哪個跑完了，需要逐一切換視窗檢查。
此功能讓 Dashboard 自動偵測所有外部啟動的 Claude Code session，
在完成時發通知，並可一鍵跳轉到對應的 PowerShell 視窗。

### 目標
不改變使用者原有的操作習慣（在 PowerShell 開 claude），
Dashboard 作為「監控中心」自動偵測並追蹤所有 Claude Code 程序狀態。

### 功能需求

| ID | 功能 | 說明 |
|----|------|------|
| P7-01 | 程序掃描 | 定時掃描系統中所有 `claude.exe` 程序，取得 PID、工作目錄、父程序（PowerShell）PID |
| P7-02 | 自動加入 | 偵測到新的 claude 程序時，自動加入 Dashboard 側邊欄，標記為「外部」session |
| P7-03 | 狀態追蹤 | 追蹤外部 session 的執行狀態（running / done / exited），透過程序存活 + Stop hook 回報 |
| P7-04 | 完成通知 | 外部 session 完成時，發送 Windows Toast 通知（同 Phase 3） |
| P7-05 | 視窗跳轉 | 點擊外部 session → 找到父程序（PowerShell）的視窗 handle → SetForegroundWindow 帶到前景 |
| P7-06 | 自動移除 | 外部 claude 程序結束後，從列表中標記為 exited（不立刻移除，供使用者確認） |
| P7-07 | 內外區分 | UI 上明確區分內部 session（有終端畫面）和外部 session（僅狀態監控 + 跳轉） |

### UI 設計

```
左側欄
┌────────────────────────────┐
│ Sessions                   │
│                            │
│ ● my-project               │  ← 內部 session（點擊 → 切換終端）
│   C:\...\my-project        │
│                            │
│ ─── 外部偵測 ──────────── │
│                            │
│ ◉ cli-screenshot [外部]    │  ← 外部 session（點擊 → 跳轉 PS 視窗）
│   C:\...\cli-screenshot    │
│                            │
│ ● agent-team [外部]        │
│   C:\...\agent-team        │
└────────────────────────────┘
```

外部 session 的狀態指示：
- ● 綠色 = 程序存活中（claude.exe running）
- ◉ 黃色 = 疑似完成（Stop hook 回報，或 CPU 使用率降至 0）
- ○ 灰色 = 程序已結束

### 技術實作

#### 程序掃描器（Main Process）
```typescript
// external-session-scanner.ts
class ExternalSessionScanner {
  // 每 3 秒掃描一次
  private scanInterval: NodeJS.Timer

  // 用 PowerShell 取得所有 claude.exe 程序資訊
  // powershell: Get-Process claude | Select-Object Id, Path, StartTime
  // + Get-CimInstance Win32_Process | Where Name -eq 'claude.exe' | Select ProcessId, ParentProcessId, CommandLine
  scan(): ExternalSession[]

  // 從 PID 找到父程序的視窗 handle
  getParentWindowHandle(claudePid: number): number

  // 呼叫 SetForegroundWindow 跳轉
  bringWindowToFront(hwnd: number): void
}
```

#### 視窗跳轉實作
```powershell
# 從 claude.exe PID 找到父程序（PowerShell）的視窗並帶到前景
$claudeProcess = Get-Process -Id {PID}
$parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$($claudeProcess.Id)").ParentProcessId
$parentProcess = Get-Process -Id $parentPid

Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  }
"@

[Win32]::ShowWindow($parentProcess.MainWindowHandle, 9)  # SW_RESTORE
[Win32]::SetForegroundWindow($parentProcess.MainWindowHandle)
```

#### Stop Hook 回報機制
修改 `notify-done.ps1`，除了彈 Toast 通知，也透過 HTTP 回報給 Dashboard：
```powershell
# 通知 Dashboard 此 session 已完成
try {
  Invoke-WebRequest -Uri "http://localhost:23847/api/external-session-done" `
    -Method POST -Body (@{ pid = $PID; cwd = (Get-Location).Path } | ConvertTo-Json)
} catch { }
```
Dashboard 在 Main Process 開一個輕量 HTTP server（port 23847）接收回報。

#### 排除自身 session
掃描時需排除 Dashboard 自己啟動的 claude 程序（比對 PID 列表）。

### 驗收條件
- [ ] 在外部 PowerShell 開啟 claude 後，Dashboard 在 5 秒內自動偵測到並顯示在側邊欄
- [ ] 外部 session 顯示工作目錄名稱和「外部」標籤
- [ ] 外部 session 的 claude 完成回應後，Dashboard 收到通知
- [ ] 點擊外部 session 後，對應的 PowerShell 視窗被帶到前景
- [ ] 外部 claude 程序結束後，狀態更新為 exited
- [ ] Dashboard 自己啟動的 session 不會重複出現在「外部」列表中
