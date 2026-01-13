// tests/e2e/admin/manage-schedules.spec.ts
/**
 * Feature: 管理班表
 *
 * 作為 管理員
 * 為了 設定醫師的看診時間
 * 我想要 管理醫師的班表與時段
 *
 * API Endpoints:
 * - POST /api/admin/schedules - 建立班表
 * - PATCH /api/admin/schedules/{id} - 更新班表（停診/恢復）
 * - POST /api/admin/schedules/{scheduleId}/time-slots - 建立時段
 * - PATCH /api/admin/time-slots/{id} - 調整時段餘量
 */
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { loginAsAdmin, withAuthAndData } from '../helpers/auth'
import {
  createDoctor,
  createSchedule,
  createSuspendedSchedule,
  createTimeSlot,
  createPatient,
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

test.describe('同一醫師在同一日期只能有一筆班表', () => {
  /**
   * Rule: 同一醫師在同一日期只能有一筆班表
   */

  test('相同醫師相同日期無法重複建立班表', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-15"
    const scheduleDate = '2026-01-15'

    // And 該醫師在 "2026-01-15" 已有班表
    await createSchedule({
      doctorId: doctor.id,
      date: new Date(scheduleDate),
    })

    // When 管理員建立班表
    // API: POST /api/admin/schedules
    const response = await request.post('/api/admin/schedules', withAuthAndData(
      context['adminToken'] as string,
      {
        doctorId: doctor.id,
        date: scheduleDate,
      }
    ))
    context['lastResponse'] = response

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toContain('已有班表')
  })

  test('相同醫師不同日期可建立班表', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-16"
    const scheduleDate = '2026-01-16'

    // And 該醫師在 "2026-01-16" 無班表
    // (不建立任何班表，確認該日期沒有班表)

    // When 管理員建立班表
    // API: POST /api/admin/schedules
    const response = await request.post('/api/admin/schedules', withAuthAndData(
      context['adminToken'] as string,
      {
        doctorId: doctor.id,
        date: scheduleDate,
      }
    ))
    context['lastResponse'] = response

    // Then 班表記錄被建立
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBeDefined()

    // 驗證資料庫中班表已建立
    const schedule = await prisma.schedule.findFirst({
      where: {
        doctorId: doctor.id,
        date: new Date(scheduleDate),
      },
    })
    expect(schedule).not.toBeNull()
    expect(schedule?.isAvailable).toBe(true)
  })
})

test.describe('時段總分鐘數預設為 30 分鐘', () => {
  /**
   * Rule: 時段總分鐘數預設為 30 分鐘
   */

  test('建立時段時預設總分鐘數與剩餘分鐘數', async ({ request }) => {
    // Given 班表 ID 為 "schedule123"
    const doctor = await createDoctor({ name: '李醫師' })
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-15'),
    })
    context['scheduleId'] = schedule.id

    // And 時段開始時間為 "09:00"
    // And 時段結束時間為 "09:30"

    // When 管理員建立時段
    // API: POST /api/admin/schedules/{scheduleId}/time-slots
    const response = await request.post(
      `/api/admin/schedules/${schedule.id}/time-slots`,
      withAuthAndData(context['adminToken'] as string, {
        startTime: '09:00',
        endTime: '09:30',
      })
    )
    context['lastResponse'] = response

    // Then 時段總分鐘數為 30
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.totalMinutes).toBe(30)

    // And 時段剩餘分鐘數為 30
    expect(body.data.remainingMinutes).toBe(30)

    // 驗證資料庫
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: body.data.id },
    })
    expect(timeSlot?.totalMinutes).toBe(30)
    expect(timeSlot?.remainingMinutes).toBe(30)
  })
})

test.describe('可手動調整時段剩餘分鐘數', () => {
  /**
   * Rule: 可手動調整時段剩餘分鐘數
   */

  test('調整特定時段的剩餘分鐘數', async ({ request }) => {
    // Given 時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '李醫師' })
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-15'),
    })

    // And 時段剩餘分鐘數為 30
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 30,
    })
    context['timeSlotId'] = timeSlot.id

    // And 管理員輸入新餘量為 20
    const newRemainingMinutes = 20

    // When 管理員調整時段餘量
    // API: PATCH /api/admin/time-slots/{id}
    const response = await request.patch(
      `/api/admin/time-slots/${timeSlot.id}`,
      withAuthAndData(context['adminToken'] as string, {
        remainingMinutes: newRemainingMinutes,
      })
    )
    context['lastResponse'] = response

    // Then 時段剩餘分鐘數為 20
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.remainingMinutes).toBe(20)

    // 驗證資料庫
    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot?.remainingMinutes).toBe(20)
  })
})

test.describe('剩餘分鐘數為 0 時不可手動調整', () => {
  /**
   * Rule: 剩餘分鐘數為 0 時不可手動調整
   */

  test('餘量為 0 時無法調整', async ({ request }) => {
    // Given 時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '李醫師' })
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-15'),
    })

    // And 時段剩餘分鐘數為 0
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 0,
    })
    context['timeSlotId'] = timeSlot.id

    // And 管理員輸入新餘量為 10
    const newRemainingMinutes = 10

    // When 管理員調整時段餘量
    // API: PATCH /api/admin/time-slots/{id}
    const response = await request.patch(
      `/api/admin/time-slots/${timeSlot.id}`,
      withAuthAndData(context['adminToken'] as string, {
        remainingMinutes: newRemainingMinutes,
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toContain('剩餘分鐘數為 0')
  })

  test('餘量大於 0 時可調整', async ({ request }) => {
    // Given 時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '李醫師' })
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-15'),
    })

    // And 時段剩餘分鐘數為 5
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 5,
    })
    context['timeSlotId'] = timeSlot.id

    // And 管理員輸入新餘量為 15
    const newRemainingMinutes = 15

    // When 管理員調整時段餘量
    // API: PATCH /api/admin/time-slots/{id}
    const response = await request.patch(
      `/api/admin/time-slots/${timeSlot.id}`,
      withAuthAndData(context['adminToken'] as string, {
        remainingMinutes: newRemainingMinutes,
      })
    )
    context['lastResponse'] = response

    // Then 時段剩餘分鐘數為 15
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.remainingMinutes).toBe(15)

    // 驗證資料庫
    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot?.remainingMinutes).toBe(15)
  })
})

test.describe('標記停診時已預約者必須發送通知', () => {
  /**
   * Rule: 標記停診時已預約者必須發送通知
   *
   * 注意：此測試需要 Mock LINE Messaging API
   * 目前驗證 API 回應中包含 notifiedPatients 欄位
   */

  test('停診時發送通知給所有已預約病患', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-15"
    const scheduleDate = new Date('2026-01-15')
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: scheduleDate,
      isAvailable: true,
    })
    context['scheduleId'] = schedule.id

    // 準備診療類型
    const treatmentType = await createAcupunctureTreatment()

    // 準備時段
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
    })

    // And 該日有以下已預約記錄
    //   | appointment_id | patient_line_user_id |
    //   | appt1          | U1111111111111111    |
    //   | appt2          | U2222222222222222    |
    const patient1 = await createPatient({
      name: '病患一',
      lineUserId: 'U1111111111111111',
    })
    const patient2 = await createPatient({
      name: '病患二',
      lineUserId: 'U2222222222222222',
    })

    await createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: scheduleDate,
      status: 'booked',
    })
    await createAppointment({
      patientId: patient2.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: scheduleDate,
      status: 'booked',
    })

    // When 管理員標記停診
    // API: PATCH /api/admin/schedules/{id}
    const response = await request.patch(
      `/api/admin/schedules/${schedule.id}`,
      withAuthAndData(context['adminToken'] as string, {
        isAvailable: false,
      })
    )
    context['lastResponse'] = response

    // Then 操作成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And LINE 訊息發送至 "U1111111111111111"
    // And LINE 訊息發送至 "U2222222222222222"
    // 驗證 notifiedPatients 欄位包含這兩個 LINE User ID
    expect(body.data.notifiedPatients).toContain('U1111111111111111')
    expect(body.data.notifiedPatients).toContain('U2222222222222222')
  })
})

test.describe('標記停診時必須將班表設為不可預約', () => {
  /**
   * Rule: 標記停診時必須將班表設為不可預約
   */

  test('停診後班表狀態更新', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-15"
    const scheduleDate = new Date('2026-01-15')

    // And 該班表 is_available 為 true
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: scheduleDate,
      isAvailable: true,
    })
    context['scheduleId'] = schedule.id

    // When 管理員標記停診
    // API: PATCH /api/admin/schedules/{id}
    const response = await request.patch(
      `/api/admin/schedules/${schedule.id}`,
      withAuthAndData(context['adminToken'] as string, {
        isAvailable: false,
      })
    )
    context['lastResponse'] = response

    // Then 該班表 is_available 為 false
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.isAvailable).toBe(false)

    // 驗證資料庫
    const updatedSchedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
    })
    expect(updatedSchedule?.isAvailable).toBe(false)
  })
})

test.describe('停診恢復僅限未來日期', () => {
  /**
   * Rule: 停診恢復僅限未來日期
   */

  test('未來日期的停診可恢復', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-20"（未來日期）
    // And 當前日期為 "2026-01-15"
    // 使用確定是未來的日期
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 10) // 10 天後

    // And 該班表 is_available 為 false
    const schedule = await createSuspendedSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })
    context['scheduleId'] = schedule.id

    // When 管理員恢復班表為可預約
    // API: PATCH /api/admin/schedules/{id}
    const response = await request.patch(
      `/api/admin/schedules/${schedule.id}`,
      withAuthAndData(context['adminToken'] as string, {
        isAvailable: true,
      })
    )
    context['lastResponse'] = response

    // Then 該班表 is_available 為 true
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.isAvailable).toBe(true)

    // 驗證資料庫
    const updatedSchedule = await prisma.schedule.findUnique({
      where: { id: schedule.id },
    })
    expect(updatedSchedule?.isAvailable).toBe(true)
  })

  test('過去或當日的停診無法恢復', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為當日（或過去）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // And 該班表 is_available 為 false
    const schedule = await createSuspendedSchedule({
      doctorId: doctor.id,
      date: today,
    })
    context['scheduleId'] = schedule.id

    // When 管理員恢復班表為可預約
    // API: PATCH /api/admin/schedules/{id}
    const response = await request.patch(
      `/api/admin/schedules/${schedule.id}`,
      withAuthAndData(context['adminToken'] as string, {
        isAvailable: true,
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.message).toContain('無法恢復')
  })
})

test.describe('可為醫師新增額外時段（加診）', () => {
  /**
   * Rule: 可為醫師新增額外時段（加診）
   */

  test('新增加診時段', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({ name: '李醫師' })
    context['doctorId'] = doctor.id

    // And 日期為 "2026-01-15"
    const scheduleDate = new Date('2026-01-15')

    // And 該醫師在 "2026-01-15" 已有班表
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: scheduleDate,
    })
    context['scheduleId'] = schedule.id

    // 先建立一個正常時段
    await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })

    // And 時段開始時間為 "18:00"
    // And 時段結束時間為 "18:30"

    // When 管理員新增加診時段
    // API: POST /api/admin/schedules/{scheduleId}/time-slots
    const response = await request.post(
      `/api/admin/schedules/${schedule.id}/time-slots`,
      withAuthAndData(context['adminToken'] as string, {
        startTime: '18:00',
        endTime: '18:30',
      })
    )
    context['lastResponse'] = response

    // Then 時段記錄被建立
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBeDefined()

    // 驗證資料庫中時段已建立
    const timeSlots = await prisma.timeSlot.findMany({
      where: { scheduleId: schedule.id },
    })
    expect(timeSlots.length).toBe(2) // 原本的 + 新增的加診時段
  })
})

// =============================================
// 以下 Rule 標記為 #TODO，暫不實作測試
// =============================================

// test.describe('可設定週期性班表', () => {
//   /**
//    * Rule: 可設定週期性班表
//    * #TODO - 待 Feature 定義完成後實作
//    */
// })

// test.describe('可設定可預約日', () => {
//   /**
//    * Rule: 可設定可預約日
//    * #TODO - 待 Feature 定義完成後實作
//    */
// })
