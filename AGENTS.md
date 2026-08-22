# AGENTS.md

## 專案概述

- 專案名稱：`mathced-com/teach`
- 一句話目標：集中維護可直接由瀏覽器使用的教學、班級管理與互動學習網頁。
- 目前階段：維護與整理既有工具。

## 核心文件

- `AGENTS.md`：持久規則與專案藍圖。
- `工作筆記.md`：每次收工追加的交接紀錄；開工時先讀最新一筆。
- `專案介紹.md`：專案介紹唯一來源。

## 固定口令

- 「初始化專案」：建立或補齊專案基礎文件與同步設定。
- 「開工」：讀取本檔、`專案介紹.md` 與 `工作筆記.md` 最新一筆，再檢查 Git 狀態；預設不拉取或修改檔案。
- 「收工」：追加工作交接紀錄，更新必要文件，並在確認後處理 Git 與 Obsidian 同步。

## 同步設定

- GitHub：`https://github.com/mathced-com/teach.git`
- 預設分支：`main`
- Obsidian 資料夾：未設定。
- Obsidian 鏡像：未設定；若日後指定路徑，只鏡像 `專案介紹.md`。

## 工作原則

- 使用繁體中文溝通與撰寫專案文件。
- 修改前先簡短說明計畫與範圍；低風險、範圍明確的修改不必逐檔等待確認。
- 保留既有檔案與根目錄的單頁工具結構，避免無必要的大規模重構或重新命名。
- 新增、刪除或更名工具頁時，同步檢查 `index.html` 的入口連結。
- `mindmap.html` 與 `mindmap.js` 是同一套功能，修改時應一起檢查。
- 不修改或提交憑證、Token、API Key、私鑰、環境變數、快取及建置輸出。
- Google Apps Script 與第三方 CDN 屬外部依賴；驗證時需區分前端問題與外部服務問題。
- 所有新功能盡量進行瀏覽器操作驗證與桌面／行動版檢查；無法驗證時需記錄原因。
- 不使用 `git add .`；提交前明確檢查並選取檔案。
- 專案內 `專案介紹.md` 是唯一來源；Obsidian 版本僅為鏡像。
- 「收工」時必須更新 `工作筆記.md`，完成後再處理 Git 與 Obsidian 同步。

## 常用檢查

- 檢查 Git 狀態：`git status --short --branch`
- 列出 HTML：`Get-ChildItem -File -Filter *.html | Sort-Object Name`
- 搜尋首頁連結：`Select-String -LiteralPath index.html -Pattern 'href='`
- 本機預覽：從專案根目錄啟動靜態 HTTP 伺服器，再以瀏覽器開啟 `index.html`。

## 路線圖

- [x] 建立專案初始化與跨對話交接文件。
- [x] 重新設計首頁，並依類別收錄目前所有 17 個功能頁。
- [ ] 為主要工具建立一致的功能說明與基本驗證清單。

## 資料夾結構

```text
teach/
├─ index.html              # 網站入口
├─ *.html                  # 各項教學與班級工具
├─ mindmap.js              # 心智圖主要程式
├─ homework.xlsx           # 作業檢核資料範例／來源
├─ README.md               # 既有說明文件
├─ AGENTS.md               # 專案規則與藍圖
├─ 工作筆記.md             # 工作交接紀錄
├─ 專案介紹.md             # 專案介紹唯一來源
└─ .gitignore              # Git 忽略規則
```
