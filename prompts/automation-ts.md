# Automation：從完整規格自動化開發至可部署應用

---

## 技術堆疊配置

### 當前技術堆疊

```yaml
# 程式語言
language: TypeScript

# 專案架構
architecture: Next.js Full-Stack Application
structure:
  app/: Next.js 16 App Router 頁面與 API
  components/: React 元件
  lib/: 業務邏輯與工具函式
  types/: TypeScript 型別定義

# 前端框架與工具
frontend:
  framework: Next.js 16+ (App Router)
  ui_library: React 19+
  styling: Tailwind CSS + shadcn/ui
  state_management: React Context / Zustand
  realtime: Supabase Realtime (時段餘量即時更新)
  line_integration: LIFF v2 SDK
  form_handling: React Hook Form + Zod

# 後端框架與工具
backend:
  framework: Next.js API Routes / Route Handlers
  runtime: Node.js
  validation: Zod Schemas
  authentication:
    - LINE Login (病患端)
    - JWT + bcrypt (管理後台)

# 資料庫
database:
  type: Supabase PostgreSQL
  orm: Prisma (或 Supabase Client)
  realtime: Supabase Realtime
  rls: Row Level Security

# 外部服務
external_services:
  line_liff: LINE LIFF v2 (病患端入口)
  line_messaging: LINE Messaging API (驗證碼、通知)
  deployment: Vercel

# 開發工具
dev_tools:
  package_manager: pnpm (禁止 npm/yarn)
  linter: ESLint
  formatter: Prettier
```

---

## 快速摘要

**最重要的事情**：功能正確 >>> 程式碼架構
- 用最簡單的方式，正確實作所有預約系統規則
- 前端要清楚展示時段餘量、預約狀態、驗證結果
- 測試資料要充足（醫師、班表、時段、病患、預約等）
- **所有錯誤必須完整顯示在前端**

**要做的**：
- 實作 `clinic-booking-spec.md` 中定義的所有功能
- 正確實作時段分鐘數扣除/釋放邏輯
- 實作併發預約的 Row-Level Lock 機制
- 使用 Supabase Realtime 即時更新時段餘量
- 前端顯示預約流程各步驟與驗證結果

**不要做的**：
- 不要花時間設計複雜架構
- 不要實作規格中未提及的功能
- 不要腦補規格沒提到的功能
- **不要使用 npm 或 yarn**
- **不要使用 --accept-data-loss 執行資料庫遷移**

---

## 目標

基於 `clinic-booking-spec.md` 規格書，開發一套整合 LINE LIFF 的中醫診所預約系統，提供病患線上預約與診所後台管理功能。

**核心目標：讓使用者透過 LINE LIFF 完成預約流程，管理員透過後台管理預約、班表、病患資料。**

---

## 專案規格來源

### 主要規格文件
- `clinic-booking-spec.md`：完整系統規格書，包含：
  - 系統概述與技術架構
  - 病患端功能規格（LINE LIFF）
  - 管理後台功能規格
  - 資料庫設計（11 張資料表）
  - API 設計
  - 業務規則摘要

### 資料庫設計
規格書第 5 節定義了完整的資料表結構：
- `patients`：病患資料
- `doctors`：醫師資料
- `treatment_types`：診療類型
- `doctor_treatments`：醫師可看診項目
- `schedules`：班表
- `time_slots`：時段
- `appointments`：預約
- `blacklist`：黑名單
- `admin_users`：後台帳號
- `verification_codes`：驗證碼
- `operation_logs`：操作紀錄

---

## 核心原則

### 1. 功能正確性絕對優先
**功能正確性 >>> 程式碼架構品質**

- **每一條規則都必須 100% 正確實作**
- 優先確保業務邏輯完全符合規格，程式碼架構採用最簡單可行的方式即可
- 不需要過度設計：Repository Pattern、DDD、Clean Architecture 等都非必要
- 可以用最直覺的方式實作，重點是**規則對、計算對、展示對**

### 2. 絕對忠於規格原則
**嚴格遵守 `clinic-booking-spec.md` 中的所有規格內容，禁止任何腦補、假設或擴充。**

- 只實作規格書中定義的資料實體與屬性
- 只實作規格書中定義的功能與規則
- 規格書中沒有寫的內容，**絕對不准出現在程式碼中**
- 不添加「可能需要的欄位」「預留功能」「合理的優化」
- 不實作規格中未提及的驗證、邏輯或 UI 元素

### 3. 規則可追溯性原則
- 在實作業務邏輯的程式碼中，**必須將每條規則以註解形式逐條抄寫**
- 每個規則對應的實作邏輯必須清晰標註，確保規格與程式碼的 1:1 對應關係

### 4. 錯誤完整展示原則
- **所有錯誤必須完整顯示在前端**，包括：
  - 驗證錯誤（Zod validation errors）
  - API 錯誤（包含錯誤訊息與錯誤代碼）
  - 業務規則違反（E001-E008 錯誤代碼）
- 禁止吞掉錯誤或僅顯示「發生錯誤」等模糊訊息

### 5. 資料庫安全原則
- **禁止使用 `--accept-data-loss` 執行遷移**
- 資料庫變更必須透過正規的 Migration
- 不可任意覆蓋或刪除資料庫中的現有資料

### 6. 前端完整展示原則（重點）
**前端是展示功能正確性的關鍵，使用者要能透過前端完成所有操作**

**病患端（LINE LIFF）展示需求：**
- 驗證碼輸入介面：顯示剩餘時間、錯誤次數
- 預約日曆：僅顯示可預約日期（依班表）
- 醫師選擇：顯示當日值班醫師與專長
- 時段選擇：即時顯示剩餘可預約分鐘數
- 診療類型：顯示各類型所需分鐘數
- 預約確認：顯示完整預約資訊
- 我的預約：顯示預約狀態（已預約/已報到/已完成/未報到/已取消）

**管理後台展示需求：**
- Dashboard：今日預約統計、取消數、醫師值班、時段餘量、週流量圖表
- 預約列表：篩選、排序、狀態管理
- 班表管理：醫師清單、可預約日/時段設定
- 病患管理：病患列表、黑名單狀態、預約紀錄

---

## 執行步驟

### 階段 1：深度理解規格

#### 1.1 研讀規格書
- 完整讀取 `clinic-booking-spec.md`
- 理解系統角色：病患、管理員、超級管理員
- 理解功能模組：病患端（LINE LIFF）、管理後台

#### 1.2 研讀資料模型
- 識別所有 11 張資料表及其關係
- 理解每個欄位的定義、資料型別、限制條件
- 特別注意：
  - `appointments` 的狀態流轉
  - `time_slots` 的分鐘數邏輯
  - `patients` 與 `blacklist` 的關係

#### 1.3 研讀業務規則
- 時段分鐘數規則（第 7.1 節）
- 預約限制規則（第 7.2 節）
- 黑名單規則（第 7.3 節）
- 即時更新規則（第 7.4 節）

#### 1.4 建立規格檢查清單
- [ ] 已識別所有資料表與欄位
- [ ] 已識別所有 API 端點
- [ ] 已理解預約建立的併發處理邏輯
- [ ] 已理解時段分鐘數扣除/釋放規則
- [ ] 已理解預約狀態流轉
- [ ] 已理解黑名單觸發條件

---

### 階段 2：資料庫設計與實作

#### 2.1 建立資料庫 Schema
依據規格書第 5 節建立所有資料表：

```sql
-- 依序建立：
-- 1. patients（病患）
-- 2. doctors（醫師）
-- 3. treatment_types（診療類型）
-- 4. doctor_treatments（醫師診療項目）
-- 5. schedules（班表）
-- 6. time_slots（時段）
-- 7. appointments（預約）
-- 8. blacklist（黑名單）
-- 9. admin_users（後台帳號）
-- 10. verification_codes（驗證碼）
-- 11. operation_logs（操作紀錄）
```

#### 2.2 啟用 Supabase Realtime
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE time_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```

#### 2.3 設定 Row Level Security
依規格書第 5.3 節設定 RLS 政策

#### 2.4 建立測試資料（Seed Data）【重要】

**必須包含的 Seed 資料：**

1. **診療類型**（依規格書）
   - 初診：10 分鐘
   - 內科：5 分鐘
   - 針灸：5 分鐘

2. **醫師資料**
   - 至少 3 位醫師
   - 各醫師設定不同的可看診項目

3. **班表與時段**
   - 未來 7-14 天的班表
   - 每天至少 2 個時段（上午、下午）
   - 每時段 30 分鐘

4. **病患資料**
   - 至少 5 位測試病患
   - 包含正常病患與黑名單病患

5. **預約資料**
   - 各種狀態的預約（已預約、已報到、已完成、未報到、已取消）

6. **管理員帳號**
   - 1 個超級管理員
   - 1 個一般管理員

---

### 階段 3：後端開發

**重點：正確實作所有規則，架構採用最簡單可行的方式**

#### 3.1 API Routes 結構

```
app/api/
├── liff/                    # 病患端 API
│   ├── verify/
│   │   ├── send/           # POST: 發送驗證碼
│   │   └── check/          # POST: 驗證碼校驗
│   ├── available-dates/    # GET: 取得可預約日期
│   ├── doctors/            # GET: 取得醫師列表
│   ├── time-slots/         # GET: 取得時段列表
│   ├── treatment-types/    # GET: 取得診療類型
│   └── appointments/       # CRUD: 預約操作
│       └── [id]/
│
├── admin/                   # 管理後台 API
│   ├── auth/
│   │   ├── login/          # POST: 登入
│   │   ├── logout/         # POST: 登出
│   │   └── me/             # GET: 當前用戶
│   ├── dashboard/
│   │   ├── summary/        # GET: 今日摘要
│   │   ├── weekly/         # GET: 週統計
│   │   └── alerts/         # GET: 異常提醒
│   ├── appointments/       # 預約管理
│   │   └── [id]/
│   │       └── status/     # PUT: 更新狀態
│   ├── doctors/            # 醫師管理
│   │   └── [id]/
│   ├── schedules/          # 班表管理
│   │   └── [id]/
│   ├── time-slots/
│   │   └── [id]/           # PUT: 調整時段餘量
│   ├── patients/           # 病患管理
│   │   └── [id]/
│   │       └── blacklist/  # POST/DELETE: 黑名單操作
│   ├── users/              # 管理員帳號
│   │   └── [id]/
│   │       └── password/   # PUT: 重設密碼
│   └── treatment-types/    # 診療類型
│       └── [id]/
```

#### 3.2 預約建立的併發處理（核心邏輯）

```typescript
/**
 * 預約建立 API
 * 對應規格：clinic-booking-spec.md 第 3.3.5 節
 *
 * 處理邏輯：
 * 1. 接收預約請求
 * 2. 開啟資料庫交易 (Transaction)
 * 3. 鎖定該時段記錄 (SELECT FOR UPDATE)
 * 4. 檢查剩餘分鐘數 >= 診療所需分鐘數
 * 5. 檢查該病患當日是否已有預約
 * 6. 若檢查通過：扣除時段分鐘數、建立預約記錄、發送 LINE 通知
 * 7. 若檢查失敗：回滾交易、返回錯誤訊息
 *
 * 併發衝突處理：
 * - 使用資料庫層級的 Row-Level Lock
 * - 先取得鎖定者成功，後者返回「時段已被預約」(E003)
 */
```

#### 3.3 錯誤代碼實作

```typescript
// 依規格書附錄 B
const ERROR_CODES = {
  E001: '驗證碼錯誤',
  E002: '驗證碼過期',
  E003: '時段已滿',
  E004: '當日已有預約',
  E005: '帳號已被停權',
  E006: '登入失敗次數過多',
  E007: '無此預約',
  E008: '無法修改已完成的預約',
};
```

---

### 階段 4：前端開發【關鍵階段】

**核心目標：讓病患透過 LINE LIFF 完成預約，管理員透過後台管理系統**

#### 4.1 頁面結構

```
app/
├── liff/                    # 病患端（LINE LIFF）
│   ├── page.tsx            # LIFF 入口/驗證
│   ├── verify/             # 驗證碼輸入
│   ├── profile/            # 個人資料填寫
│   ├── booking/            # 預約流程
│   │   ├── date/           # 選擇日期
│   │   ├── doctor/         # 選擇醫師
│   │   ├── time-slot/      # 選擇時段
│   │   ├── treatment/      # 選擇診療類型
│   │   └── confirm/        # 確認預約
│   └── my-appointments/    # 我的預約
│       └── [id]/           # 預約詳情/編輯/取消
│
├── admin/                   # 管理後台
│   ├── login/              # 登入頁
│   ├── dashboard/          # Dashboard
│   ├── appointments/       # 預約管理
│   ├── schedules/          # 班表管理
│   ├── patients/           # 病患管理
│   │   └── [id]/
│   └── settings/           # 系統設定
│       ├── users/          # 帳號管理
│       └── treatment-types/ # 診療類型
```

#### 4.2 病患端必須展示的資訊

1. **驗證碼頁面**
   - 驗證碼有效期倒數（5 分鐘）
   - 重新發送按鈕（60 秒冷卻）
   - 錯誤次數提示（上限 5 次）

2. **日期選擇**
   - 行事曆元件
   - 不可選：過去日期、超過 30 天、無班表日期
   - 可選日期高亮顯示

3. **醫師選擇**
   - 顯示當日值班醫師
   - 顯示醫師專長項目

4. **時段選擇**（即時更新重點）
   ```
   09:00-09:30  剩餘 25 分鐘 ✓
   09:30-10:00  剩餘 10 分鐘 ✓
   10:00-10:30  剩餘 0 分鐘  ✗（已滿）
   ```
   - 訂閱 Supabase Realtime
   - 剩餘分鐘數即時更新
   - 不足所選診療分鐘數時禁用

5. **診療類型選擇**
   - 顯示各類型所需分鐘數
   - 僅顯示醫師可看診項目

6. **預約確認頁**
   - 完整顯示：日期、時段、醫師、診療類型
   - 確認建立預約

7. **我的預約列表**
   - 預約狀態顏色標示
   - 可編輯/取消（限「已預約」狀態）

#### 4.3 管理後台必須展示的資訊

1. **Dashboard**
   - 今日總預約（各狀態細項）
   - 今日已取消數
   - 醫師值班總覽
   - 剩餘可預約時段（依醫師分組）
   - 過去 7 天預約趨勢圖
   - 異常狀態提醒

2. **預約管理**
   - 列表：預約編號、病患、日期、時段、醫師、診療、狀態
   - 篩選：日期範圍、醫師、診療類型、狀態
   - 操作：編輯、取消、狀態變更
   - 手動新增預約

3. **班表管理**
   - 醫師清單與狀態
   - 可預約日設定（週期性/單日）
   - 時段設定
   - 時段餘量調整
   - 停診/加診設定

4. **病患管理**
   - 病患列表（含搜尋）
   - 黑名單標示
   - 預約紀錄查看
   - 黑名單加入/移除

#### 4.4 錯誤處理展示

```typescript
// 錯誤顯示元件
<ErrorDisplay error={error}>
  <div className="p-4 bg-red-50 border border-red-200 rounded">
    <p className="font-bold text-red-800">
      錯誤代碼：{error.code}
    </p>
    <p className="text-red-600">{error.message}</p>
  </div>
</ErrorDisplay>
```

---

### 階段 5：LINE 整合

#### 5.1 LIFF 初始化

```typescript
/**
 * LIFF 設定
 * 對應規格：clinic-booking-spec.md 第 8.1 節
 *
 * LIFF Size: Full
 * Scopes: profile, openid
 */
import liff from '@line/liff';

await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID });
const lineUserId = liff.getContext()?.userId;
```

#### 5.2 LINE Messaging API 通知

```typescript
/**
 * 訊息類型（對應規格第 8.2 節）
 * - 驗證碼：您的驗證碼是：{code}，5 分鐘內有效
 * - 預約成功：預約成功！{date} {time} {doctor} {treatment}
 * - 預約修改：預約已修改！新時段：{date} {time}
 * - 預約取消：預約已取消。如有需要請重新預約
 * - 停診通知：{doctor} 醫師 {date} 停診，您的預約已取消
 */
```

---

### 階段 6：驗收測試【關鍵階段】

#### 6.1 開發環境測試

```bash
# 啟動開發伺服器
pnpm dev
```

#### 6.2 功能驗收清單

**病患端驗收：**
- [ ] LIFF 初始化成功，取得 LINE User ID
- [ ] 黑名單用戶被阻擋
- [ ] 驗證碼發送與驗證正常
- [ ] 驗證碼 5 分鐘過期
- [ ] 錯誤 5 次需重新發送
- [ ] 首次預約建立病患資料
- [ ] 回診自動帶入歷史資料
- [ ] 日期選擇僅顯示可預約日
- [ ] 醫師選擇僅顯示當日值班
- [ ] 時段餘量即時更新（Realtime）
- [ ] 診療類型依醫師專長顯示
- [ ] 預約建立成功扣除分鐘數
- [ ] 每日限預約一次（E004）
- [ ] 時段已滿錯誤（E003）
- [ ] 預約編輯正確釋放/扣除分鐘數
- [ ] 預約取消正確釋放分鐘數
- [ ] LINE 通知發送成功

**管理後台驗收：**
- [ ] 登入/登出正常
- [ ] 密碼錯誤 5 次鎖定 15 分鐘
- [ ] Dashboard 數據正確
- [ ] 預約列表篩選排序正常
- [ ] 手動新增預約正常
- [ ] 預約狀態變更正常
- [ ] 班表設定正常
- [ ] 時段餘量調整正常
- [ ] 病患列表搜尋正常
- [ ] 黑名單操作正常
- [ ] 權限控制正常（管理員 vs 超級管理員）

**併發測試：**
- [ ] 兩人同時預約同一時段，僅一人成功
- [ ] 失敗者收到「時段已被預約」錯誤

**黑名單自動化：**
- [ ] 未報到累計 >= 3 次自動加入黑名單

#### 6.3 TypeScript 檢查

```bash
# 類型檢查
pnpm tsc --noEmit

# ESLint 檢查
pnpm lint
```

---

## 常用指令

```bash
# 開發
pnpm dev                    # 啟動開發伺服器

# 資料庫（Supabase）
pnpm db:generate            # 產生 Prisma Client（若使用 Prisma）
pnpm db:migrate             # 執行 Migration
pnpm db:seed                # 執行 Seed 資料

# 程式碼品質
pnpm lint                   # ESLint 檢查
pnpm lint:fix               # ESLint 自動修復
pnpm format                 # Prettier 格式化
pnpm tsc --noEmit           # TypeScript 類型檢查

# 建置
pnpm build                  # 建置應用
```

---

## 行為規則

### 開發階段規則
1. **功能正確性第一**：功能對比架構美重要 100 倍，用最簡單的方式正確實作所有規則
2. **嚴格遵守規格**：任何實作都必須有明確的規格依據，禁止腦補
3. **規則可追溯**：每個規則實作都要加註解，能追溯到規格書具體章節
4. **錯誤完整展示**：所有錯誤必須完整顯示在前端（使用 E001-E008 錯誤代碼）
5. **前端展示完整**：病患要能透過 LIFF 完成預約，管理員要能透過後台管理系統
6. **測試資料豐富**：Seed data 要包含醫師、班表、時段、病患、各狀態預約

### 禁止事項
1. **禁止使用 npm 或 yarn**：只使用 pnpm
2. **禁止使用 --accept-data-loss**：資料庫遷移不可接受資料遺失
3. **禁止覆蓋現有資料**：不可任意刪除或覆蓋資料庫中的資料
4. 不要花時間設計複雜的架構（Repository Pattern、DDD 等非必要）
5. 不要實作規格中沒有提到的功能
6. 不要添加「可能需要」的欄位或功能
7. **不要創建新的 .md 文檔**：更新現有的 README.md 即可

### 溝通規則
1. **用中文回答**
2. **階段性報告**：每完成一個階段都要報告進度
3. **問題回報**：發現規格歧義或遺漏時立即回報
4. **不自行決定**：遇到規格未涵蓋的情況，詢問使用者而非自行決定

---

## 輸出產物

### 1. 原始碼
- Next.js 14 全端應用程式
- 病患端 LIFF 頁面
- 管理後台頁面
- API Routes

### 2. 資料庫
- Supabase PostgreSQL Schema
- Migration 檔案
- Seed 測試資料

### 3. 文件更新
- `README.md`：更新專案說明（永遠只有一份文檔）

---

## 完成標準

任務完成必須滿足以下所有條件：

**規格理解：**
- [ ] 已完整讀取並理解 `clinic-booking-spec.md`
- [ ] 已識別所有 11 張資料表與關係
- [ ] 已理解預約流程與併發處理邏輯
- [ ] 已理解時段分鐘數規則

**資料庫實作：**
- [ ] 11 張資料表全部建立
- [ ] Supabase Realtime 已啟用
- [ ] RLS 政策已設定
- [ ] Seed 資料完整（醫師、班表、時段、病患、預約）

**後端實作：**
- [ ] 病患端 API 全部實作（第 6.1 節）
- [ ] 管理後台 API 全部實作（第 6.2 節）
- [ ] 預約併發處理正確（Row-Level Lock）
- [ ] 錯誤代碼正確返回（E001-E008）

**前端實作（關鍵）：**
- [ ] LIFF 初始化與 LINE 登入
- [ ] 病患端預約完整流程
- [ ] 時段餘量即時更新
- [ ] 管理後台 Dashboard
- [ ] 預約/班表/病患管理介面
- [ ] 所有錯誤完整顯示在前端

**LINE 整合：**
- [ ] LIFF SDK 整合
- [ ] LINE Messaging API 通知

**品質標準：**
- [ ] TypeScript 類型檢查通過
- [ ] ESLint 檢查通過
- [ ] 所有程式碼基於規格實作，無任何腦補
- [ ] 沒有實作規格外的功能
