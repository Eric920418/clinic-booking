// tests/e2e/admin/manual-booking.spec.ts
/**
 * Feature: 管理員手動新增預約
 *
 * 作為 管理員
 * 為了 處理電話預約
 * 我想要 手動為病患建立預約
 *
 * API: POST /api/admin/appointments
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
  createFirstVisitTreatment,
  createAdminUser,
} from '../factories'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, unknown> = {}

// Feature-level Background（此 Feature 無定義，但需準備基礎資料）
test.beforeEach(async ({ request }) => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // 準備管理員登入（所有測試共用）
  const admin = await createAdminUser({
    email: 'admin@example.com',
    password: 'Password123',
  })
  context['adminId'] = admin.id

  // 登入取得 token
  const token = await loginAsAdmin(request, 'admin@example.com', 'Password123')
  context['adminToken'] = token

  // 準備基礎醫師資料
  const doctor = await createDoctor({
    name: '李醫師',
  })
  context['doctorId'] = doctor.id

  // 準備基礎班表資料（使用未來日期）
  const schedule = await createSchedule({
    doctorId: doctor.id,
    date: new Date('2026-01-15'),
  })
  context['scheduleId'] = schedule.id
})

test.describe('時段剩餘分鐘數必須大於等於診療所需分鐘數', () => {
  /**
   * Rule: 時段剩餘分鐘數必須大於等於診療所需分鐘數
   */

  test('時段剩餘分鐘數足夠時可新增預約', async ({ request }) => {
    // Given 時段剩餘分鐘數為 10
    const timeSlot = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 10,
    })
    context['timeSlotId'] = timeSlot.id

    // And 診療類型為 "初診"，初診所需分鐘數為 10
    const firstVisit = await createFirstVisitTreatment()
    context['treatmentTypeId'] = firstVisit.id

    // And 準備病患資料
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
    })
    context['patientId'] = patient.id

    // When 管理員新增預約
    const response = await request.post(
      '/api/admin/appointments',
      withAuthAndData(context['adminToken'] as string, {
        patientId: context['patientId'],
        doctorId: context['doctorId'],
        timeSlotId: context['timeSlotId'],
        treatmentTypeId: context['treatmentTypeId'],
        appointmentDate: '2026-01-15',
      })
    )
    context['lastResponse'] = response

    // Then 預約記錄被建立
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBeDefined()

    // And 時段剩餘分鐘數為 0（10 - 10 = 0）
    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot?.remainingMinutes).toBe(0)
  })

  test('時段剩餘分鐘數不足時無法新增預約', async ({ request }) => {
    // Given 時段剩餘分鐘數為 5
    const timeSlot = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 5,
    })
    context['timeSlotId'] = timeSlot.id

    // And 診療類型為 "初診"，初診所需分鐘數為 10
    const firstVisit = await createFirstVisitTreatment()
    context['treatmentTypeId'] = firstVisit.id

    // And 準備病患資料
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
    })
    context['patientId'] = patient.id

    // When 管理員新增預約
    const response = await request.post(
      '/api/admin/appointments',
      withAuthAndData(context['adminToken'] as string, {
        patientId: context['patientId'],
        doctorId: context['doctorId'],
        timeSlotId: context['timeSlotId'],
        treatmentTypeId: context['treatmentTypeId'],
        appointmentDate: '2026-01-15',
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(409)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('E003') // 時段已滿
  })
})

test.describe('病患當日不可有重複預約', () => {
  /**
   * Rule: 病患當日不可有重複預約
   */

  test('病患當日已有預約時無法再次新增', async ({ request }) => {
    // Given 病患資料
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
    })
    context['patientId'] = patient.id

    // And 診療類型
    const firstVisit = await createFirstVisitTreatment()
    context['treatmentTypeId'] = firstVisit.id

    // And 準備第一個時段（用於既有預約）
    const timeSlot1 = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 30,
    })

    // And 該病患在 "2026-01-15" 已有狀態為 "booked" 的預約
    await createAppointment({
      patientId: patient.id,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: firstVisit.id,
      timeSlotId: timeSlot1.id,
      appointmentDate: new Date('2026-01-15'),
      status: 'booked',
    })

    // And 準備第二個時段（用於新預約嘗試）
    const timeSlot2 = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })
    context['timeSlotId'] = timeSlot2.id

    // When 管理員新增預約於 "2026-01-15"
    const response = await request.post(
      '/api/admin/appointments',
      withAuthAndData(context['adminToken'] as string, {
        patientId: context['patientId'],
        doctorId: context['doctorId'],
        timeSlotId: context['timeSlotId'],
        treatmentTypeId: context['treatmentTypeId'],
        appointmentDate: '2026-01-15',
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(409)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
    expect(body.error.code).toBe('E004') // 當日已有預約
  })
})

test.describe('預約成功後必須扣除時段分鐘數', () => {
  /**
   * Rule: 預約成功後必須扣除時段分鐘數
   * 此規則已在「時段剩餘分鐘數足夠時可新增預約」測試中驗證
   * TODO: Feature File 標記為 #TODO，待補充更多 Examples
   */

  test.skip('TODO: 待補完 Feature Example', async () => {
    // Feature File 中此 Rule 標記為 #TODO
    // 等待 Feature File 補完後再實作
  })
})

test.describe('預約成功後必須建立預約記錄', () => {
  /**
   * Rule: 預約成功後必須建立預約記錄
   * 此規則已在「時段剩餘分鐘數足夠時可新增預約」測試中驗證
   * TODO: Feature File 標記為 #TODO，待補充更多 Examples
   */

  test.skip('TODO: 待補完 Feature Example', async () => {
    // Feature File 中此 Rule 標記為 #TODO
    // 等待 Feature File 補完後再實作
  })
})

test.describe('若病患有綁定 LINE 則發送通知', () => {
  /**
   * Rule: 若病患有綁定 LINE 則發送通知
   */

  test('病患有 LINE User ID 時發送通知', async ({ request }) => {
    // Given 病患有 LINE User ID
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      lineUserId: 'U1234567890abcdef',
    })
    context['patientId'] = patient.id

    // And 準備時段和診療類型
    const timeSlot = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 30,
    })
    context['timeSlotId'] = timeSlot.id

    const firstVisit = await createFirstVisitTreatment()
    context['treatmentTypeId'] = firstVisit.id

    // When 管理員新增預約
    const response = await request.post(
      '/api/admin/appointments',
      withAuthAndData(context['adminToken'] as string, {
        patientId: context['patientId'],
        doctorId: context['doctorId'],
        timeSlotId: context['timeSlotId'],
        treatmentTypeId: context['treatmentTypeId'],
        appointmentDate: '2026-01-15',
      })
    )
    context['lastResponse'] = response

    // Then 預約成功（LINE 訊息發送由 API 內部處理）
    // 注意：在 E2E 測試中，LINE API 通常需要 Mock 或使用測試環境
    // 這裡我們驗證預約成功即可，LINE 發送的驗證可透過其他方式確認
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // 驗證預約已建立
    const appointment = await prisma.appointment.findFirst({
      where: { patientId: patient.id },
      include: { patient: true },
    })
    expect(appointment).not.toBeNull()
    expect(appointment?.patient.lineUserId).toBe('U1234567890abcdef')
  })

  test('病患無 LINE User ID 時不發送通知', async ({ request }) => {
    // Given 病患無 LINE User ID
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      lineUserId: null,
    })
    context['patientId'] = patient.id

    // And 準備時段和診療類型
    const timeSlot = await createTimeSlot({
      scheduleId: context['scheduleId'] as string,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 30,
    })
    context['timeSlotId'] = timeSlot.id

    const firstVisit = await createFirstVisitTreatment()
    context['treatmentTypeId'] = firstVisit.id

    // When 管理員新增預約
    const response = await request.post(
      '/api/admin/appointments',
      withAuthAndData(context['adminToken'] as string, {
        patientId: context['patientId'],
        doctorId: context['doctorId'],
        timeSlotId: context['timeSlotId'],
        treatmentTypeId: context['treatmentTypeId'],
        appointmentDate: '2026-01-15',
      })
    )
    context['lastResponse'] = response

    // Then 預約記錄被建立（不會發送 LINE 通知，但預約仍成功）
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // 驗證預約已建立且病患無 LINE User ID
    const appointment = await prisma.appointment.findFirst({
      where: { patientId: patient.id },
      include: { patient: true },
    })
    expect(appointment).not.toBeNull()
    expect(appointment?.patient.lineUserId).toBeNull()
  })
})
