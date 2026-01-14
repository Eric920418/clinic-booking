# 中醫診所 LINE 預約系統

整合 LINE LIFF 的中醫診所預約系統，提供病患線上預約與診所後台管理功能。

## 技術架構

| 層級 | 技術選型 |
|------|----------|
| 前端框架 | Next.js 16+ (App Router) |
| UI 元件 | React 19+ / Tailwind CSS / shadcn/ui |
| 部署平台 | Vercel |
| 資料庫 | Supabase PostgreSQL |
| 即時更新 | Supabase Realtime |
| LINE 整合 | LIFF v2 |
| 驗證機制 | LINE Login（病患）/ JWT + bcrypt（管理員）|

## 系統角色

| 角色 | 說明 |
|------|------|
| 病患 | 透過 LINE LIFF 進行預約操作 |
| 管理員 | 透過後台管理預約、班表、病患資料 |
| 超級管理員 | 具備帳號管理與系統設定權限 |

## 功能模組

### 病患端（LINE LIFF）

- 系統進入與驗證（LINE 入口、真人驗證、驗證碼輸入）
- 個人資料處理（姓名、電話、身分證、出生日期）
- 預約操作（選日期、選醫師、選時段、選診療類型、建立預約）
- 預約管理（查看詳情、編輯預約、取消預約）

### 管理後台

- Dashboard（今日預約、取消統計、值班總覽、時段餘量、週流量、異常提醒）
- 預約管理（查看/篩選/編輯/取消/手動新增/狀態管理）
- 班表管理（醫師清單、可預約日、時段設定、分鐘數配置、特殊異動）
- 病患資料管理（病患列表、報到狀態、基本資料、預約紀錄、備註）
- 系統設定（帳號管理、權限設定、密碼、語言、時區）

## 設計色系

色系來源：[Figma Design](https://www.figma.com/design/Qlf3jgd3yK4GGbLIWYSBwi/Untitled?node-id=1-68)

| 色系 | 用途 | 主色值 |
|------|------|--------|
| Primary | 主要操作、連結、強調 | `#0076A5` (深青藍) |
| Accent | 次要強調、標籤 | `#F8CA02` (金黃) |
| Success | 成功狀態 | `#00B532` (綠) |
| Warning | 警告狀態 | `#FF6400` (橙) |
| Error | 錯誤狀態 | `#D60000` (深紅) |
| Neutral | 文字、邊框、背景 | `#262626` ~ `#FFFFFF` |

使用方式（Tailwind CSS v4）：
```jsx
// 背景色
<div className="bg-primary-500" />
<div className="bg-error-100" />

// 文字色
<span className="text-neutral-900" />
<span className="text-success-600" />

// 邊框色
<div className="border-accent-400" />
```

## 診療項目

| 項目 | 扣除分鐘數 | 備註 |
|------|------------|------|
| 初診 | 10 分鐘 | 首次就診 |
| 內科 | 5 分鐘 | 一般內科診療 |
| 針灸 | 5 分鐘 | 針灸治療 |

## 預約狀態

```
已預約 → 已報到 → 已完成
    ↓         ↓
  已取消    未報到
```

## 業務規則

### 時段分鐘數規則
- 時段總量：每時段 30 分鐘
- 扣除邏輯：預約成功時扣除對應分鐘數
- 釋放邏輯：取消或修改時立即釋放
- 不可預約條件：剩餘分鐘數 < 診療所需分鐘數

### 預約限制
- 每日限制：每位病患每日限預約 1 次
- 項目限制：每次預約僅限 1 個診療項目
- 併發處理：資料庫層級鎖定，先到先得

### 黑名單規則
- 自動觸發：未報到累計 >= 3 次
- 效果：永久無法使用預約系統
- 解除：僅限超級管理員手動解除

## 開發指令

```bash
# 安裝依賴（僅使用 pnpm）
pnpm install

# Supabase Local 開發環境（需要 Docker）
supabase start        # 啟動本地 Supabase
supabase stop         # 停止本地 Supabase
supabase status       # 查看狀態

# 啟動開發伺服器
pnpm dev

# 資料庫操作
pnpm db:generate      # 產生 Client
pnpm db:push          # 推送 Schema（開發用）
pnpm db:migrate       # 執行 Migration（生產用）
pnpm db:seed          # 執行 Seed 資料
pnpm db:studio        # 開啟 Prisma Studio

# 程式碼品質
pnpm lint             # ESLint 檢查
pnpm lint:fix         # ESLint 自動修復
pnpm format           # Prettier 格式化
pnpm tsc --noEmit     # TypeScript 類型檢查

# 建置
pnpm build            # 建置應用
```

## 本地開發環境設定

1. **啟動 Docker Desktop**
2. **啟動 Supabase Local**
   ```bash
   supabase start
   ```
3. **推送 Schema 並填充資料**
   ```bash
   pnpm db:push && pnpm db:seed
   ```
4. **啟動開發伺服器**
   ```bash
   pnpm dev
   ```

### 本地服務端口

| 服務 | URL |
|------|-----|
| API | http://localhost:54321 |
| Studio | http://localhost:54323 |
| Inbucket (Email) | http://localhost:54324 |
| PostgreSQL | localhost:54322 |
| Next.js | http://localhost:3000 |

### 測試帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| super@clinic.com | Admin123 | 超級管理員 |
| admin@clinic.com | Admin123 | 一般管理員 |

## 環境變數

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LINE
NEXT_PUBLIC_LIFF_ID=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=

# JWT
JWT_SECRET=
```

## 錯誤代碼

| 代碼 | 說明 |
|------|------|
| E001 | 驗證碼錯誤 |
| E002 | 驗證碼過期 |
| E003 | 時段已滿 |
| E004 | 當日已有預約 |
| E005 | 帳號已被停權 |
| E006 | 登入失敗次數過多 |
| E007 | 無此預約 |
| E008 | 無法修改已完成的預約 |

## 專案結構

```
app/
├── liff/                    # 病患端（LINE LIFF）
│   ├── page.tsx            # LIFF 入口/驗證
│   ├── verify/             # 驗證碼輸入
│   ├── profile/            # 個人資料填寫
│   ├── booking/            # 預約流程
│   └── my-appointments/    # 我的預約
│
├── admin/                   # 管理後台
│   ├── login/              # 登入頁
│   ├── dashboard/          # Dashboard
│   ├── appointments/       # 預約管理
│   ├── schedules/          # 班表管理
│   ├── patients/           # 病患管理
│   └── settings/           # 系統設定
│
├── api/
│   ├── liff/               # 病患端 API
│   └── admin/              # 管理後台 API
│
├── components/             # React 元件
├── lib/                    # 業務邏輯與工具函式
└── types/                  # TypeScript 型別定義
```

## 資料表

| 資料表 | 說明 |
|--------|------|
| patients | 病患資料 |
| doctors | 醫師資料 |
| treatment_types | 診療類型 |
| doctor_treatments | 醫師可看診項目 |
| schedules | 班表 |
| time_slots | 時段 |
| appointments | 預約 |
| blacklist | 黑名單 |
| admin_users | 後台帳號 |
| verification_codes | 驗證碼 |
| operation_logs | 操作紀錄 |

## E2E 測試

### 執行測試

```bash
# 安裝 Playwright 瀏覽器
pnpm exec playwright install

# 執行所有 E2E 測試
pnpm exec playwright test

# 執行特定測試檔案
pnpm exec playwright test tests/e2e/liff/verification.spec.ts

# 執行測試並顯示 UI
pnpm exec playwright test --ui

# 執行測試並顯示報告
pnpm exec playwright test --reporter=html
pnpm exec playwright show-report
```

### 測試開發進度

| Feature | 測試檔案 | Schema 分析 | 測試程式碼 | API 實作 | 狀態 |
|---------|----------|-------------|------------|----------|------|
| LINE 入口驗證 | `tests/e2e/liff/line-entry-verification.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 3/3 通過 |
| 真人驗證 | `tests/e2e/liff/verification.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 8/8 通過 |
| 管理員登入 | `tests/e2e/admin/login.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 8/8 通過 |
| 病患建立預約 | `tests/e2e/liff/patient-create-appointment.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 11/11 通過 |
| 病患查看預約 | `tests/e2e/liff/view-appointments.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 1/1 通過 |
| 病患取消預約 | `tests/e2e/liff/patient-cancel-appointment.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 4/4 通過 |
| 病患修改預約 | `tests/e2e/liff/patient-update-appointment.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 9/9 通過 |
| 病患資料處理 | `tests/e2e/liff/patient-data.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 15/15 通過 |
| 管理員編輯預約 | `tests/e2e/admin/edit-appointment.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 3/3 通過 |
| 管理病患資料 | `tests/e2e/admin/manage-patients.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 2/2 通過 |
| 管理員取消預約 | `tests/e2e/admin/cancel-appointment.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 3/4 通過 |
| 管理帳號 | `tests/e2e/admin/manage-accounts.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 10/10 通過 |
| 管理員手動新增預約 | `tests/e2e/admin/manual-booking.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 5/7 通過 |
| 管理班表 | `tests/e2e/admin/manage-schedules.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 11/11 通過 |
| 管理診療類型 | `tests/e2e/admin/manage-treatment-types.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 8/8 通過 |
| 管理醫師資料 | `tests/e2e/admin/manage-doctors.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 11/11 通過 |
| 管理員更新預約狀態 | `tests/e2e/admin/update-appointment-status.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 8/8 通過 |
| 預約狀態自動更新 | `tests/e2e/system/auto-update-appointment-status.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 5/5 通過 |
| 黑名單管理 - 批次檢查 | `tests/e2e/system/blacklist-batch.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 2/2 通過 |
| 黑名單管理 - 後台操作 | `tests/e2e/admin/blacklist-management.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 3/5 通過 |
| 即時更新時段餘量 | `tests/e2e/liff/realtime-slot-availability.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 3/3 通過 |
| 併發預約控制 | `tests/e2e/liff/concurrent-booking.spec.ts` | ✅ GO | ✅ 已完成 | ✅ 已實作 | 🟢 5/5 通過 |

### 測試案例摘要

**LINE 入口驗證** (3 個測試案例，已通過)：
- 必須檢查用戶是否在黑名單中（黑名單用戶無法進入系統並顯示停權原因與申訴管道 - ✅ 已通過）
- 非黑名單用戶可進入驗證流程（✅ 已通過）
- 新用戶（無病患記錄）可進入驗證流程（✅ 已通過）

**真人驗證** (8 個測試案例)：
- 系統必須產生 6 位數驗證碼
- 驗證碼有效期為 5 分鐘（有效期內可使用、超過 5 分鐘後失效）
- 驗證錯誤上限為 5 次（未達 5 次可繼續嘗試、達 5 次後需重新發送）
- 驗證錯誤達 5 次後驗證碼記錄標記為失效
- 重新發送驗證碼限制為 60 秒內 1 次

**管理員登入** (8 個測試案例)：
- 帳號與密碼必須正確（正確帳密可登入、錯誤密碼無法登入）
- 帳號必須為啟用狀態（停用帳號無法登入）
- 登入失敗累計 5 次後鎖定 15 分鐘（失敗 4 次仍可嘗試、失敗 5 次被鎖定、鎖定期間內無法登入、鎖定期滿後可登入）
- 登入成功時失敗次數重置為 0
- Session 有效期為 24 小時（#TODO）

**病患建立預約** (11 個測試案例)：
- 病患不可在黑名單中（黑名單病患無法建立預約）
- 時段剩餘分鐘數必須大於等於診療所需分鐘數（時段足夠可預約、時段不足無法預約並建議其他時段）
- 病患當日不可有重複預約（當日已有預約無法再次預約、當日無預約可建立預約）
- 預約成功後必須扣除時段分鐘數（初診扣除 10 分鐘、內科扣除 5 分鐘）
- 預約成功後必須建立預約記錄（#TODO）
- 預約成功後必須發送 LINE 通知（預約成功發送通知訊息）
- 不可選擇過去日期（選擇過去日期無法建立預約）
- 不可選擇超過 30 天後的日期（選擇 31 天後無法預約、選擇 30 天後可預約）
- 每次預約僅能選擇一個診療項目（#TODO）

**病患查看預約** (1 個測試案例)：
- 系統必須顯示預約狀態（顯示各種預約狀態：已預約、已報到、已完成、未報到、已取消）
- 系統必須顯示預約日期與時段（#TODO）
- 系統必須顯示醫師姓名（#TODO）
- 系統必須顯示診療類型（#TODO）
- 系統必須顯示預約建立時間（#TODO）

**病患取消預約** (4 個測試案例)：
- 取消預約時必須更新預約狀態為「已取消」（取消預約後狀態變更）
- 取消預約時必須釋放時段分鐘數（取消初診預約釋放 10 分鐘、取消內科預約釋放 5 分鐘）
- 取消成功後必須發送 LINE 通知（取消預約發送通知訊息）

**病患修改預約** (9 個測試案例，已通過)：
- 僅可修改狀態為「已預約」的預約（已預約狀態可修改、已取消狀態無法修改、已完成狀態無法修改）
- 不可修改時段開始前 3 小時內的預約（時段開始前 3 小時內無法修改、時段開始前超過 3 小時可修改、時段開始前剛好 3 小時無法修改）
- 修改預約時必須立即釋放原時段分鐘數（釋放原時段的初診分鐘數）
- 修改預約時必須檢查新時段餘量（新時段餘量足夠時可修改、新時段餘量不足時無法修改）
- 修改預約時必須扣除新時段分鐘數（#TODO - Feature File 尚未定義）
- 修改成功後必須發送 LINE 通知（#TODO - Feature File 尚未定義）

**病患資料處理** (15 個測試案例，已通過)：
- 姓名必須為 2-20 字元（1 字元無效、2 字元有效、20 字元有效、21 字元無效）
- 電話必須為台灣手機格式（09xxxxxxxx 有效、02xxxxxxxx 無效）
- 身分證字號必須符合台灣身分證格式（格式正確、格式錯誤、縣市代碼錯誤、性別碼錯誤、檢查碼錯誤）
- 出生年月日不可為未來日期（未來日期無效、過去日期有效）
- 以 LINE User ID + 身分證字號作為唯一識別（首次預約建立新記錄、回診自動帶入歷史資料）

**管理員編輯預約** (3 個測試案例，已通過)：
- 修改預約時必須立即釋放原時段分鐘數（釋放原時段的內科分鐘數）
- 修改預約時必須檢查新時段餘量（新時段餘量足夠時可修改、新時段餘量不足時無法修改）
- 修改預約時必須扣除新時段分鐘數（#TODO - Feature File 尚未定義）
- 修改記錄必須包含操作人與操作時間（#TODO - Feature File 尚未定義）

**管理病患資料** (2 個測試案例，已通過)：
- 可編輯病患備註（新增病患備註、修改病患備註）
- 可依姓名/電話/身分證搜尋病患（#TODO - Feature File 尚未定義）
- 可依黑名單狀態篩選病患（#TODO - Feature File 尚未定義）
- 可依 LINE 綁定狀態篩選病患（#TODO - Feature File 尚未定義）
- 病患備註為內部註記，病患不可見（#TODO - Feature File 尚未定義）
- 可查看病患的所有預約紀錄（#TODO - Feature File 尚未定義）

**管理員取消預約** (4 個測試案例，3 個通過)：
- 取消預約時必須更新預約狀態為「已取消」（取消預約後狀態變更）
- 取消預約時必須釋放時段分鐘數（取消針灸預約釋放 5 分鐘）
- 取消成功後必須發送 LINE 通知（病患有 LINE User ID 時發送取消通知）
- 可記錄取消原因（#TODO - Feature File 尚未定義完整 Example）

**管理帳號** (10 個測試案例，2 個 TODO，已通過)：
- 僅超級管理員可管理帳號（一般管理員無法新增帳號、超級管理員可新增帳號）
- 帳號必須使用 Email 格式（#TODO - Feature File 尚未定義完整 Example）
- Email 必須唯一（重複的 Email 無法新增）
- 密碼最小長度為 8 字元（密碼少於 8 字元無效、密碼 8 字元有效）
- 密碼必須包含大寫、小寫、數字（缺少大寫無效、缺少小寫無效、缺少數字無效、包含所有元素有效）
- 可停用帳號（停用帳號後狀態更新）
- 可重設密碼（#TODO - Feature File 尚未定義完整 Example）

**管理員手動新增預約** (7 個測試案例，5 個通過，2 個 TODO)：
- 時段剩餘分鐘數必須大於等於診療所需分鐘數（時段足夠可新增預約、時段不足無法新增預約）
- 病患當日不可有重複預約（當日已有預約無法再次新增）
- 預約成功後必須扣除時段分鐘數（#TODO - Feature File 標記為 #TODO）
- 預約成功後必須建立預約記錄（#TODO - Feature File 標記為 #TODO）
- 若病患有綁定 LINE 則發送通知（有 LINE User ID 發送通知、無 LINE User ID 不發送通知）

**管理班表** (11 個測試案例，已通過)：
- 同一醫師在同一日期只能有一筆班表（相同醫師相同日期無法重複建立、相同醫師不同日期可建立）
- 時段總分鐘數預設為 30 分鐘（建立時段時預設總分鐘數與剩餘分鐘數）
- 可手動調整時段剩餘分鐘數（調整特定時段的剩餘分鐘數）
- 剩餘分鐘數為 0 時不可手動調整（餘量為 0 時無法調整、餘量大於 0 時可調整）
- 標記停診時已預約者必須發送通知（停診時發送通知給所有已預約病患）
- 標記停診時必須將班表設為不可預約（停診後班表狀態更新）
- 停診恢復僅限未來日期（未來日期的停診可恢復、過去或當日的停診無法恢復）
- 可為醫師新增額外時段（新增加診時段）
- 可設定週期性班表（#TODO - Feature File 標記為 #TODO）
- 可設定可預約日（#TODO - Feature File 標記為 #TODO）

**管理診療類型** (8 個測試案例，已通過)：
- 可新增診療類型（#TODO - Feature File 尚未定義完整 Example）
- 可修改診療類型的扣除分鐘數（修改初診所需分鐘數）
- 扣除分鐘數必須大於 0（扣除分鐘數為 0 無效、扣除分鐘數為負數無效）
- 扣除分鐘數不可超過 30 分鐘（扣除分鐘數為 30 分鐘有效、扣除分鐘數超過 30 分鐘無效）
- 可停用診療類型（停用診療類型後狀態更新）
- 停用診療類型時自動取消所有使用此類型的未來預約並通知病患（停用診療類型時取消相關未來預約、停用診療類型時已完成的預約不受影響）

**管理醫師資料** (11 個測試案例，已通過)：
- 可新增醫師（新增醫師成功、姓名不可少於 2 字元、姓名不可超過 20 字元）
- 可編輯醫師姓名（編輯姓名成功、姓名不可少於 2 字元、姓名不可超過 20 字元）
- 可設定醫師可看診項目（為醫師新增可看診項目、相同醫師不可重複關聯相同診療項目）
- 可停用醫師（停用醫師後狀態更新）
- 停用醫師時自動取消所有未來預約並通知病患（停用醫師時取消未來預約、停用醫師時已完成的預約不受影響）

**管理員更新預約狀態** (8 個測試案例，已通過)：
- 已預約狀態可更新為已報到（更新為已報到）
- 已報到狀態可更新為已完成（更新為已完成）
- 已預約狀態不可直接更新為已完成（未報到直接完成應失敗）
- 已完成狀態不可變更（已完成預約無法變更狀態）
- 已取消狀態不可變更（已取消預約無法變更狀態）
- 未報到狀態可改為已報到（未報到可補改為已報到、未報到無法改為已預約、未報到無法改為已完成）

**預約狀態自動更新** (5 個測試案例，已通過)：
- 當日預約時段結束後「已預約」狀態自動改為「未報到」（時段結束後未報到自動更新狀態、已報到狀態不會被更新）
- 未報到時病患的未報到次數加 1（狀態改為未報到時累計次數）
- 未報到次數達到 3 次後停止累計（未報到次數達到 3 次後不再增加）
- 黑名單狀態由批次任務檢查更新（未報到次數更新後不立即設定黑名單）

**黑名單管理 - 批次檢查** (2 個測試案例，已通過)：
- 未報到累計達 3 次自動加入黑名單（批次檢查時未報到次數達 3 次加入黑名單 - ✅ 已實作）
- 未報到次數未達 3 次不加入黑名單（批次檢查時未報到次數未達 3 次不加入黑名單 - ✅ 已實作）

**黑名單管理 - 後台操作** (5 個測試案例，3 通過 2 跳過)：
- 黑名單病患無法使用預約系統（黑名單病患無法建立預約 - ✅ 已實作）
- 超級管理員可手動加入黑名單（#TODO - Feature File 尚未定義）
- 超級管理員可手動移除黑名單（超級管理員移除黑名單 - ✅ 已實作）
- 一般管理員無法移除黑名單（一般管理員無法移除黑名單 - ✅ 已實作）
- 黑名單操作必須記錄操作人、時間與原因（#TODO - Feature File 尚未定義）

**即時更新時段餘量** (3 個測試案例，已通過)：
- 訂閱 Supabase Realtime 監聽時段變更（#TODO - Feature File 標記為 #TODO）
- 新預約時即時廣播時段剩餘分鐘數減少（病患 A 預約成功後病患 B 看到餘量更新 - ✅ 已通過）
- 取消預約時即時廣播時段剩餘分鐘數增加（病患 A 取消預約後病患 B 看到餘量更新 - ✅ 已通過）
- 修改預約時即時廣播原時段釋放與新時段扣除（病患 A 修改預約後病患 B 看到兩個時段餘量更新 - ✅ 已通過）

**併發預約控制** (5 個測試案例，已通過)：
- 使用 Row-Level Lock 鎖定時段記錄（#TODO - Feature File 標記為 #TODO）
- 先取得鎖定者預約成功（第一位用戶取得鎖定成功預約 - ✅ 已通過、併發請求時先完成者預約成功 - ✅ 已通過）
- 後取得鎖定者檢查時段餘量不足則失敗（第二位用戶因餘量不足失敗 - ✅ 已通過）
- 交易失敗時必須回滾所有變更（#TODO - Feature File 標記為 #TODO）
- 時段餘量不足時返回錯誤訊息與替代選項（衝突時提供同一時段其他醫師的可用選項 - ✅ 已通過、餘量不足但無替代選項時只返回錯誤訊息 - ✅ 已通過）

### 測試目錄結構

```
tests/e2e/
├── liff/                        # LIFF 端 E2E 測試
│   ├── line-entry-verification.spec.ts  # LINE 入口驗證測試（3 個案例，已通過）
│   ├── verification.spec.ts     # 真人驗證測試（8 個案例）
│   ├── patient-data.spec.ts     # 病患資料處理測試（12 個案例，樣板）
│   ├── patient-create-appointment.spec.ts  # 病患建立預約測試（11 個案例，已通過）
│   ├── view-appointments.spec.ts           # 病患查看預約測試（1 個案例，已通過）
│   ├── patient-cancel-appointment.spec.ts  # 病患取消預約測試（4 個案例，已通過）
│   ├── patient-update-appointment.spec.ts  # 病患修改預約測試（9 個案例，已通過）
│   ├── realtime-slot-availability.spec.ts  # 即時更新時段餘量測試（3 個案例，已通過）
│   └── concurrent-booking.spec.ts          # 併發預約控制測試（5 個案例，已通過）
├── admin/                       # 管理後台 E2E 測試
│   ├── login.spec.ts            # 管理員登入測試（8 個案例，已通過）
│   ├── edit-appointment.spec.ts # 管理員編輯預約測試（3 個案例，已通過）
│   ├── cancel-appointment.spec.ts # 管理員取消預約測試（4 個案例，3 個通過）
│   ├── manage-patients.spec.ts  # 管理病患資料測試（2 個案例，已通過）
│   ├── manage-accounts.spec.ts  # 管理帳號測試（10 個案例，已通過）
│   ├── manual-booking.spec.ts   # 管理員手動新增預約測試（5 個案例，樣板）
│   ├── manage-schedules.spec.ts # 管理班表測試（11 個案例，已通過）
│   ├── manage-treatment-types.spec.ts # 管理診療類型測試（8 個案例，已通過）
│   ├── manage-doctors.spec.ts   # 管理醫師資料測試（5 個案例，已通過）
│   ├── update-appointment-status.spec.ts # 管理員更新預約狀態測試（8 個案例，已通過）
│   └── blacklist-management.spec.ts  # 黑名單管理後台操作測試（5 個案例，紅燈）
├── system/                      # 系統批次任務 E2E 測試
│   ├── auto-update-appointment-status.spec.ts # 預約狀態自動更新測試（5 個案例，已通過）
│   └── blacklist-batch.spec.ts       # 黑名單批次檢查測試（2 個案例，紅燈）
├── api/                         # API 測試
├── helpers/                     # 輔助函式
│   ├── index.ts                # 匯出
│   ├── cleanup.ts              # 資料庫清理
│   ├── db.ts                   # Prisma Client
│   └── auth.ts                 # 認證輔助（登入取得 token）
└── factories/                   # 測試資料工廠
    ├── index.ts                # 匯出
    ├── verification-code.ts    # 驗證碼工廠
    ├── admin-user.ts           # 管理員工廠
    ├── patient.ts              # 病患工廠
    ├── doctor.ts               # 醫師工廠
    ├── doctor-treatment.ts     # 醫師診療項目關聯工廠
    ├── treatment-type.ts       # 診療類型工廠
    ├── schedule.ts             # 班表工廠
    ├── time-slot.ts            # 時段工廠
    ├── blacklist.ts            # 黑名單工廠
    └── appointment.ts          # 預約工廠
```

### API 路徑對應

| Feature | 實際 API 路徑 |
|---------|---------------|
| LINE 入口驗證 | `POST /api/line/entry` |
| 發送驗證碼 | `POST /api/liff/verify/send` |
| 驗證驗證碼 | `POST /api/liff/verify/check` |
| 管理員登入 | `POST /api/admin/auth/login` |
| 病患建立預約 | `POST /api/patient/appointments` |
| 病患查看預約 | `GET /api/patient/appointments?lineUserId=xxx` |
| 病患取消預約 | `DELETE /api/patient/appointments/{id}` |
| 病患修改預約 | `PUT /api/patient/appointments/{id}` |
| 病患資料處理 | `POST /api/patient/profile`, `GET /api/patient/profile` |
| 管理員編輯預約 | `PUT /api/admin/appointments/{id}` |
| 管理員取消預約 | `DELETE /api/admin/appointments/{id}` |
| 管理員編輯病患備註 | `PATCH /api/admin/patients/{id}` |
| 管理員新增帳號 | `POST /api/admin/accounts` |
| 管理員停用帳號 | `POST /api/admin/accounts/{id}/disable` |
| 管理員手動新增預約 | `POST /api/admin/appointments` |
| 管理班表 - 建立班表 | `POST /api/admin/schedules` |
| 管理班表 - 更新班表 | `PATCH /api/admin/schedules/{id}` |
| 管理班表 - 建立時段 | `POST /api/admin/schedules/{id}/time-slots` |
| 管理班表 - 調整時段餘量 | `PATCH /api/admin/time-slots/{id}` |
| 管理員更新預約狀態 | `PATCH /api/admin/appointments/{id}/status` |
| 管理診療類型 - 修改 | `PUT /api/admin/treatments/{id}` |
| 管理診療類型 - 停用 | `POST /api/admin/treatments/{id}/disable` |
| 管理醫師 - 新增 | `POST /api/admin/doctors` |
| 管理醫師 - 編輯姓名 | `PUT /api/admin/doctors/{id}` |
| 管理醫師 - 新增診療項目 | `POST /api/admin/doctors/{id}/treatments` |
| 管理醫師 - 停用 | `POST /api/admin/doctors/{id}/disable` |
| 系統 - 自動更新預約狀態 | `POST /api/system/auto-update-status` |
| 系統 - 黑名單批次檢查 | `POST /api/system/blacklist-check` |
| 黑名單 - 取得列表 | `GET /api/admin/blacklist` |
| 黑名單 - 加入黑名單 | `POST /api/admin/blacklist` |
| 黑名單 - 移除黑名單 | `DELETE /api/admin/blacklist/{patientId}` |
| 即時更新 - 取得可預約時段 | `GET /api/slots?date=YYYY-MM-DD&doctor_id=xxx` |

## 規格文件

- `clinic-booking-spec.md` - 完整系統規格書
- `prompts/automation-ts.md` - 自動化開發指南
- `spec/api.yml` - OpenAPI 3.0 API 規格文件

## API 規格

API 規格使用 OpenAPI 3.0 標準撰寫，存放於 `specs/api.yml`。

每個 API Endpoint 的 `summary` 欄位對應 Feature File 中的 step statement（包含中文句型及英文變數）。

### Feature File 與 API 對應關係

| Feature File | API 路徑 | 主要操作 |
|--------------|----------|----------|
| LINE入口驗證.feature | `/line/entry` | 用戶透過 LINE LIFF 進入系統 |
| 真人驗證.feature | `/verification/send`, `/verification/verify` | 病患請求發送驗證碼、病患輸入驗證碼 |
| 病患資料處理.feature | `/patient/profile` | 病患提交個人資料、病患進入個人資料頁面 |
| 病患查看預約.feature | `/patient/appointments` | 病患查看預約列表 |
| 病患建立預約.feature | `/patient/appointments` | 病患建立預約 |
| 病患修改預約.feature | `/patient/appointments/{id}` | 病患修改預約 |
| 病患取消預約.feature | `/patient/appointments/{id}` | 病患取消預約 |
| 管理員登入.feature | `/admin/login` | 管理員登入 |
| 管理帳號.feature | `/admin/accounts` | 超級管理員新增/編輯/停用帳號 |
| 管理員手動新增預約.feature | `/admin/appointments` | 管理員新增預約 |
| 管理員編輯預約.feature | `/admin/appointments/{id}` | 管理員編輯預約 |
| 管理員取消預約.feature | `/admin/appointments/{id}` | 管理員取消預約 |
| 管理員更新預約狀態.feature | `/admin/appointments/{id}/status` | 管理員更新預約狀態為 {status} |
| 管理病患資料.feature | `/admin/patients` | 管理員搜尋/篩選病患、管理員編輯病患備註 |
| 黑名單管理.feature | `/admin/blacklist` | 管理員加入/移除黑名單 |
| 管理醫師資料.feature | `/admin/doctors` | 管理員新增/編輯/停用醫師 |
| 管理診療類型.feature | `/admin/treatments` | 管理員新增/修改/停用診療類型 |
| 管理班表.feature | `/admin/schedules`, `/admin/slots` | 管理員建立班表/時段、標記停診 |
| 即時更新時段餘量.feature | `/slots` | 病患查看可預約時段（Supabase Realtime） |
| 預約狀態自動更新.feature | `/system/auto-update-status` | 系統執行自動狀態更新 |
| 併發預約控制.feature | （併入病患建立預約） | Row-Level Lock 併發控制 |
