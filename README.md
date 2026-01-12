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

# 啟動開發伺服器
pnpm dev

# 資料庫操作
pnpm db:generate      # 產生 Client
pnpm db:migrate       # 執行 Migration
pnpm db:seed          # 執行 Seed 資料

# 程式碼品質
pnpm lint             # ESLint 檢查
pnpm lint:fix         # ESLint 自動修復
pnpm format           # Prettier 格式化
pnpm tsc --noEmit     # TypeScript 類型檢查

# 建置
pnpm build            # 建置應用
```

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

## 規格文件

- `clinic-booking-spec.md` - 完整系統規格書
- `prompts/automation-ts.md` - 自動化開發指南
