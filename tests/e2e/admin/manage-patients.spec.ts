// tests/e2e/admin/manage-patients.spec.ts
// Feature: 管理病患資料
// 作為 管理員
// 為了 管理病患的基本資料與內部註記
// 我想要 查看與編輯病患資料

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { createPatient, createAdminUser } from '../factories'
import { loginAsAdmin, withAuthAndData } from '../helpers/auth'
import { prisma } from '../helpers/db'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, any> = {}

// Feature-level Background
test.beforeEach(async ({ request }) => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // Given 管理員已登入
  const admin = await createAdminUser({
    email: 'admin@example.com',
    password: 'Password123',
  })
  context['adminId'] = admin.id

  const token = await loginAsAdmin(request, admin.email, admin.plainPassword)
  context['adminToken'] = token
})

test.describe('可依姓名/電話/身分證搜尋病患', () => {
  /**
   * Rule: 可依姓名/電話/身分證搜尋病患
   * API: GET /api/admin/patients?keyword={keyword}
   */

  // #TODO: 待補充 Examples
})

test.describe('可依黑名單狀態篩選病患', () => {
  /**
   * Rule: 可依黑名單狀態篩選病患
   * API: GET /api/admin/patients?isBlacklisted={boolean}
   */

  // #TODO: 待補充 Examples
})

test.describe('可依 LINE 綁定狀態篩選病患', () => {
  /**
   * Rule: 可依 LINE 綁定狀態篩選病患
   * API: GET /api/admin/patients?hasLine={boolean}
   */

  // #TODO: 待補充 Examples
})

test.describe('可編輯病患備註', () => {
  /**
   * Rule: 可編輯病患備註
   * API: PATCH /api/admin/patients/{patientId}
   * Request Body: { notes: string }
   */

  test('新增病患備註', async ({ request }) => {
    // Given 病患備註為 null
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      notes: null,
    })
    context['patientId'] = patient.id

    // And 管理員輸入備註為 "對止痛藥過敏"
    const inputNotes = '對止痛藥過敏'

    // When 管理員編輯病患備註
    const response = await request.patch(
      `/api/admin/patients/${context['patientId']}`,
      withAuthAndData(context['adminToken'], {
        notes: inputNotes,
      })
    )

    // Then 操作成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 病患備註已更新
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: context['patientId'] },
    })
    expect(updatedPatient).not.toBeNull()
    expect(updatedPatient?.notes).toBe(inputNotes)
  })

  test('修改病患備註', async ({ request }) => {
    // Given 病患備註為 "對止痛藥過敏"
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345679',
      nationalId: 'A123456788',
      notes: '對止痛藥過敏',
    })
    context['patientId'] = patient.id

    // And 管理員輸入備註為 "對止痛藥過敏、行動不便需協助"
    const inputNotes = '對止痛藥過敏、行動不便需協助'

    // When 管理員編輯病患備註
    const response = await request.patch(
      `/api/admin/patients/${context['patientId']}`,
      withAuthAndData(context['adminToken'], {
        notes: inputNotes,
      })
    )

    // Then 操作成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 病患備註已更新
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: context['patientId'] },
    })
    expect(updatedPatient).not.toBeNull()
    expect(updatedPatient?.notes).toBe(inputNotes)
  })
})

test.describe('病患備註為內部註記，病患不可見', () => {
  /**
   * Rule: 病患備註為內部註記，病患不可見
   * 驗證: 病患端 API 不回傳 notes 欄位
   */

  // #TODO: 待補充 Examples
})

test.describe('可查看病患的所有預約紀錄', () => {
  /**
   * Rule: 可查看病患的所有預約紀錄
   * API: GET /api/admin/patients/{patientId}/appointments
   */

  // #TODO: 待補充 Examples
})
