// tests/e2e/admin/manage-accounts.spec.ts
// Feature: 管理帳號

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { createAdminUser, createSuperAdminUser } from '../factories'
import { loginAsAdmin, withAuth, withAuthAndData } from '../helpers/auth'

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('僅超級管理員可管理帳號', () => {
  test('一般管理員無法新增帳號', async ({ request }) => {
    // Given 管理員角色為 "admin"
    const admin = await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
      role: 'admin',
    })

    const token = await loginAsAdmin(request, admin.email, admin.plainPassword)
    expect(token).not.toBeNull()

    // When 管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token!, {
        email: 'newadmin@example.com',
        password: 'Password123',
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('超級管理員可新增帳號', async ({ request }) => {
    // Given 管理員角色為 "super_admin"
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@example.com',
      password: 'Password123',
    })

    const token = await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword)
    expect(token).not.toBeNull()

    // When 管理員新增帳號
    const newAdminEmail = 'newadmin@example.com'
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token!, {
        email: newAdminEmail,
        password: 'Password123',
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 帳號記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.success).toBe(true)

    const newAdmin = await prisma.adminUser.findUnique({
      where: { email: newAdminEmail },
    })
    expect(newAdmin).not.toBeNull()
    expect(newAdmin?.name).toBe('新管理員')
    expect(newAdmin?.role).toBe('admin')
    expect(newAdmin?.isActive).toBe(true)
  })
})

test.describe('帳號必須使用 Email 格式', () => {
  test.skip('TODO: Email 格式驗證', async () => {
    // TODO: Feature File 尚未定義此 Rule 的 Example
  })
})

test.describe('Email 必須唯一', () => {
  test('重複的 Email 無法新增', async ({ request }) => {
    // Given 系統中已存在帳號 "admin@example.com"
    await createAdminUser({
      email: 'admin@example.com',
      password: 'Password123',
    })

    // And 超級管理員登入
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@example.com',
      password: 'Password123',
    })
    const token = await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword)
    expect(token).not.toBeNull()

    // When 超級管理員新增帳號 (新帳號 Email 為 "admin@example.com")
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token!, {
        email: 'admin@example.com',
        password: 'Password123',
        name: '另一個管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(409)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('密碼最小長度為 8 字元', () => {
  let token: string

  test.beforeEach(async ({ request }) => {
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@example.com',
      password: 'Password123',
    })
    token = (await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword))!
  })

  test('密碼少於 8 字元無效', async ({ request }) => {
    // Given 密碼為 "Pass123" (7 字元)
    const password = 'Pass123'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: 'newadmin@example.com',
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('密碼 8 字元有效', async ({ request }) => {
    // Given 密碼為 "Pass1234" (8 字元)
    const password = 'Pass1234'
    const newAdminEmail = 'newadmin@example.com'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: newAdminEmail,
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 帳號記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.success).toBe(true)

    const newAdmin = await prisma.adminUser.findUnique({
      where: { email: newAdminEmail },
    })
    expect(newAdmin).not.toBeNull()
  })
})

test.describe('密碼必須包含大寫、小寫、數字', () => {
  let token: string

  test.beforeEach(async ({ request }) => {
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@example.com',
      password: 'Password123',
    })
    token = (await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword))!
  })

  test('密碼缺少大寫無效', async ({ request }) => {
    // Given 密碼為 "password123" (無大寫)
    const password = 'password123'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: 'newadmin@example.com',
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('密碼缺少小寫無效', async ({ request }) => {
    // Given 密碼為 "PASSWORD123" (無小寫)
    const password = 'PASSWORD123'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: 'newadmin@example.com',
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('密碼缺少數字無效', async ({ request }) => {
    // Given 密碼為 "Password" (無數字)
    const password = 'Password'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: 'newadmin@example.com',
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('密碼包含大寫、小寫、數字有效', async ({ request }) => {
    // Given 密碼為 "Password123" (符合所有規則)
    const password = 'Password123'
    const newAdminEmail = 'newadmin@example.com'

    // When 超級管理員新增帳號
    const response = await request.post('/api/admin/accounts', {
      ...withAuthAndData(token, {
        email: newAdminEmail,
        password: password,
        name: '新管理員',
        role: 'admin',
      }),
    })

    // Then 帳號記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)
    const body = await response.json()
    expect(body.success).toBe(true)

    const newAdmin = await prisma.adminUser.findUnique({
      where: { email: newAdminEmail },
    })
    expect(newAdmin).not.toBeNull()
  })
})

test.describe('可停用帳號', () => {
  test('停用帳號後狀態更新', async ({ request }) => {
    // Given 帳號狀態為啟用
    const targetAdmin = await createAdminUser({
      email: 'targetadmin@example.com',
      password: 'Password123',
      isActive: true,
    })

    // And 超級管理員登入
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@example.com',
      password: 'Password123',
    })
    const token = await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword)
    expect(token).not.toBeNull()

    // When 超級管理員停用帳號
    const response = await request.post(`/api/admin/accounts/${targetAdmin.id}/disable`, {
      ...withAuth(token!),
    })

    // Then 帳號狀態為停用
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    const updatedAdmin = await prisma.adminUser.findUnique({
      where: { id: targetAdmin.id },
    })
    expect(updatedAdmin).not.toBeNull()
    expect(updatedAdmin?.isActive).toBe(false)
  })
})

test.describe('可重設密碼', () => {
  test.skip('TODO: 重設密碼功能', async () => {
    // TODO: Feature File 尚未定義此 Rule 的 Example
  })
})
