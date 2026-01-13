// tests/e2e/admin/login.spec.ts
// Feature: 管理員登入
// 生成來源: spec/features/管理員登入.feature

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { createAdminUser } from '../factories'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, unknown> = {}

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}
})

test.describe('帳號與密碼必須正確', () => {
  /**
   * Rule: 帳號與密碼必須正確
   */

  test('正確的帳號密碼可登入', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 密碼為 "Password123"
    // And 系統中存在帳號 "admin@example.com"
    // And 該帳號的密碼雜湊值匹配 "Password123"
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
    })
    context['adminId'] = admin.id
    context['email'] = admin.email
    context['password'] = admin.plainPassword

    // When 管理員登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: context['email'],
        password: context['password'],
      },
    })
    context['lastResponse'] = response

    // Then 登入成功
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And Session 建立
    // [驗證 data 存在，token 透過 Cookie 設定]
    expect(body.data).toBeDefined()
    expect(body.data.email).toBe('admin@example.com')
  })

  test('錯誤的密碼無法登入', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 密碼為 "WrongPassword"
    // And 系統中存在帳號 "admin@example.com"
    // And 該帳號的密碼雜湊值不匹配 "WrongPassword"
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123', // 正確密碼
    })
    context['adminId'] = admin.id

    // When 管理員登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'WrongPassword', // 錯誤密碼
      },
    })

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('帳號必須為啟用狀態', () => {
  /**
   * Rule: 帳號必須為啟用狀態
   */

  test('停用帳號無法登入', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 密碼為 "Password123"
    // And 系統中存在帳號 "admin@example.com"
    // And 該帳號狀態為停用
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      isActive: false, // 帳號停用
    })
    context['adminId'] = admin.id

    // When 管理員登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Password123',
      },
    })

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('登入失敗累計 5 次後鎖定 15 分鐘', () => {
  /**
   * Rule: 登入失敗累計 5 次後鎖定 15 分鐘
   */

  test('登入失敗 4 次後仍可嘗試', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 該帳號登入失敗次數為 4
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      failedLoginCount: 4,
    })
    context['adminId'] = admin.id

    // When 管理員使用錯誤密碼登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'WrongPassword',
      },
    })

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()

    // And 登入失敗次數為 5
    // [使用 Aggregate-Then-Handler.md]
    const updatedAdmin = await prisma.adminUser.findUnique({
      where: { id: admin.id },
    })
    expect(updatedAdmin?.failedLoginCount).toBe(5)
  })

  test('登入失敗 5 次後帳號被鎖定', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 該帳號登入失敗次數為 4（再失敗一次就會鎖定）
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      failedLoginCount: 4,
    })
    context['adminId'] = admin.id

    // When 管理員使用錯誤密碼登入（第 5 次失敗）
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'WrongPassword',
      },
    })

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()

    // And 帳號鎖定至 15 分鐘後
    // [使用 Aggregate-Then-Handler.md]
    const updatedAdmin = await prisma.adminUser.findUnique({
      where: { id: admin.id },
    })
    expect(updatedAdmin?.lockedUntil).not.toBeNull()

    // 鎖定時間應該在 15 分鐘後（允許 1 分鐘誤差）
    const now = new Date()
    const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000)
    const lockedUntil = updatedAdmin?.lockedUntil as Date
    expect(lockedUntil.getTime()).toBeGreaterThanOrEqual(
      fifteenMinutesLater.getTime() - 60 * 1000
    )
  })

  test('鎖定期間內無法登入', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 帳號鎖定至 5 分鐘後
    // [使用 Aggregate-Given-Handler.md]
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000) // 5 分鐘後解鎖
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      failedLoginCount: 5,
      lockedUntil,
    })
    context['adminId'] = admin.id

    // When 管理員使用正確密碼登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Password123',
      },
    })

    // Then 操作失敗
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('E006')
  })

  test('鎖定期滿後可登入', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 帳號鎖定至過去時間（已解鎖）
    // [使用 Aggregate-Given-Handler.md]
    const lockedUntil = new Date(Date.now() - 1000) // 1 秒前（已過期）
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      failedLoginCount: 5,
      lockedUntil,
    })
    context['adminId'] = admin.id

    // When 管理員使用正確密碼登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Password123',
      },
    })

    // Then 登入成功
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
  })
})

test.describe('登入成功時失敗次數重置為 0', () => {
  /**
   * Rule: 登入成功時失敗次數重置為 0
   */

  test('登入成功後失敗次數清零', async ({ request }) => {
    // Given 管理員帳號為 "admin@example.com"
    // And 該帳號登入失敗次數為 4
    // And 密碼為 "Password123"
    // [使用 Aggregate-Given-Handler.md]
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      failedLoginCount: 4,
    })
    context['adminId'] = admin.id

    // When 管理員使用正確密碼登入
    // [使用 Command-Handler.md]
    const response = await request.post('/api/admin/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'Password123',
      },
    })

    // Then 登入成功
    // [使用 Success-Failure-Handler.md]
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 登入失敗次數為 0
    // [使用 Aggregate-Then-Handler.md]
    const updatedAdmin = await prisma.adminUser.findUnique({
      where: { id: admin.id },
    })
    expect(updatedAdmin?.failedLoginCount).toBe(0)
  })
})

test.describe('Session 有效期為 24 小時', () => {
  /**
   * Rule: Session 有效期為 24 小時
   * 狀態: #TODO - Feature File 尚未定義完整 Example
   */

  test.skip('Session 過期後需重新登入', async () => {
    // TODO: Feature File 尚未定義此 Rule 的 Example
    // 待 Feature File 補充後實作
    // 此測試需要模擬時間流逝，可能需要額外的測試設施
  })
})
