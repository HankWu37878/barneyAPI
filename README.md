# BarneyBackend - 執行說明

這份說明檔將說明如何執行「Barney」平台的User後端服務。

## 步驟：

### 1. 建立 `.env` 檔案
在專案根目錄下建立一個 `.env` 檔案，並填入以下內容：
```env
POSTGRES_URL=postgres://<username>:<password>@localhost:5432/<database_name>
PORT=<any port number>
```
請將 `<username>`、`<password>` 和 `<database_name>` 替換為 PostgreSQL 中的使用者名稱、密碼和資料庫名稱。

### 2. 下載並執行 `yarn`
確保您的電腦已安裝 [Yarn](https://classic.yarnpkg.com/en/docs/install/)，若未安裝，請先安裝。

執行以下命令來安裝專案所需的依賴：
```bash
yarn install
```

安裝完成後，執行以下命令來啟動後端服務：
```bash
yarn start
```

### 3. 確認後端啟動成功
若成功啟動，您應該能在終端機中看到如下訊息：
```
Server running on port http://localhost:<port num>
```
