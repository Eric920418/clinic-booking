// tests/e2e/liff/line-entry-verification.spec.ts
// Feature: LINE 入口驗證
// 作為 病患
// 為了 進入預約系統
// 我想要 透過 LINE LIFF 進行身分驗證

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { createPatient, addPatientToBlacklist } from '../factories'
import { prisma } from '../helpers/db'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, any> = {}

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}
})

// Rule: LIFF 初始化後必須取得 LINE User ID
// #TODO - 此 Rule 涉及前端 LIFF SDK 整合，待後續實作

test.describe('必須檢查用戶是否在黑名單中', () => {
  /**
   * Rule: 必須檢查用戶是否在黑名單中
   *
   * API: POST /api/line/entry
   * Request: { line_user_id: string }
   * Response 200: { success: true, next_step: "verification" | "booking" }
   * Response 403: { error, message, reason, appeal_info }
   */

  test('黑名單用戶無法進入系統並顯示停權原因與申訴管道', async ({ request }) => {
    // Given LINE User ID 為 "U1234567890abcdef"
    // [事件風暴部位: Aggregate - Patient]
    // [使用 Aggregate-Given-Handler.md]
    const lineUserId = 'U1234567890abcdef'
    const patient = await createPatient({
      lineUserId,
      name: '黑名單測試用戶',
      phone: '0912345678',
      nationalId: 'A123456789',
    })
    context['patientId'] = patient.id
    context['lineUserId'] = lineUserId

    // And 該 LINE User ID 對應的病患在黑名單中
    // And 停權原因為 "累計未報到 3 次"
    // [事件風暴部位: Aggregate - Patient + Blacklist]
    // [使用 Aggregate-Given-Handler.md]
    const blacklistReason = '累計未報到 3 次'
    await addPatientToBlacklist(patient.id, blacklistReason)
    context['blacklistReason'] = blacklistReason

    // When 用戶透過 LINE LIFF 進入系統
    // [事件風暴部位: Command - LIFF Entry]
    // [使用 Command-Handler.md]
    const response = await request.post('/api/line/entry', {
      data: {
        line_user_id: lineUserId,
      },
    })
    context['lastResponse'] = response

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    // And 顯示訊息 "您已被停權，無法使用預約服務"
    // [事件風暴部位: Read Model - UI 顯示]
    // [使用 ReadModel-Then-Handler.md]
    const body = await response.json()
    expect(body.message).toBe('您已被停權，無法使用預約服務')

    // And 顯示停權原因 "累計未報到 3 次"
    // [使用 ReadModel-Then-Handler.md]
    expect(body.reason).toBe(blacklistReason)

    // And 顯示申訴管道資訊
    // [使用 ReadModel-Then-Handler.md]
    expect(body.appeal_info).toBeDefined()
    expect(body.appeal_info).not.toBe('')
  })

  test('非黑名單用戶可進入驗證流程', async ({ request }) => {
    // Given LINE User ID 為 "U1234567890abcdef"
    // [事件風暴部位: Aggregate - Patient]
    // [使用 Aggregate-Given-Handler.md]
    const lineUserId = 'Uabcdef1234567890'
    const patient = await createPatient({
      lineUserId,
      name: '正常測試用戶',
      phone: '0987654321',
      nationalId: 'B223456789',
      isBlacklisted: false, // 明確設定非黑名單
    })
    context['patientId'] = patient.id
    context['lineUserId'] = lineUserId

    // And 該 LINE User ID 對應的病患不在黑名單中
    // [事件風暴部位: Aggregate - Patient]
    // [使用 Aggregate-Given-Handler.md]
    // （createPatient 預設 isBlacklisted: false，無需額外設定）

    // When 用戶透過 LINE LIFF 進入系統
    // [事件風暴部位: Command - LIFF Entry]
    // [使用 Command-Handler.md]
    const response = await request.post('/api/line/entry', {
      data: {
        line_user_id: lineUserId,
      },
    })
    context['lastResponse'] = response

    // Then 進入真人驗證流程
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.next_step).toBe('verification')
  })

  test('新用戶（無病患記錄）可進入驗證流程', async ({ request }) => {
    // Given LINE User ID 為新用戶（系統中無對應病患記錄）
    // [事件風暴部位: 無需建立 Aggregate - 測試新用戶場景]
    const newLineUserId = 'Unewuser123456789'
    context['lineUserId'] = newLineUserId

    // When 用戶透過 LINE LIFF 進入系統
    // [事件風暴部位: Command - LIFF Entry]
    // [使用 Command-Handler.md]
    const response = await request.post('/api/line/entry', {
      data: {
        line_user_id: newLineUserId,
      },
    })
    context['lastResponse'] = response

    // Then 進入真人驗證流程（新用戶也應該可以進入）
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.next_step).toBe('verification')
  })
})
