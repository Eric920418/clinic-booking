// tests/e2e/liff/patient-data.spec.ts
// Feature: 病患資料處理
// API Endpoint: POST /api/patient/profile, GET /api/patient/profile

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { createPatient } from '../factories'
import { prisma } from '../helpers/db'

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
})

// ============================================
// 共用的有效測試資料（用於單一欄位驗證時）
// ============================================
// 有效的台灣身分證字號（檢查碼正確）
// A123456789: A=10, sum=130, 130%10=0 ✓
// B123456780: B=11, sum=130, 130%10=0 ✓
// C123456781: C=12, sum=140, 140%10=0 ✓
// E123456783: E=14, sum=160, 160%10=0 ✓
// F123456784: F=15, sum=170, 170%10=0 ✓
// G123456785: G=16, sum=180, 180%10=0 ✓
const validPatientData = {
  lineUserId: 'U1234567890abcdef',
  name: '王小明',
  phone: '0912345678',
  nationalId: 'A123456789', // 有效的身分證字號
  birthDate: '1990-01-01',
}

test.describe('姓名必須為 2-20 字元', () => {
  /**
   * Rule: 姓名必須為 2-20 字元
   */

  test('1 字元姓名無效', async ({ request }) => {
    // Given 姓名為 "王"（1 字元）
    const requestData = {
      ...validPatientData,
      name: '王', // 只有 1 個字元，無效
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('2 字元姓名有效', async ({ request }) => {
    // Given 姓名為 "王明"（2 字元）
    const requestData = {
      ...validPatientData,
      name: '王明', // 剛好 2 個字元，有效
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 個人資料被儲存
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)

    // 驗證資料庫中存在該病患
    const patient = await prisma.patient.findFirst({
      where: { name: '王明' },
    })
    expect(patient).not.toBeNull()
  })

  test('20 字元姓名有效', async ({ request }) => {
    // Given 姓名為 20 個字元
    // 中文字在 JS 中每個字元長度為 1
    const longName = '王明德王明德王明德王王明德王明德王明德王' // 20 個字元
    expect(longName.length).toBe(20) // 確認長度

    const requestData = {
      ...validPatientData,
      name: longName,
      nationalId: 'B123456780', // 使用不同身分證避免重複（檢查碼正確）
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 個人資料被儲存
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  test('21 字元姓名無效', async ({ request }) => {
    // Given 姓名為 21 個字元
    // 中文字在 JS 中每個字元長度為 1
    const tooLongName = '王明德王明德王明德王王明德王明德王明德王王' // 21 個字元
    expect(tooLongName.length).toBe(21) // 確認長度

    const requestData = {
      ...validPatientData,
      name: tooLongName,
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('電話必須為台灣手機格式', () => {
  /**
   * Rule: 電話必須為台灣手機格式
   * 台灣手機格式: 09xxxxxxxx (10 位數字，09 開頭)
   */

  test('正確的台灣手機格式', async ({ request }) => {
    // Given 電話為 "0912345678"
    const requestData = {
      ...validPatientData,
      phone: '0912345678', // 正確的台灣手機格式
      nationalId: 'C123456781', // 使用不同身分證避免重複（檢查碼正確）
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 個人資料被儲存
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  test('不符合台灣手機格式', async ({ request }) => {
    // Given 電話為 "0212345678"（02 開頭為市話，非手機格式）
    const requestData = {
      ...validPatientData,
      phone: '0212345678', // 市話格式，不是手機
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('身分證字號必須符合台灣身分證格式', () => {
  /**
   * Rule: 身分證字號必須符合台灣身分證格式
   * 格式: 1 英文字母 + 9 數字
   * 驗證: 縣市代碼 + 性別碼(1/2) + 檢查碼
   */

  test('正確的身分證格式（格式+檢查碼+縣市+性別）', async ({ request }) => {
    // Given 身分證字號為 "A123456789"
    // A = 台北市, 1 = 男性, 檢查碼正確
    const requestData = {
      ...validPatientData,
      nationalId: 'A123456789',
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 個人資料被儲存
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
  })

  test('格式錯誤（非1個英文+9個數字）', async ({ request }) => {
    // Given 身分證字號為 "AB12345678"（2 個英文字母）
    const requestData = {
      ...validPatientData,
      nationalId: 'AB12345678', // 格式錯誤
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('首字母非有效縣市代碼', async ({ request }) => {
    // Given 身分證字號為 "X123456789"（X 非有效縣市代碼）
    const requestData = {
      ...validPatientData,
      nationalId: 'X123456789', // X 不是有效縣市代碼
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('性別碼錯誤（第2碼非1或2）', async ({ request }) => {
    // Given 身分證字號為 "A323456789"（第 2 碼為 3，非有效性別碼）
    const requestData = {
      ...validPatientData,
      nationalId: 'A323456789', // 性別碼 3 無效（1=男, 2=女）
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('檢查碼錯誤', async ({ request }) => {
    // Given 身分證字號為 "A123456788"（檢查碼錯誤，正確應為 9）
    const requestData = {
      ...validPatientData,
      nationalId: 'A123456788', // 檢查碼錯誤
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('出生年月日不可為未來日期', () => {
  /**
   * Rule: 出生年月日不可為未來日期
   */

  test('未來日期無效', async ({ request }) => {
    // Given 出生年月日為 "2027-01-01"（未來日期）
    const requestData = {
      ...validPatientData,
      birthDate: '2027-01-01', // 未來日期
      nationalId: 'D123456782', // 使用不同身分證避免重複（檢查碼正確）
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('過去日期有效', async ({ request }) => {
    // Given 出生年月日為 "1990-01-01"（過去日期）
    const requestData = {
      ...validPatientData,
      birthDate: '1990-01-01', // 過去日期，有效
      nationalId: 'E123456783', // 使用不同身分證避免重複（檢查碼正確）
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 個人資料被儲存
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
  })
})

test.describe('以 LINE User ID + 身分證字號作為唯一識別', () => {
  /**
   * Rule: 以 LINE User ID + 身分證字號作為唯一識別
   * 用於判斷是新病患還是回診病患
   */

  test('首次預約建立新病患資料', async ({ request }) => {
    // Given LINE User ID 為 "U1234567890abcdef"
    // And 身分證字號為 "A123456789"
    // And 系統中不存在該 LINE User ID 與身分證字號組合

    // 確認資料庫中沒有此病患
    const existingPatient = await prisma.patient.findFirst({
      where: {
        lineUserId: 'Unewpatient12345678',
        nationalId: 'F123456784',
      },
    })
    expect(existingPatient).toBeNull()

    const requestData = {
      lineUserId: 'Unewpatient12345678',
      name: '新病患',
      phone: '0987654321',
      nationalId: 'F123456784',
      birthDate: '1985-06-15',
    }

    // When 病患提交個人資料
    const response = await request.post('/api/patient/profile', {
      data: requestData,
    })

    // Then 建立新病患記錄
    expect(response.ok()).toBeTruthy()
    expect([200, 201]).toContain(response.status()) // 200 或 201 都可接受

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.id).toBeDefined()

    // 驗證資料庫中存在新的 Patient 記錄
    const newPatient = await prisma.patient.findFirst({
      where: {
        nationalId: 'F123456784',
      },
    })
    expect(newPatient).not.toBeNull()
    expect(newPatient?.lineUserId).toBe('Unewpatient12345678')
    expect(newPatient?.name).toBe('新病患')
  })

  test('回診自動帶入歷史資料', async ({ request }) => {
    // Given LINE User ID 為 "U1234567890abcdef"
    // And 身分證字號為 "A123456789"
    // And 系統中存在該 LINE User ID 與身分證字號組合
    // And 歷史姓名為 "王明德"
    // And 歷史電話為 "0912345678"

    // 使用 Factory 建立既有病患記錄
    const existingPatient = await createPatient({
      lineUserId: 'Uexistingpatient123',
      nationalId: 'G123456785',
      name: '王明德',
      phone: '0912345678',
    })

    // When 病患進入個人資料頁面
    const response = await request.get('/api/patient/profile', {
      params: {
        lineUserId: 'Uexistingpatient123',
        nationalId: 'G123456785',
      },
    })

    // Then 姓名欄位預填 "王明德"
    // And 電話欄位預填 "0912345678"
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    expect(body.data.name).toBe('王明德')
    expect(body.data.phone).toBe('0912345678')
    expect(body.data.nationalId).toBe('G123456785')
  })
})
