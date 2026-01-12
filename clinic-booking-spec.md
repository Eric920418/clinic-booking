# 中醫診所 LINE 預約系統 - 開發規格書

**版本**：1.0  
**日期**：2026-01-10

---

## 1. 系統概述

### 1.1 專案目標

建置一套整合 LINE LIFF 的中醫診所預約系統，提供病患線上預約與診所後台管理功能。

### 1.2 技術架構

| 層級 | 技術選型 |
|------|----------|
| 前端框架 | Next.js 14+ (App Router) |
| 部署平台 | Vercel |
| 資料庫 | Supabase PostgreSQL |
| 即時更新 | Supabase Realtime |
| LINE 整合 | LIFF v2 |
| 驗證機制 | LINE Login + 自訂驗證碼 |

### 1.3 系統角色

| 角色 | 說明 |
|------|------|
| 病患 | 透過 LINE LIFF 進行預約操作 |
| 管理員 | 透過後台管理預約、班表、病患資料 |
| 超級管理員 | 具備帳號管理與系統設定權限 |

---

## 2. 功能模組總覽

### 2.1 病患端（LINE LIFF）

| 模組 | 功能項目 |
|------|----------|
| 系統進入與驗證 | LINE 入口、真人驗證、驗證碼輸入 |
| 個人資料處理 | 姓名、電話、身分證、出生日期 |
| 預約操作 | 選日期、選醫師、選時段、選診療類型、建立預約 |
| 預約管理 | 查看詳情、編輯預約、取消預約 |

### 2.2 管理後台

| 模組 | 功能項目 |
|------|----------|
| Dashboard | 今日預約、取消統計、值班總覽、時段餘量、週流量、異常提醒 |
| 預約管理 | 查看/篩選/編輯/取消/手動新增/狀態管理 |
| 班表管理 | 醫師清單、可預約日、時段設定、分鐘數配置、特殊異動 |
| 病患資料管理 | 病患列表、報到狀態、基本資料、預約紀錄、備註 |
| 系統設定 | 帳號管理、權限設定、密碼、語言、時區 |

---

## 3. 病患端功能規格

### 3.1 系統進入與驗證

#### 3.1.1 LINE LIFF 入口

**觸發條件**：用戶點擊 LINE 官方帳號中的預約連結

**流程**：
1. LIFF 初始化，取得 LINE User ID
2. 檢查用戶是否在黑名單
3. 若在黑名單，顯示「您已被停權，無法使用預約服務」
4. 若不在黑名單，進入驗證流程

#### 3.1.2 真人驗證

**目的**：防止機器人濫用

**流程**：
1. 系統產生 6 位數驗證碼
2. 透過 LINE Messaging API 發送驗證碼至用戶
3. 用戶輸入驗證碼
4. 驗證成功進入預約流程；失敗可重新發送（限制：60 秒內 1 次）

**驗證碼規則**：
- 長度：6 位數字
- 有效期：5 分鐘
- 錯誤上限：5 次（超過需重新發送）

### 3.2 個人資料處理

#### 3.2.1 資料欄位

| 欄位 | 必填 | 驗證規則 |
|------|------|----------|
| 姓名 | 是 | 2-20 字元，中英文皆可 |
| 電話 | 是 | 台灣手機格式 09xxxxxxxx |
| 身分證字號 | 是 | 台灣身分證格式驗證 |
| 出生年月日 | 是 | 日期格式，不可為未來日期 |

#### 3.2.2 資料處理邏輯

1. 以「LINE User ID + 身分證字號」作為唯一識別
2. 若為首次預約，建立新病患資料
3. 若為回診，自動帶入歷史資料（可修改）

### 3.3 預約操作

#### 3.3.1 選擇看診日期

**UI 元件**：行事曆

**顯示規則**：
- 僅顯示可預約日期（依班表設定）
- 不可選擇過去日期
- 不可選擇超過 30 天後的日期（可配置）

#### 3.3.2 選擇醫師

**顯示規則**：
- 僅顯示該日有值班的醫師
- 顯示醫師姓名與專長項目
- 依診療項目篩選可看診醫師

#### 3.3.3 選擇時段

**顯示規則**：
- 顯示該醫師該日的所有時段
- 標示各時段剩餘可預約分鐘數
- 剩餘分鐘數不足時，該時段不可選（依診療項目所需分鐘數判斷）

**即時更新**：
- 訂閱 Supabase Realtime
- 時段餘量變動時即時更新 UI

#### 3.3.4 選擇診療類型

**診療項目與扣除分鐘數**：

| 項目 | 扣除分鐘數 | 備註 |
|------|------------|------|
| 初診 | 10 分鐘 | 首次就診 |
| 內科 | 5 分鐘 | 一般內科診療 |
| 針灸 | 5 分鐘 | 針灸治療 |

**規則**：
- 每次預約僅能選擇一個項目
- 項目清單依醫師可看診項目動態顯示
- 分鐘數可由後台調整（未來擴充）

#### 3.3.5 建立預約

**API 處理邏輯**：

```
1. 接收預約請求
2. 開啟資料庫交易 (Transaction)
3. 鎖定該時段記錄 (SELECT FOR UPDATE)
4. 檢查剩餘分鐘數 >= 診療所需分鐘數
5. 檢查該病患當日是否已有預約
6. 若檢查通過：
   - 扣除時段分鐘數
   - 建立預約記錄
   - 提交交易
   - 發送 LINE 通知
7. 若檢查失敗：
   - 回滾交易
   - 返回錯誤訊息
```

**併發衝突處理**：
- 使用資料庫層級的 Row-Level Lock
- 先取得鎖定者成功，後者返回「時段已被預約」

### 3.4 預約管理

#### 3.4.1 查看預約詳情

**顯示資訊**：
- 預約日期與時段
- 醫師姓名
- 診療類型
- 預約狀態（已預約/已取消/已完成/未報到）
- 預約建立時間

#### 3.4.2 編輯預約

**可修改項目**：
- 日期
- 時段
- 醫師
- 診療類型

**處理邏輯**：

```
1. 接收修改請求
2. 開啟資料庫交易
3. 釋放原時段分鐘數（立即）
4. 鎖定新時段
5. 檢查新時段餘量
6. 更新預約記錄
7. 提交交易
8. 透過 Realtime 即時廣播變更
```

**限制**：
- 僅可修改「已預約」狀態的預約
- 不可修改當日預約（可配置）

#### 3.4.3 取消預約

**處理邏輯**：
1. 更新預約狀態為「已取消」
2. 釋放時段分鐘數
3. 發送 LINE 取消通知
4. 透過 Realtime 即時廣播變更

---

## 4. 管理後台功能規格

### 4.1 系統入口

#### 4.1.1 登入

**欄位**：
- 帳號（Email）
- 密碼

**安全機制**：
- 密碼加密儲存（bcrypt）
- 登入失敗 5 次鎖定 15 分鐘
- Session 有效期 24 小時

#### 4.1.2 多語系與時區

**支援語系**：繁體中文、英文

**時區設定**：預設 Asia/Taipei，可切換

### 4.2 Dashboard

#### 4.2.1 今日總預約

**顯示**：當日所有預約數量（含各狀態）

**細項**：
- 已預約
- 已報到
- 已完成
- 未報到

#### 4.2.2 今日已取消總覽

**顯示**：當日取消的預約數量與列表

#### 4.2.3 醫師值班總覽

**顯示**：當日值班醫師清單與各自預約量

#### 4.2.4 剩餘可預約時段

**顯示**：各時段剩餘分鐘數（依醫師分組）

#### 4.2.5 每周預約流量總覽

**顯示**：過去 7 天預約趨勢圖

#### 4.2.6 異常狀態提醒

**觸發條件**：
- 時段滿額
- 臨時取消（當日取消）
- 高未報到率醫師

### 4.3 預約管理

#### 4.3.1 查看所有預約

**列表欄位**：
- 預約編號
- 病患姓名
- 電話
- 預約日期
- 時段
- 醫師
- 診療類型
- 狀態
- 建立時間

**篩選條件**：
- 日期範圍
- 醫師
- 診療類型
- 狀態

**排序**：預約日期（預設降冪）

#### 4.3.2 編輯預約

**可修改欄位**：
- 日期
- 時段
- 醫師
- 診療類型
- 狀態

**操作紀錄**：記錄修改人與修改時間

#### 4.3.3 取消預約

**流程**：
1. 確認取消原因（可選）
2. 更新狀態
3. 釋放時段
4. 發送 LINE 通知

#### 4.3.4 手動新增預約

**使用情境**：電話預約

**流程**：
1. 輸入病患資料（或搜尋現有病患）
2. 選擇日期、醫師、時段、診療類型
3. 系統檢查時段餘量
4. 建立預約
5. 發送 LINE 通知（若有綁定）

#### 4.3.5 預約狀態管理

**狀態流轉**：

```
已預約 → 已報到 → 已完成
    ↓         ↓
  已取消    未報到
```

**未報到處理**：
- 當日預約時段結束後，系統自動將「已預約」狀態改為「未報到」
- 累計未報到達 3 次，自動加入黑名單

### 4.4 班表管理

#### 4.4.1 醫師清單

**欄位**：
- 醫師編號
- 姓名
- 可看診項目（多選）
- 狀態（啟用/停用）

**操作**：新增、編輯、停用

#### 4.4.2 可預約日設定

**設定方式**：
- 週期性設定（例：每週一、三、五）
- 單日設定

**欄位**：
- 醫師
- 日期/星期
- 是否可預約

#### 4.4.3 可預約時段設定

**欄位**：
- 醫師
- 日期
- 開始時間
- 結束時間
- 時段長度（預設 30 分鐘）

**範例**：
```
醫師：王醫師
日期：每週一
時段：09:00-12:00, 14:00-17:00
時段長度：30 分鐘
→ 產生時段：09:00, 09:30, 10:00...
```

#### 4.4.4 時段分鐘數配置

**全域設定**：

| 設定項 | 預設值 | 說明 |
|--------|--------|------|
| 時段總分鐘數 | 30 | 每時段可預約總分鐘 |

**診療項目設定**：

| 項目 | 扣除分鐘數 | 可修改 |
|------|------------|--------|
| 初診 | 10 | 是 |
| 內科 | 5 | 是 |
| 針灸 | 5 | 是 |
| （可新增） | （可設定） | 是 |

#### 4.4.5 剩餘分鐘數調整

**使用情境**：手動調整特定時段餘量

**操作**：選擇時段 → 輸入新餘量 → 儲存

#### 4.4.6 特殊異動設定

**停診**：
- 選擇醫師、日期
- 標記為停診
- 已預約者發送通知

**加診**：
- 選擇醫師、日期
- 新增額外時段

### 4.5 病患資料管理

#### 4.5.1 病患列表

**欄位**：
- 病患編號
- 姓名
- 電話
- 身分證字號
- 出生日期
- LINE 綁定狀態
- 黑名單狀態
- 預約次數
- 未報到次數

**篩選**：
- 姓名/電話/身分證搜尋
- 黑名單篩選
- LINE 綁定篩選

#### 4.5.2 病患預約狀態

**顯示**：該病患所有預約紀錄

**標示**：已報到、未報到

#### 4.5.3 病患備註

**用途**：內部註記（病患不可見）

**範例**：特殊需求、過敏史、注意事項

#### 4.5.4 黑名單管理

**自動加入條件**：未報到累計 >= 3 次

**手動操作**：
- 加入黑名單（輸入原因）
- 移除黑名單（輸入原因）

**紀錄**：操作人、時間、原因

### 4.6 系統設定

#### 4.6.1 帳號管理

**欄位**：
- 帳號（Email）
- 姓名
- 角色（管理員/超級管理員）
- 狀態

**操作**：新增、編輯、停用、重設密碼

#### 4.6.2 權限設定

**角色權限矩陣**：

| 功能 | 管理員 | 超級管理員 |
|------|--------|------------|
| Dashboard | ✓ | ✓ |
| 預約管理 | ✓ | ✓ |
| 班表管理 | ✓ | ✓ |
| 病患資料管理 | ✓ | ✓ |
| 系統設定 | ✗ | ✓ |
| 帳號管理 | ✗ | ✓ |

#### 4.6.3 密碼設定

**規則**：
- 最小長度：8 字元
- 需包含：大寫、小寫、數字

#### 4.6.4 語言與時區

**語言**：繁體中文（預設）、英文

**時區**：Asia/Taipei（預設）

---

## 5. 資料庫設計

### 5.1 資料表清單

| 資料表 | 說明 |
|--------|------|
| patients | 病患資料 |
| doctors | 醫師資料 |
| treatment_types | 診療類型 |
| doctor_treatments | 醫師可看診項目（多對多） |
| schedules | 班表 |
| time_slots | 時段 |
| appointments | 預約 |
| blacklist | 黑名單 |
| admin_users | 後台帳號 |
| verification_codes | 驗證碼 |
| operation_logs | 操作紀錄 |

### 5.2 資料表結構

#### 5.2.1 patients（病患）

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(255) UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  national_id VARCHAR(20) NOT NULL UNIQUE,
  birth_date DATE NOT NULL,
  notes TEXT,
  no_show_count INT DEFAULT 0,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_line_user_id ON patients(line_user_id);
CREATE INDEX idx_patients_national_id ON patients(national_id);
```

#### 5.2.2 doctors（醫師）

```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.2.3 treatment_types（診療類型）

```sql
CREATE TABLE treatment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初始資料
INSERT INTO treatment_types (name, duration_minutes, sort_order) VALUES
  ('初診', 10, 1),
  ('內科', 5, 2),
  ('針灸', 5, 3);
```

#### 5.2.4 doctor_treatments（醫師診療項目）

```sql
CREATE TABLE doctor_treatments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  treatment_type_id UUID REFERENCES treatment_types(id) ON DELETE CASCADE,
  UNIQUE(doctor_id, treatment_type_id)
);
```

#### 5.2.5 schedules（班表）

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, date)
);

CREATE INDEX idx_schedules_date ON schedules(date);
```

#### 5.2.6 time_slots（時段）

```sql
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_minutes INT DEFAULT 30,
  remaining_minutes INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_slots_schedule_id ON time_slots(schedule_id);
```

#### 5.2.7 appointments（預約）

```sql
CREATE TYPE appointment_status AS ENUM (
  'booked',      -- 已預約
  'checked_in',  -- 已報到
  'completed',   -- 已完成
  'no_show',     -- 未報到
  'cancelled'    -- 已取消
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id UUID REFERENCES doctors(id) ON DELETE RESTRICT,
  treatment_type_id UUID REFERENCES treatment_types(id) ON DELETE RESTRICT,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE RESTRICT,
  appointment_date DATE NOT NULL,
  status appointment_status DEFAULT 'booked',
  cancelled_reason TEXT,
  cancelled_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE UNIQUE INDEX idx_appointments_patient_date 
  ON appointments(patient_id, appointment_date) 
  WHERE status NOT IN ('cancelled');
```

#### 5.2.8 blacklist（黑名單）

```sql
CREATE TABLE blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.2.9 admin_users（後台帳號）

```sql
CREATE TYPE admin_role AS ENUM ('admin', 'super_admin');

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role admin_role DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  language VARCHAR(10) DEFAULT 'zh-TW',
  timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
  failed_login_count INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.2.10 verification_codes（驗證碼）

```sql
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  attempts INT DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_line_user_id ON verification_codes(line_user_id);
```

#### 5.2.11 operation_logs（操作紀錄）

```sql
CREATE TABLE operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_operation_logs_admin_user_id ON operation_logs(admin_user_id);
CREATE INDEX idx_operation_logs_created_at ON operation_logs(created_at);
```

### 5.3 Supabase Realtime 設定

**啟用 Realtime 的資料表**：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE time_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
```

**Row Level Security (RLS)**：

```sql
-- time_slots: 所有人可讀
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "time_slots_read" ON time_slots FOR SELECT USING (true);

-- appointments: 僅限本人或管理員
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_own" ON appointments FOR SELECT
  USING (patient_id IN (SELECT id FROM patients WHERE line_user_id = auth.jwt()->>'sub'));
```

---

## 6. API 設計

### 6.1 病患端 API

#### 6.1.1 驗證相關

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/liff/verify/send | 發送驗證碼 |
| POST | /api/liff/verify/check | 驗證碼校驗 |

#### 6.1.2 預約相關

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/liff/available-dates | 取得可預約日期 |
| GET | /api/liff/doctors | 取得醫師列表 |
| GET | /api/liff/time-slots | 取得時段列表 |
| GET | /api/liff/treatment-types | 取得診療類型 |
| POST | /api/liff/appointments | 建立預約 |
| GET | /api/liff/appointments | 取得我的預約 |
| PUT | /api/liff/appointments/:id | 修改預約 |
| DELETE | /api/liff/appointments/:id | 取消預約 |

### 6.2 管理後台 API

#### 6.2.1 認證

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | /api/admin/auth/login | 登入 |
| POST | /api/admin/auth/logout | 登出 |
| GET | /api/admin/auth/me | 取得當前用戶 |

#### 6.2.2 Dashboard

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/dashboard/summary | 取得今日摘要 |
| GET | /api/admin/dashboard/weekly | 取得週統計 |
| GET | /api/admin/dashboard/alerts | 取得異常提醒 |

#### 6.2.3 預約管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/appointments | 取得預約列表 |
| POST | /api/admin/appointments | 手動建立預約 |
| PUT | /api/admin/appointments/:id | 修改預約 |
| PUT | /api/admin/appointments/:id/status | 更新狀態 |

#### 6.2.4 班表管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/doctors | 取得醫師列表 |
| POST | /api/admin/doctors | 新增醫師 |
| PUT | /api/admin/doctors/:id | 修改醫師 |
| GET | /api/admin/schedules | 取得班表 |
| POST | /api/admin/schedules | 新增班表 |
| PUT | /api/admin/schedules/:id | 修改班表 |
| PUT | /api/admin/time-slots/:id | 調整時段餘量 |

#### 6.2.5 病患管理

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/patients | 取得病患列表 |
| GET | /api/admin/patients/:id | 取得病患詳情 |
| PUT | /api/admin/patients/:id | 修改病患資料 |
| POST | /api/admin/patients/:id/blacklist | 加入黑名單 |
| DELETE | /api/admin/patients/:id/blacklist | 移除黑名單 |

#### 6.2.6 系統設定

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/admin/users | 取得管理員列表 |
| POST | /api/admin/users | 新增管理員 |
| PUT | /api/admin/users/:id | 修改管理員 |
| PUT | /api/admin/users/:id/password | 重設密碼 |
| GET | /api/admin/treatment-types | 取得診療類型 |
| PUT | /api/admin/treatment-types/:id | 修改診療類型 |

---

## 7. 業務規則摘要

### 7.1 時段分鐘數規則

| 規則 | 說明 |
|------|------|
| 時段總量 | 每時段 30 分鐘 |
| 扣除邏輯 | 預約成功時扣除對應分鐘數 |
| 釋放邏輯 | 取消或修改時立即釋放 |
| 不可預約條件 | 剩餘分鐘數 < 診療所需分鐘數 |

### 7.2 預約限制

| 規則 | 說明 |
|------|------|
| 每日限制 | 每位病患每日限預約 1 次（整間診所） |
| 項目限制 | 每次預約僅限 1 個診療項目 |
| 併發處理 | 資料庫層級鎖定，先到先得 |

### 7.3 黑名單規則

| 規則 | 說明 |
|------|------|
| 自動觸發 | 未報到累計 >= 3 次 |
| 效果 | 永久無法使用預約系統 |
| 解除 | 僅限超級管理員手動解除 |

### 7.4 即時更新規則

| 事件 | 更新內容 |
|------|----------|
| 新預約 | 時段剩餘分鐘數減少 |
| 取消預約 | 時段剩餘分鐘數增加 |
| 修改預約 | 原時段釋放、新時段扣除 |

---

## 8. LINE 整合

### 8.1 LIFF 設定

| 項目 | 值 |
|------|------|
| LIFF Size | Full |
| Endpoint URL | https://{domain}/liff |
| Scopes | profile, openid |

### 8.2 LINE Messaging API

**訊息類型**：

| 情境 | 訊息內容 |
|------|----------|
| 驗證碼 | 您的驗證碼是：{code}，5 分鐘內有效 |
| 預約成功 | 預約成功！{date} {time} {doctor} {treatment} |
| 預約修改 | 預約已修改！新時段：{date} {time} |
| 預約取消 | 預約已取消。如有需要請重新預約 |
| 停診通知 | {doctor} 醫師 {date} 停診，您的預約已取消 |

---

## 9. 非功能性需求

### 9.1 效能

| 項目 | 目標 |
|------|------|
| API 回應時間 | < 500ms (P95) |
| 頁面載入時間 | < 3 秒 |
| 併發處理 | 支援 100 同時連線 |

### 9.2 安全性

| 項目 | 措施 |
|------|------|
| 身分驗證 | JWT Token |
| 資料加密 | HTTPS、密碼 bcrypt |
| SQL Injection | 參數化查詢 |
| XSS | 輸入過濾、CSP |
| CSRF | SameSite Cookie |

### 9.3 可用性

| 項目 | 目標 |
|------|------|
| 系統可用性 | 99.5% |
| 資料備份 | 每日自動備份 |

---

## 10. 開發階段規劃

### Phase 1：核心功能（4 週）

- 資料庫建置
- 病患端預約流程
- 管理後台基礎功能
- LINE LIFF 整合

### Phase 2：進階功能（2 週）

- Dashboard 統計
- 即時更新（Supabase Realtime）
- 黑名單自動化
- LINE 訊息通知

### Phase 3：優化與測試（2 週）

- 效能優化
- 安全性測試
- 使用者測試
- 文件撰寫

---

## 附錄 A：狀態碼對照表

| 狀態 | 中文 | 說明 |
|------|------|------|
| booked | 已預約 | 預約建立完成 |
| checked_in | 已報到 | 病患已到場報到 |
| completed | 已完成 | 看診完成 |
| no_show | 未報到 | 時段結束未報到 |
| cancelled | 已取消 | 預約已取消 |

---

## 附錄 B：錯誤代碼

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
