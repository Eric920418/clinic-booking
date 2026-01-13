// tests/e2e/admin/edit-appointment.spec.ts
/**
 * Feature: 管理員編輯預約
 *
 * 作為 管理員
 * 為了 調整預約資訊
 * 我想要 修改預約的內容
 *
 * API: PUT /api/admin/appointments/{appointmentId}
 */
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { loginAsAdmin, withAuthAndData } from '../helpers/auth'
import {
  createPatient,
  createDoctor,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createInternalMedicineTreatment,
  createAcupunctureTreatment,
  createAdminUser,
} from '../factories'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, unknown> = {}

// Feature-level Background
test.beforeEach(async ({ request }) => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // 準備一個管理員帳號並登入
  const admin = await createAdminUser({
    email: 'admin@example.com',
    password: 'Password123',
  })
  context['adminId'] = admin.id

  // 登入取得 token
  const token = await loginAsAdmin(request, 'admin@example.com', 'Password123')
  context['adminToken'] = token

  // 準備一個病患
  const patient = await createPatient({
    name: '王小明',
    phone: '0912345678',
    nationalId: 'A123456789',
  })
  context['patientId'] = patient.id

  // 準備一個醫師
  const doctor = await createDoctor({
    name: '李醫師',
  })
  context['doctorId'] = doctor.id
})

test.describe('修改預約時必須立即釋放原時段分鐘數', () => {
  /**
   * Rule: 修改預約時必須立即釋放原時段分鐘數
   */

  test('釋放原時段的內科分鐘數', async ({ request }) => {
    // Given 原預約的時段剩餘分鐘數為 20
    const schedule = await createSchedule({
      doctorId: context['doctorId'] as string,
      date: new Date('2024-01-15'),
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 20,
    })
    context['originalTimeSlotId'] = originalTimeSlot.id

    // And 原預約的診療類型為「內科」（所需 5 分鐘）
    const internalMedicine = await createInternalMedicineTreatment()
    context['internalMedicineId'] = internalMedicine.id

    // And 存在一個原始預約
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: internalMedicine.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // And 準備新時段（用於修改目標）
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })
    context['newTimeSlotId'] = newTimeSlot.id

    // When 管理員編輯預約至新時段
    const response = await request.put(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuthAndData(context['adminToken'] as string, {
        timeSlotId: context['newTimeSlotId'],
      })
    )
    context['lastResponse'] = response

    // Then 預約記錄被更新
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 原時段剩餘分鐘數變為 25（20 + 5 = 25）
    const updatedOriginalSlot = await prisma.timeSlot.findUnique({
      where: { id: originalTimeSlot.id },
    })
    expect(updatedOriginalSlot?.remainingMinutes).toBe(25)
  })
})

test.describe('修改預約時必須檢查新時段餘量', () => {
  /**
   * Rule: 修改預約時必須檢查新時段餘量
   */

  test('新時段餘量足夠時可修改', async ({ request }) => {
    // Given 準備原時段和原預約
    const schedule = await createSchedule({
      doctorId: context['doctorId'] as string,
      date: new Date('2024-01-15'),
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 25,
    })

    const internalMedicine = await createInternalMedicineTreatment()

    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: internalMedicine.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // And 新時段剩餘分鐘數為 10
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 10,
    })
    context['newTimeSlotId'] = newTimeSlot.id

    // And 新診療類型為「針灸」（所需 5 分鐘）
    const acupuncture = await createAcupunctureTreatment()
    context['acupunctureId'] = acupuncture.id

    // When 管理員編輯預約
    const response = await request.put(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuthAndData(context['adminToken'] as string, {
        timeSlotId: context['newTimeSlotId'],
        treatmentTypeId: context['acupunctureId'],
      })
    )
    context['lastResponse'] = response

    // Then 預約記錄被更新
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 新時段剩餘分鐘數為 5（10 - 5 = 5）
    const updatedNewSlot = await prisma.timeSlot.findUnique({
      where: { id: newTimeSlot.id },
    })
    expect(updatedNewSlot?.remainingMinutes).toBe(5)
  })

  test('新時段餘量不足時無法修改', async ({ request }) => {
    // Given 準備原時段和原預約
    const schedule = await createSchedule({
      doctorId: context['doctorId'] as string,
      date: new Date('2024-01-15'),
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 25,
    })

    const internalMedicine = await createInternalMedicineTreatment()

    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: internalMedicine.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // And 新時段剩餘分鐘數只有 3（不足以容納針灸的 5 分鐘）
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 3,
    })
    context['newTimeSlotId'] = newTimeSlot.id

    // And 新診療類型為「針灸」（所需 5 分鐘）
    const acupuncture = await createAcupunctureTreatment()
    context['acupunctureId'] = acupuncture.id

    // When 管理員編輯預約
    const response = await request.put(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuthAndData(context['adminToken'] as string, {
        timeSlotId: context['newTimeSlotId'],
        treatmentTypeId: context['acupunctureId'],
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗，HTTP status = 400，錯誤碼為 E003
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('E003')
  })
})

test.describe('修改預約時必須扣除新時段分鐘數', () => {
  /**
   * Rule: 修改預約時必須扣除新時段分鐘數
   * TODO: Feature File 尚未定義 Example
   */

  test.skip('TODO: 待補完 Feature Example', async () => {
    // Feature File 中此 Rule 標記為 #TODO
    // 等待 Feature File 補完後再實作
  })
})

test.describe('修改記錄必須包含操作人與操作時間', () => {
  /**
   * Rule: 修改記錄必須包含操作人與操作時間
   * TODO: Feature File 尚未定義 Example
   */

  test.skip('TODO: 待補完 Feature Example', async () => {
    // Feature File 中此 Rule 標記為 #TODO
    // 等待 Feature File 補完後再實作

    // 預期驗證：
    // - OperationLog 應記錄 adminUserId
    // - OperationLog 應記錄 createdAt
    // - OperationLog.action 應為 "UPDATE_APPOINTMENT"
    // - OperationLog.targetType 應為 "Appointment"
    // - OperationLog.details 應包含變更內容
  })
})
