// tests/e2e/admin/cancel-appointment.spec.ts
/**
 * Feature: 管理員取消預約
 *
 * 作為 管理員
 * 為了 處理取消預約需求
 * 我想要 取消病患的預約
 *
 * API: DELETE /api/admin/appointments/{appointmentId}
 */
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { loginAsAdmin, withAuth } from '../helpers/auth'
import {
  createPatient,
  createDoctor,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createAdminUser,
  createAcupunctureTreatment,
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
})

test.describe('取消預約時必須更新預約狀態為「已取消」', () => {
  /**
   * Rule: 取消預約時必須更新預約狀態為「已取消」
   */

  test('取消預約後狀態變更', async ({ request }) => {
    // Given 準備一個病患
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      lineUserId: 'U1234567890',
    })
    context['patientId'] = patient.id

    // And 準備一個醫師
    const doctor = await createDoctor({
      name: '李醫師',
    })
    context['doctorId'] = doctor.id

    // And 準備一個診療類型
    const treatmentType = await createAcupunctureTreatment()
    context['treatmentTypeId'] = treatmentType.id

    // And 準備一個時段
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2024-01-15'),
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 25,
    })
    context['timeSlotId'] = timeSlot.id

    // And 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // When 管理員取消預約
    // API: DELETE /api/admin/appointments/{appointmentId}
    const response = await request.delete(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 預約狀態為 "cancelled"
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // 從資料庫查詢預約，驗證 status = 'cancelled'
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment).not.toBeNull()
    expect(updatedAppointment?.status).toBe('cancelled')
  })
})

test.describe('取消預約時必須釋放時段分鐘數', () => {
  /**
   * Rule: 取消預約時必須釋放時段分鐘數
   */

  test('取消針灸預約釋放 5 分鐘', async ({ request }) => {
    // Given 準備一個病患
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
    })
    context['patientId'] = patient.id

    // And 準備一個醫師
    const doctor = await createDoctor({
      name: '李醫師',
    })
    context['doctorId'] = doctor.id

    // And 準備一個班表
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2024-01-15'),
    })

    // And 時段剩餘分鐘數為 10
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 10, // 時段剩餘 10 分鐘
    })
    context['timeSlotId'] = timeSlot.id

    // And 針灸所需分鐘數為 5
    const acupuncture = await createAcupunctureTreatment() // durationMinutes = 5
    context['treatmentTypeId'] = acupuncture.id

    // And 存在一個使用針灸的預約
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: acupuncture.id,
      timeSlotId: timeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // When 管理員取消預約
    const response = await request.delete(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 預約被成功取消
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 時段剩餘分鐘數為 15（10 + 5 = 15）
    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot?.remainingMinutes).toBe(15)
  })
})

test.describe('取消成功後必須發送 LINE 通知', () => {
  /**
   * Rule: 取消成功後必須發送 LINE 通知
   *
   * 注意：此測試需要 Mock LINE Messaging API
   * 目前先驗證 API 回應中包含 lineNotificationSent 標記
   * 或檢查 OperationLog 中的通知紀錄
   */

  test('病患有 LINE User ID 時發送取消通知', async ({ request }) => {
    // Given 準備一個病患，設定 LINE User ID
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      lineUserId: 'U1234567890abcdef', // 病患有綁定 LINE
    })
    context['patientId'] = patient.id

    // And 準備一個醫師
    const doctor = await createDoctor({
      name: '李醫師',
    })
    context['doctorId'] = doctor.id

    // And 準備一個班表和時段
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2024-01-15'),
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 25,
    })

    // And 準備一個診療類型
    const treatmentType = await createAcupunctureTreatment()

    // And 存在一個預約
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })
    context['appointmentId'] = appointment.id

    // When 管理員取消預約
    const response = await request.delete(
      `/api/admin/appointments/${context['appointmentId']}`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 操作成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And LINE 訊息發送至 "U1234567890abcdef"
    // 驗證方式：檢查 API 回應中的 lineNotificationSent 欄位
    // 或檢查 OperationLog 中是否有 LINE 通知紀錄
    expect(body.data.lineNotificationSent).toBe(true)

    // 額外驗證：檢查 OperationLog
    const operationLog = await prisma.operationLog.findFirst({
      where: {
        action: 'CANCEL_APPOINTMENT',
        targetId: appointment.id,
      },
    })
    expect(operationLog).not.toBeNull()
    // 檢查 details 中是否包含 LINE 通知資訊
    const details = operationLog?.details as Record<string, unknown> | null
    expect(details?.lineUserId).toBe('U1234567890abcdef')
  })
})

// Rule: 可記錄取消原因
// #TODO - 待 Feature File 補完後實作
test.describe('可記錄取消原因', () => {
  /**
   * Rule: 可記錄取消原因
   * TODO: Feature File 尚未定義 Example
   */

  test.skip('TODO: 待補完 Feature Example', async () => {
    // Feature File 中此 Rule 標記為 #TODO
    // 等待 Feature File 補完後再實作
    //
    // 預期驗證：
    // - Appointment.cancelledReason 應被設定
    // - Appointment.cancelledBy 應記錄操作者 ID
  })
})
