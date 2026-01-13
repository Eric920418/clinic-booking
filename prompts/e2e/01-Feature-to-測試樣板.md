# Gherkin-to-E2E-Test Translator

## Role

從 Gherkin Feature File 生成 E2E 測試樣板（純註解），識別事件風暴部位，並指引使用對應的 Handler Prompt 生成程式碼。

## Core Mapping

事件風暴 → Gherkin（已完成）→ E2E 測試程式碼註解樣板

映射規則：
- Given → Aggregate / Command / Event
- When → Command / Query / Event
- Then → 操作成功/失敗 / Aggregate / Read Model / Event

## Input

1. Feature File（Gherkin DSL-Level）
2. Prisma Schema（Model 定義）
3. API Spec（api.yml）
4. Tech Stack（**TypeScript + Playwright + Prisma + Next.js**）

## Output

測試樣板（純註解），**放在 `tests/e2e/` 目錄下**，格式：

```typescript
test('{scenario_name}', async ({ page, request }) => {
  // Given {原始 Gherkin 語句}
  // [事件風暴部位: {部位類型} - {名稱}]
  // [生成參考 Prompt: {Handler-檔名}.md]

  // When {原始 Gherkin 語句}
  // [事件風暴部位: {部位類型} - {名稱}]
  // [生成參考 Prompt: {Handler-檔名}.md]

  // Then {原始 Gherkin 語句}
  // [生成參考 Prompt: {Handler-檔名}.md]
})
```

## E2E 測試的核心特色

**測試文件組織**：
- **正式功能測試**：放在 `tests/e2e/` 目錄下（如 `booking.spec.ts`）
  - 由 Feature File 透過紅燈階段產出
  - 測試真實業務場景
- **基礎建設驗證**：放在 `tests/e2e/setup/` 目錄下
  - 驗證測試基礎設施是否正常運作
  - 不屬於正式業務測試

**技術架構**：
- **測試框架**: Playwright Test
- **測試對象**: HTTP API Endpoint + UI 頁面
- **資料庫**: Supabase PostgreSQL（透過 Prisma）
- **認證**: JWT Token in Cookie / LINE LIFF
- **依賴**: Playwright fixtures + Prisma Client
- **API Spec**: 必須參考 api.yml

---

## Test Organization Principle

**核心原則**: 使用 `test.describe` 區塊來組織屬於同一個 Rule 的測試

**通用概念**:
- 每個 Gherkin **Rule** 對應一個 **describe 區塊**
- 同一個 Rule 下的所有 Example/Scenario 放在同一個 describe 區塊中
- describe 的名稱來自 Rule 的描述

**實作方式**（TypeScript + Playwright）:

```typescript
import { test, expect } from '@playwright/test'

test.describe('影片進度必須單調遞增', () => {
  // 對應 Gherkin Rule: 影片進度必須單調遞增

  test('成功增加影片進度', async ({ page }) => {
    // ...
  })

  test('進度不可倒退', async ({ page }) => {
    // ...
  })
})

test.describe('進度值必須在0到100之間', () => {
  // 對應 Gherkin Rule: 進度值必須在 0-100% 之間

  test('有效範圍內的進度值可以更新', async ({ page }) => {
    // ...
  })
})
```

**命名規則**:
- 使用中文或英文描述（Playwright 支援）
- describe 名稱對應 Rule 描述
- test 名稱對應 Example/Scenario 名稱

---

## Background Handling

**核心原則**: Gherkin 的 Background 有兩個層級，對應不同的測試範圍

### 層級 1: Feature-level Background

**定義位置**: 在 Feature 之下、所有 Rule 之前

**適用範圍**: 整個 Feature 的所有測試案例（跨所有 Rule）

**實作方式**（TypeScript Playwright）:

```typescript
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from './helpers/cleanup'
import { createPatient, createDoctor } from './factories'

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()

  // Given 準備一個病患 "王小明"
  // [事件風暴部位: Aggregate - Patient]
  // [生成參考 Prompt: Aggregate-Given-Handler.md]

  // And 準備一個醫師 "李醫師"
  // [事件風暴部位: Aggregate - Doctor]
  // [生成參考 Prompt: Aggregate-Given-Handler.md]
})

test.describe('預約需選擇診療類型和時段', () => {
  test('成功建立預約', async ({ page }) => {
    // ...
  })
})
```

**重點**:
- 使用 `test.beforeEach` 確保每個測試前都執行
- 先清空資料庫，確保測試隔離
- 所有 describe 區塊自動共用這個 Background

---

### 層級 2: Rule-level Background

**定義位置**: 在特定 Rule 之下

**適用範圍**: 僅該 Rule 對應的 describe 區塊

**實作方式**（TypeScript Playwright）:

```typescript
import { test, expect } from '@playwright/test'

// Feature-level Background
test.beforeEach(async () => {
  await cleanupDatabase()
  // Given 準備一個病患 "王小明"
  // [事件風暴部位: Aggregate - Patient]
  // [生成參考 Prompt: Aggregate-Given-Handler.md]
})

test.describe('預約需選擇診療類型和時段', () => {
  // Rule-level Background
  test.beforeEach(async () => {
    // Given 準備一個診療類型 "針灸"
    // [事件風暴部位: Aggregate - TreatmentType]
    // [生成參考 Prompt: Aggregate-Given-Handler.md]

    // And 準備一個可預約時段 09:00-09:30
    // [事件風暴部位: Aggregate - TimeSlot]
    // [生成參考 Prompt: Aggregate-Given-Handler.md]
  })

  test('成功建立預約', async ({ page }) => {
    // ...
  })

  test('時段已滿時無法預約', async ({ page }) => {
    // ...
  })
})

test.describe('同一病患當日只能預約一次', () => {
  // 此 Rule 沒有自己的 Background

  test('重複預約應被拒絕', async ({ page }) => {
    // ...
  })
})
```

**重點**:
- Rule-level Background 使用 describe 區塊內的 `test.beforeEach`
- 只出現在對應的 describe 區塊中
- 在每個測試執行前都會執行（在 Feature-level Background 之後）

---

## Decision Rules

### Rule 1: Given 語句識別

#### Pattern 1.1: Given + Aggregate
**識別規則**：
- 語句中包含實體名詞 + 屬性描述
- 描述「某個東西的某個屬性是某個值」
- 常見句型（非窮舉）：「準備一個...」「存在一個...」「...的...為」

**通用判斷**：如果 Given 是在建立測試的初始資料狀態（而非執行動作），就使用此 Handler

**範例**：
```gherkin
Given 準備一個病患, with table:
  | name | phone | nationalId |
  | 王小明 | 0912345678 | A123456789 |
```

**輸出**：
```typescript
// Given 準備一個病患 "王小明"
// [事件風暴部位: Aggregate - Patient]
// [生成參考 Prompt: Aggregate-Given-Handler.md]
```

#### Pattern 1.2: Given + Command
**識別規則**：
- 動作會修改系統狀態（已完成的動作）
- 描述「已經執行完某個動作」
- 常見過去式（非窮舉）：「已預約」「已完成」「已建立」「已驗證」「已登入」

**通用判斷**：如果 Given 描述已完成的寫入操作（用於建立前置條件），就使用此 Handler

**E2E 特色**：Given + Command 會實際調用 API 來建立前置條件

**範例**：
```gherkin
Given 病患 "王小明" 已預約 2024-01-15 09:00 的針灸
```

**輸出**：
```typescript
// Given 病患 "王小明" 已預約 2024-01-15 09:00 的針灸
// [事件風暴部位: Command - create_appointment]
// [生成參考 Prompt: Command-Handler.md]
```

---

### Rule 2: When 語句識別

#### Pattern 2.1: When + Command
**識別規則**：
- 動作會修改系統狀態
- 描述「執行某個動作」
- 常見現在式（非窮舉）：「預約」「取消」「建立」「更新」「刪除」「報到」

**通用判斷**：如果 When 是修改系統狀態的操作，就使用此 Handler

**E2E 特色**：When + Command 會調用 HTTP POST/PUT/DELETE API 或操作 UI

**範例**：
```gherkin
When 病患 "王小明" 建立預約, call table:
  | doctorId | treatmentTypeId | timeSlotId | appointmentDate |
  | $doctorId | $treatmentTypeId | $timeSlotId | 2024-01-15 |
```

**輸出**：
```typescript
// When 病患 "王小明" 建立預約
// [事件風暴部位: Command - create_appointment]
// [生成參考 Prompt: Command-Handler.md]
```

#### Pattern 2.2: When + Query
**識別規則**：
- 動作不修改系統狀態，只讀取資料
- 描述「取得某些資訊」的動作
- 常見動詞（非窮舉）：「查詢」「取得」「列出」「檢視」「獲取」

**通用判斷**：如果 When 是讀取操作且需要回傳值供 Then 驗證，就使用此 Handler

**E2E 特色**：When + Query 會調用 HTTP GET API

**範例**：
```gherkin
When 病患 "王小明" 查詢預約紀錄
```

**輸出**：
```typescript
// When 病患 "王小明" 查詢預約紀錄
// [事件風暴部位: Query - get_appointments]
// [生成參考 Prompt: Query-Handler.md]
```

---

### Rule 3: Then 語句識別

#### Pattern 3.1: Then 操作成功
**識別規則**：
- 明確描述操作成功
- 常見句型：「操作成功」「預約成功」「執行成功」

**通用判斷**：如果 Then 只關注操作是否成功（HTTP 2XX），就使用此 Handler

**E2E 特色**：驗證 HTTP response status code 是否為 2XX，或驗證成功頁面/訊息

**範例**：
```gherkin
Then 預約成功
```

**輸出**：
```typescript
// Then 預約成功
// [生成參考 Prompt: Success-Failure-Handler.md]
```

#### Pattern 3.2: Then 操作失敗
**識別規則**：
- 明確描述操作失敗
- 常見句型：「操作失敗」「預約失敗」「應顯示錯誤」

**通用判斷**：如果 Then 只關注操作是否失敗（HTTP 4XX），就使用此 Handler

**E2E 特色**：驗證 HTTP response status code 是否為 4XX，或驗證錯誤訊息

**範例**：
```gherkin
Then 預約失敗，顯示 "該時段已滿"
```

**輸出**：
```typescript
// Then 預約失敗，顯示 "該時段已滿"
// [生成參考 Prompt: Success-Failure-Handler.md]
```

#### Pattern 3.3: Then + Aggregate
**識別規則**：
- 驗證實體的屬性值（而非 API 回傳值）
- 描述「某個東西的某個屬性應該是某個值」
- 常見句型（非窮舉）：「應該存在一個...」「...的...應為」「資料庫應有」

**通用判斷**：如果 Then 是驗證 Command 操作後的資料狀態（需要從資料庫查詢），就使用此 Handler

**E2E 特色**：使用 Prisma 從真實 PostgreSQL 查詢資料

**範例**：
```gherkin
And 應該存在一個預約, with table:
  | patientId | doctorId | status |
  | $patientId | $doctorId | booked |
```

**輸出**：
```typescript
// And 應該存在一個預約
// [事件風暴部位: Aggregate - Appointment]
// [生成參考 Prompt: Aggregate-Then-Handler.md]
```

#### Pattern 3.4: Then + Read Model
**識別規則**：
- 前提：When 是 Query 操作（已接收 response）
- 驗證的是 API 回傳值（而非資料庫中的狀態）
- 常見句型（非窮舉）：「回應應包含」「查詢結果應」「應返回」「結果包含」

**通用判斷**：如果 Then 是驗證 Query 操作的回傳值，就使用此 Handler

**E2E 特色**：驗證 HTTP response body 的內容

**範例**：
```gherkin
And 回應, with table:
  | appointmentId | status |
  | &gt(0) | booked |
```

**輸出**：
```typescript
// And 回應應包含 appointmentId 和 status = "booked"
// [事件風暴部位: Read Model]
// [生成參考 Prompt: ReadModel-Then-Handler.md]
```

---

## Decision Tree

```
讀取 Gherkin 語句
↓
判斷位置（Given/When/Then/And）

Given:
  建立測試的初始資料狀態（實體屬性值）？
    → Aggregate-Given-Handler.md
  已完成的寫入操作（建立前置條件，調用 API）？
    → Command-Handler.md

When:
  讀取操作（調用 HTTP GET API）？
    → Query-Handler.md
  寫入操作（調用 HTTP POST/PUT/DELETE API 或 UI 操作）？
    → Command-Handler.md

Then:
  只關注操作成功或失敗（HTTP status code / UI 訊息）？
    → Success-Failure-Handler.md
  驗證 Command 操作後的資料狀態（從資料庫查詢）？
    → Aggregate-Then-Handler.md
  驗證 Query 操作的 API 回傳值（response body）？
    → ReadModel-Then-Handler.md

And:
  繼承前一個 Given/When/Then 的判斷規則
```

---

## Handler Prompt 映射表

| 事件風暴部位 | 位置 | 識別規則 | Handler Prompt | E2E 特色 |
|------------|------|---------|---------------|---------|
| Aggregate | Given | 建立初始資料狀態（實體屬性值） | Aggregate-Given-Handler.md | 用 Prisma 寫入 DB |
| Command | Given/When | 寫入操作（已完成/現在執行） | Command-Handler.md | 調用 HTTP POST API 或 UI |
| Query | When | 讀取操作（需要回傳值） | Query-Handler.md | 調用 HTTP GET API |
| 操作成功/失敗 | Then | 只驗證成功或失敗 | Success-Failure-Handler.md | 驗證 HTTP status / UI |
| Aggregate | Then | 驗證實體狀態（從資料庫查詢） | Aggregate-Then-Handler.md | 用 Prisma 查詢 DB |
| Read Model | Then | 驗證 API 回傳值 | ReadModel-Then-Handler.md | 驗證 response body |

---

## Complete Example

**Input** (同時包含 Feature-level 和 Rule-level Background):

```gherkin
Feature: 病患預約看診

Background:
  Given 準備一個病患, with table:
    | >patientId | name | phone | nationalId | lineUserId |
    | <id | 王小明 | 0912345678 | A123456789 | U1234567890 |

  And 準備一個醫師, with table:
    | >doctorId | name | isActive |
    | <id | 李醫師 | true |

Rule: 預約需選擇診療類型和時段

  Background:
    Given 準備一個診療類型, with table:
      | >treatmentTypeId | name | durationMinutes |
      | <id | 針灸 | 5 |

    And 準備一個時段, with table:
      | >timeSlotId | startTime | endTime | remainingMinutes |
      | <id | 09:00 | 09:30 | 30 |

  Example: 成功建立預約
    When 病患 "王小明" 建立預約, call table:
      | doctorId | treatmentTypeId | timeSlotId | appointmentDate |
      | $doctorId | $treatmentTypeId | $timeSlotId | 2024-01-15 |

    Then 預約成功

    And 應該存在一個預約, with table:
      | patientId | doctorId | status |
      | $patientId | $doctorId | booked |

  Example: 時段已滿時無法預約
    Given 時段剩餘分鐘數為 0

    When 病患 "王小明" 建立預約, call table:
      | doctorId | treatmentTypeId | timeSlotId | appointmentDate |
      | $doctorId | $treatmentTypeId | $timeSlotId | 2024-01-15 |

    Then 預約失敗，顯示 "該時段已滿"

Rule: 同一病患當日只能預約一次

  Example: 重複預約應被拒絕
    Given 病患 "王小明" 已預約 2024-01-15 09:00 的針灸

    When 病患 "王小明" 再次建立 2024-01-15 的預約

    Then 預約失敗，顯示 "當日已有預約"
```

**Output**:

```typescript
// tests/e2e/liff/booking.spec.ts
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { createPatient, createDoctor, createTreatmentType, createTimeSlot } from '../factories'
import { prisma } from '../helpers/db'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, any> = {}

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // Given 準備一個病患 "王小明"
  // [事件風暴部位: Aggregate - Patient]
  // [生成參考 Prompt: Aggregate-Given-Handler.md]

  // And 準備一個醫師 "李醫師"
  // [事件風暴部位: Aggregate - Doctor]
  // [生成參考 Prompt: Aggregate-Given-Handler.md]
})

test.describe('預約需選擇診療類型和時段', () => {
  /**
   * Rule: 預約需選擇診療類型和時段
   */

  // Rule-level Background
  test.beforeEach(async () => {
    // Given 準備一個診療類型 "針灸"
    // [事件風暴部位: Aggregate - TreatmentType]
    // [生成參考 Prompt: Aggregate-Given-Handler.md]

    // And 準備一個時段 09:00-09:30
    // [事件風暴部位: Aggregate - TimeSlot]
    // [生成參考 Prompt: Aggregate-Given-Handler.md]
  })

  test('成功建立預約', async ({ page, request }) => {
    // When 病患 "王小明" 建立預約
    // [事件風暴部位: Command - create_appointment]
    // [生成參考 Prompt: Command-Handler.md]

    // Then 預約成功
    // [生成參考 Prompt: Success-Failure-Handler.md]

    // And 應該存在一個預約
    // [事件風暴部位: Aggregate - Appointment]
    // [生成參考 Prompt: Aggregate-Then-Handler.md]
  })

  test('時段已滿時無法預約', async ({ page, request }) => {
    // Given 時段剩餘分鐘數為 0
    // [事件風暴部位: Aggregate - TimeSlot]
    // [生成參考 Prompt: Aggregate-Given-Handler.md]

    // When 病患 "王小明" 建立預約
    // [事件風暴部位: Command - create_appointment]
    // [生成參考 Prompt: Command-Handler.md]

    // Then 預約失敗，顯示 "該時段已滿"
    // [生成參考 Prompt: Success-Failure-Handler.md]
  })
})

test.describe('同一病患當日只能預約一次', () => {
  /**
   * Rule: 同一病患當日只能預約一次
   * (此 Rule 沒有自己的 Background)
   */

  test('重複預約應被拒絕', async ({ page, request }) => {
    // Given 病患 "王小明" 已預約 2024-01-15 09:00 的針灸
    // [事件風暴部位: Command - create_appointment]
    // [生成參考 Prompt: Command-Handler.md]

    // When 病患 "王小明" 再次建立 2024-01-15 的預約
    // [事件風暴部位: Command - create_appointment]
    // [生成參考 Prompt: Command-Handler.md]

    // Then 預約失敗，顯示 "當日已有預約"
    // [生成參考 Prompt: Success-Failure-Handler.md]
  })
})
```

---

## Execution Steps

1. 讀取 Feature File 的 **Feature-level Background** 區塊（如果存在）
2. 讀取 Feature File 的每個 **Rule**
3. 讀取 Rule 的 **Rule-level Background** 區塊（如果存在）
4. **為每個 Rule 建立 describe 區塊**
5. 如果有 Rule-level Background，在 describe 區塊中**建立 beforeEach**
6. 將 Background 依序寫入：
   - **Feature-level Background**：使用檔案層級的 `test.beforeEach`
   - **Rule-level Background**：使用 describe 區塊內的 `test.beforeEach`
7. 解析 Background 的 Given/And 語句，生成樣板註解
8. 讀取 Rule 下的每個 Example/Scenario
9. 為每個 Example 建立測試函式（放在對應的 describe 區塊中）
10. 在測試函式參數中注入**必要的 fixtures**：
    - `page` - Playwright Page 物件（UI 測試）
    - `request` - Playwright API Request 物件（API 測試）
11. 逐句解析測試函式的 Given/When/Then/And
12. 應用 Decision Tree 識別事件風暴部位
13. 生成註解，包含：
    - 原始 Gherkin 語句
    - 事件風暴部位類型和名稱
    - 對應的 Handler Prompt 檔名
14. 組裝完整測試函式
15. 組裝完整 describe 區塊（Background beforeEach + 所有測試函式）
16. 輸出測試檔案樣板

---

## Critical Rules

### R1: Rule → describe 區塊
每個 Gherkin Rule 必須對應一個 `test.describe` 區塊，同一 Rule 下的所有測試函式放在同一個 describe 區塊中。

### R2: Feature-level Background 使用檔案層級 beforeEach
Feature-level Background（定義在 Feature 之下）必須使用檔案層級的 `test.beforeEach`，放在所有 describe 區塊之前。必須先呼叫 `cleanupDatabase()` 確保測試隔離。

### R3: Rule-level Background → describe 內的 beforeEach
Rule-level Background（定義在 Rule 之下）使用 describe 區塊內的 `test.beforeEach`，只出現在對應的 describe 區塊中。

### R4: 只輸出註解樣板
不生成任何實作程式碼，只生成註解和指引。

### R5: 保留完整 Gherkin 語句
註解中必須包含原始 Gherkin 語句，方便閱讀。

### R6: 明確標註事件風暴部位
每個語句都要識別出對應的事件風暴部位。

### R7: 指引正確的 Handler
根據 Decision Tree 指引使用正確的 Handler Prompt。

### R8: 處理 And 語句
And 語句繼承前一個 Given/When/Then 的判斷邏輯。

### R9: Background 使用相同註解格式
所有 Background（Feature-level 和 Rule-level）內部必須使用與測試函式相同的樣板註解格式（事件風暴部位 + Handler Prompt）。

### R10: 注入必要的 Playwright fixtures
每個測試函式參數必須包含必要的 fixtures：
- `page` - Playwright Page 物件（用於 UI 測試）
- `request` - Playwright API Request 物件（用於 API 測試）

### R11: 使用 Factory Pattern 建立測試資料
使用 Factory 函式（如 `createPatient`, `createDoctor`）建立測試資料，不直接使用 Prisma Client。

```typescript
// ✅ 正確：使用 Factory
const patient = await createPatient({ name: '王小明' })
context['patientId'] = patient.id

// ❌ 避免：直接使用 Prisma
const patient = await prisma.patient.create({ data: { ... } })
```

### R12: 測試上下文使用 context 物件
使用模組層級的 `context` 物件在步驟間傳遞資料：

```typescript
let context: Record<string, any> = {}

test.beforeEach(async () => {
  context = {} // 每個測試前重置
  const patient = await createPatient()
  context['patientId'] = patient.id
})

test('example', async ({ page }) => {
  const patientId = context['patientId']
  // ...
})
```

---

## 測試檔案位置規範

| 測試類型 | 目錄 | 範例 |
|---------|------|------|
| LIFF 端 E2E | `tests/e2e/liff/` | `booking.spec.ts`, `verify.spec.ts` |
| 管理後台 E2E | `tests/e2e/admin/` | `login.spec.ts`, `dashboard.spec.ts` |
| API 測試 | `tests/e2e/api/` | `appointments.spec.ts` |
| 輔助函式 | `tests/e2e/helpers/` | `cleanup.ts`, `auth.ts`, `db.ts` |
| 測試資料工廠 | `tests/e2e/factories/` | `patient.ts`, `doctor.ts` |

---

## 與 Python 版本的對照

| Python (pytest) | TypeScript (Playwright) |
|-----------------|------------------------|
| `class TestRuleName:` | `test.describe('Rule Name', () => {})` |
| `@pytest.fixture(autouse=True)` | `test.beforeEach(async () => {})` |
| `def test_example(self):` | `test('example', async ({ page }) => {})` |
| `context = {}` (fixture) | `let context: Record<string, any> = {}` |
| `api_client.post()` | `request.post()` |
| `db_session.query()` | `prisma.model.findMany()` |
| Repository Pattern | Factory Pattern |
