// tests/e2e/admin/blacklist-management.spec.ts
// Feature: 黑名單管理
// 測試管理後台黑名單操作相關功能

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import {
  createPatient,
  createAdminUser,
  createSuperAdminUser,
  addPatientToBlacklist,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
} from '../factories'
import { loginAsAdmin, withAuth } from '../helpers/auth'
import { prisma } from '../helpers/db'

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('黑名單病患無法使用預約系統', () => {
  /**
   * Rule: 黑名單病患無法使用預約系統
   */

  test('黑名單病患無法建立預約', async ({ request }) => {
    // Given 病患已被列入黑名單
    const patient = await createPatient({
      lineUserId: 'U1234567890abcdef',
      isBlacklisted: true,
    })

    // And 系統中有可預約的時段
    const doctor = await createDoctor({ name: '測試醫師' })
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2024-01-20'),
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 30,
    })

    // When 病患嘗試建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: patient.lineUserId,
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作被拒絕（403 Forbidden）
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})

test.describe('超級管理員可手動加入黑名單', () => {
  /**
   * Rule: 超級管理員可手動加入黑名單
   * 狀態: #TODO - 待補充 Example（Feature File 中尚未定義）
   */

  test.skip('TODO: 待補充測試案例', async () => {
    // 此 Rule 尚未定義 Example
  })
})

test.describe('超級管理員可手動移除黑名單', () => {
  /**
   * Rule: 超級管理員可手動移除黑名單
   */

  test('超級管理員移除黑名單', async ({ request }) => {
    // Given 病患已被列入黑名單
    const patient = await createPatient({
      isBlacklisted: true,
    })
    await addPatientToBlacklist(patient.id, '累計未報到 3 次')

    // And 超級管理員已登入
    const superAdmin = await createSuperAdminUser({
      email: 'superadmin@test.com',
      password: 'Password123',
    })
    const token = await loginAsAdmin(request, superAdmin.email, superAdmin.plainPassword)
    expect(token).not.toBeNull()

    // When 超級管理員移除病患的黑名單
    const response = await request.delete(
      `/api/admin/blacklist/${patient.id}`,
      withAuth(token!)
    )

    // Then 操作成功
    expect(response.ok()).toBeTruthy()

    // And 病患黑名單狀態被解除
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    })
    expect(updatedPatient?.isBlacklisted).toBe(false)

    // And 黑名單記錄被刪除
    const blacklistRecord = await prisma.blacklist.findUnique({
      where: { patientId: patient.id },
    })
    expect(blacklistRecord).toBeNull()
  })
})

test.describe('一般管理員無法移除黑名單', () => {
  /**
   * Rule: 一般管理員無法移除黑名單
   */

  test('一般管理員無法移除黑名單', async ({ request }) => {
    // Given 病患已被列入黑名單
    const patient = await createPatient({
      isBlacklisted: true,
    })
    await addPatientToBlacklist(patient.id, '累計未報到 3 次')

    // And 一般管理員已登入
    const admin = await createAdminUser({
      email: 'admin@test.com',
      password: 'Password123',
      role: 'admin',
    })
    const token = await loginAsAdmin(request, admin.email, admin.plainPassword)
    expect(token).not.toBeNull()

    // When 一般管理員嘗試移除病患的黑名單
    const response = await request.delete(
      `/api/admin/blacklist/${patient.id}`,
      withAuth(token!)
    )

    // Then 操作被拒絕（403 Forbidden）
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)
    const body = await response.json()
    expect(body.error).toBeDefined()

    // And 病患仍在黑名單中
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: patient.id },
    })
    expect(updatedPatient?.isBlacklisted).toBe(true)

    const blacklistRecord = await prisma.blacklist.findUnique({
      where: { patientId: patient.id },
    })
    expect(blacklistRecord).not.toBeNull()
  })
})

test.describe('黑名單操作必須記錄操作人、時間與原因', () => {
  /**
   * Rule: 黑名單操作必須記錄操作人、時間與原因
   * 狀態: #TODO - 待補充 Example（Feature File 中尚未定義）
   */

  test.skip('TODO: 待補充測試案例', async () => {
    // 此 Rule 尚未定義 Example
  })
})
