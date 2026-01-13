// tests/e2e/liff/verification.spec.ts
// Feature: 真人驗證

import { test, expect } from '@playwright/test'
import { cleanupDatabase, prisma, waitFor } from '../helpers'
import { createVerificationCode } from '../factories'

// ============================================================================
// 輔助函式
// ============================================================================

/** 生成唯一的 LINE User ID */
function uniqueLineUserId(): string {
  return `U${Date.now()}${Math.random().toString(36).slice(2, 8)}`
}

/** 計算從現在起 N 分鐘後的時間 */
function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

/** 計算從現在起 N 秒前的時間 */
function secondsAgo(seconds: number): Date {
  return new Date(Date.now() - seconds * 1000)
}

/** 計算從現在起 N 分鐘前的時間 */
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000)
}

// ============================================================================
// 測試
// ============================================================================

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('系統必須產生 6 位數驗證碼', () => {
  test('產生驗證碼並發送至 LINE', async ({ request }) => {
    // Given LINE User ID
    const lineUserId = uniqueLineUserId()

    // When 病患請求發送驗證碼
    const response = await request.post('/api/liff/verify/send', {
      data: { lineUserId },
    })

    // Then 系統產生 6 位數驗證碼
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 資料庫中有驗證碼記錄
    const verificationCode = await waitFor(async () => {
      return prisma.verificationCode.findFirst({
        where: { lineUserId },
        orderBy: { createdAt: 'desc' },
      })
    })
    expect(verificationCode).not.toBeNull()
    expect(verificationCode?.code).toMatch(/^\d{6}$/)
  })
})

test.describe('驗證碼有效期為 5 分鐘', () => {
  test('驗證碼在有效期內可使用', async ({ request }) => {
    // Given 驗證碼為 "123456"，尚未過期
    const lineUserId = uniqueLineUserId()
    const code = '123456'

    await createVerificationCode({
      lineUserId,
      code,
      expiresAt: minutesFromNow(5),
      attempts: 0,
    })

    // When 病患輸入驗證碼
    const response = await request.post('/api/liff/verify/check', {
      data: { lineUserId, code },
    })

    // Then 驗證成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  test('驗證碼超過 5 分鐘後失效', async ({ request }) => {
    // Given 驗證碼已過期
    const lineUserId = uniqueLineUserId()
    const code = '123456'

    await createVerificationCode({
      lineUserId,
      code,
      createdAt: minutesAgo(10),
      expiresAt: minutesAgo(5),
      attempts: 0,
    })

    // When 病患輸入驗證碼
    const response = await request.post('/api/liff/verify/check', {
      data: { lineUserId, code },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('驗證錯誤上限為 5 次', () => {
  test('驗證錯誤未達 5 次可繼續嘗試', async ({ request }) => {
    // Given 驗證碼已嘗試 4 次錯誤
    const lineUserId = uniqueLineUserId()
    const correctCode = '123456'
    const wrongCode = '000000'

    await createVerificationCode({
      lineUserId,
      code: correctCode,
      attempts: 4,
      expiresAt: minutesFromNow(5),
    })

    // When 病患輸入錯誤驗證碼
    const response = await request.post('/api/liff/verify/check', {
      data: { lineUserId, code: wrongCode },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    const body = await response.json()
    expect(body.success).toBe(false)

    // And 錯誤嘗試次數累計為 5
    const updatedCode = await prisma.verificationCode.findFirst({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
    })
    expect(updatedCode?.attempts).toBe(5)
  })

  test('驗證錯誤達 5 次後需重新發送', async ({ request }) => {
    // Given 驗證碼已達錯誤上限（5 次）
    const lineUserId = uniqueLineUserId()
    const code = '123456'

    await createVerificationCode({
      lineUserId,
      code,
      attempts: 5,
      expiresAt: minutesFromNow(5),
    })

    // When 病患輸入正確驗證碼
    const response = await request.post('/api/liff/verify/check', {
      data: { lineUserId, code },
    })

    // Then 操作失敗（因已達錯誤上限）
    expect(response.ok()).toBeFalsy()
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('驗證錯誤達 5 次後驗證碼記錄標記為失效', () => {
  test('達到 5 次錯誤後記錄保留但失效', async ({ request }) => {
    // Given 驗證碼已嘗試 4 次錯誤
    const lineUserId = uniqueLineUserId()
    const correctCode = '123456'
    const wrongCode = '000000'

    const verificationCode = await createVerificationCode({
      lineUserId,
      code: correctCode,
      attempts: 4,
      expiresAt: minutesFromNow(5),
    })
    const codeId = verificationCode.id

    // When 病患再次輸入錯誤驗證碼
    await request.post('/api/liff/verify/check', {
      data: { lineUserId, code: wrongCode },
    })

    // Then 錯誤嘗試次數為 5
    const updatedCode = await prisma.verificationCode.findUnique({
      where: { id: codeId },
    })
    expect(updatedCode?.attempts).toBe(5)

    // And 驗證碼記錄保留
    expect(updatedCode).not.toBeNull()

    // And 後續嘗試均失敗（即使輸入正確驗證碼）
    const retryResponse = await request.post('/api/liff/verify/check', {
      data: { lineUserId, code: correctCode },
    })
    expect(retryResponse.ok()).toBeFalsy()
  })
})

test.describe('重新發送驗證碼限制為 60 秒內 1 次', () => {
  test('距離上次發送未滿 60 秒無法重新發送', async ({ request }) => {
    // Given 30 秒前已發送過驗證碼
    const lineUserId = uniqueLineUserId()

    await createVerificationCode({
      lineUserId,
      createdAt: secondsAgo(30),
      expiresAt: minutesFromNow(5),
    })

    // When 病患請求發送驗證碼
    const response = await request.post('/api/liff/verify/send', {
      data: { lineUserId },
    })

    // Then 操作失敗（HTTP 429 Too Many Requests）
    expect(response.status()).toBe(429)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('距離上次發送已滿 60 秒可重新發送', async ({ request }) => {
    // Given 61 秒前已發送過驗證碼（已過期）
    const lineUserId = uniqueLineUserId()

    await createVerificationCode({
      lineUserId,
      createdAt: secondsAgo(61),
      expiresAt: minutesAgo(4), // 已過期
    })

    // When 病患請求發送驗證碼
    const response = await request.post('/api/liff/verify/send', {
      data: { lineUserId },
    })

    // Then 系統產生新的驗證碼
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 資料庫中有新的驗證碼記錄
    const codes = await prisma.verificationCode.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
    })
    expect(codes.length).toBeGreaterThanOrEqual(2)
    expect(codes[0].code).toMatch(/^\d{6}$/)
  })
})
