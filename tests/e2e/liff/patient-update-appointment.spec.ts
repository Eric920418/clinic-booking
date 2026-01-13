// tests/e2e/liff/patient-update-appointment.spec.ts
// Feature: 病患修改預約
// API Endpoint: PUT /api/patient/appointments/{appointmentId}

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import {
  createPatient,
  createDoctor,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createCancelledAppointment,
  createCompletedAppointment,
  createFirstVisitTreatment,
  createInternalMedicineTreatment,
} from '../factories'

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
})

test.describe('僅可修改狀態為「已預約」的預約', () => {
  /**
   * Rule: 僅可修改狀態為「已預約」的預約
   */

  test('已預約狀態可修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_001',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment() // 初診 10 分鐘
    const newTreatmentType = await createInternalMedicineTreatment() // 內科 5 分鐘

    // 創建班表和兩個時段（原時段和新時段）
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7) // 7 天後
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 20, // 已扣除 10 分鐘（初診）
    })

    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })

    // And 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: futureDate,
      status: 'booked',
    })

    // When 病患修改預約
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 預約記錄被更新
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // And 資料庫中的預約已更新
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment).not.toBeNull()
    expect(updatedAppointment?.timeSlotId).toBe(newTimeSlot.id)
    expect(updatedAppointment?.treatmentTypeId).toBe(newTreatmentType.id)
  })

  test('已取消狀態無法修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_002',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const newTreatmentType = await createInternalMedicineTreatment()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 30,
    })

    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })

    // And 預約狀態為 "cancelled"
    const appointment = await createCancelledAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: futureDate,
    })

    // When 病患修改預約
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('已完成狀態無法修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_003',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const newTreatmentType = await createInternalMedicineTreatment()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 20,
    })

    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })

    // And 預約狀態為 "completed"
    const appointment = await createCompletedAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: futureDate,
    })

    // When 病患修改預約
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('不可修改時段開始前 3 小時內的預約', () => {
  /**
   * Rule: 不可修改時段開始前 3 小時內的預約
   * 注意：這些測試使用未來日期設定來模擬時間條件
   */

  test('時段開始前 3 小時內無法修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_004',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const newTreatmentType = await createInternalMedicineTreatment()

    // 創建今日班表，時段在 2.5 小時後開始（小於 3 小時）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: today,
    })

    // 計算 2.5 小時後的時段開始時間
    const now = new Date()
    const slotStartTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)
    const slotStartHour = slotStartTime.getHours()
    const slotStartMinute = slotStartTime.getMinutes()

    // 計算結束時間（處理跨小時情況）
    const endHour = slotStartMinute + 30 >= 60 ? (slotStartHour + 1) % 24 : slotStartHour
    const endMinute = (slotStartMinute + 30) % 60

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date(`1970-01-01T${String(slotStartHour).padStart(2, '0')}:${String(slotStartMinute).padStart(2, '0')}:00`),
      endTime: new Date(`1970-01-01T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`),
      remainingMinutes: 20,
    })

    // 創建另一個時段用於修改目標
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T18:00:00'),
      endTime: new Date('1970-01-01T18:30:00'),
      remainingMinutes: 30,
    })

    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: today,
      status: 'booked',
    })

    // When 病患修改預約（時段開始前不足 3 小時）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('時段開始前超過 3 小時可修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_005',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const newTreatmentType = await createInternalMedicineTreatment()

    // 創建未來日期班表（確保超過 3 小時）
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7) // 7 天後
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T14:00:00'),
      endTime: new Date('1970-01-01T14:30:00'),
      remainingMinutes: 20,
    })

    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T15:00:00'),
      endTime: new Date('1970-01-01T15:30:00'),
      remainingMinutes: 30,
    })

    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: futureDate,
      status: 'booked',
    })

    // When 病患修改預約（時段開始前超過 3 小時）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 預約記錄被更新
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // And 資料庫中的預約已更新
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment?.timeSlotId).toBe(newTimeSlot.id)
  })

  test('時段開始前剛好 3 小時無法修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_006',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const newTreatmentType = await createInternalMedicineTreatment()

    // 創建今日班表，時段在剛好 3 小時後開始
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: today,
    })

    // 計算剛好 3 小時後的時段開始時間
    const now = new Date()
    const slotStartTime = new Date(now.getTime() + 3 * 60 * 60 * 1000) // 剛好 3 小時
    const slotStartHour = slotStartTime.getHours()
    const slotStartMinute = slotStartTime.getMinutes()

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date(`1970-01-01T${String(slotStartHour).padStart(2, '0')}:${String(slotStartMinute).padStart(2, '0')}:00`),
      endTime: new Date(`1970-01-01T${String((slotStartHour + (slotStartMinute + 30 >= 60 ? 1 : 0)) % 24).padStart(2, '0')}:${String((slotStartMinute + 30) % 60).padStart(2, '0')}:00`),
      remainingMinutes: 20,
    })

    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T20:00:00'),
      endTime: new Date('1970-01-01T20:30:00'),
      remainingMinutes: 30,
    })

    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: today,
      status: 'booked',
    })

    // When 病患修改預約（時段開始前剛好 3 小時，邊界條件）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 操作失敗（剛好 3 小時不允許修改）
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('修改預約時必須立即釋放原時段分鐘數', () => {
  /**
   * Rule: 修改預約時必須立即釋放原時段分鐘數
   */

  test('釋放原時段的初診分鐘數', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_007',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment() // 初診 10 分鐘
    const newTreatmentType = await createInternalMedicineTreatment() // 內科 5 分鐘

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    // And 時段 "slot123" 剩餘分鐘數為 15（原本 30，已預約初診扣 10，再有人預約內科扣 5）
    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 15,
    })

    // 新時段用於修改目標
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 25, // 已有內科預約扣 5
    })

    // And 原預約的診療類型為 "初診"（10 分鐘）
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: futureDate,
      status: 'booked',
    })

    // When 病患修改預約（換到新時段，改成內科）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 預約修改成功
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    // And 原時段 "slot123" 剩餘分鐘數為 25（15 + 10 初診釋放）
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
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_008',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment() // 初診 10 分鐘
    const newTreatmentType = await createInternalMedicineTreatment() // 內科 5 分鐘

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 20,
    })

    // And 新時段 "slot456" 剩餘分鐘數為 10
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 10,
    })

    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: futureDate,
      status: 'booked',
    })

    // When 病患修改預約（內科 5 分鐘 <= 新時段餘量 10 分鐘）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 預約記錄被更新
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    // And 新時段 "slot456" 剩餘分鐘數為 5（10 - 5）
    const updatedNewSlot = await prisma.timeSlot.findUnique({
      where: { id: newTimeSlot.id },
    })
    expect(updatedNewSlot?.remainingMinutes).toBe(5)
  })

  test('新時段餘量不足時無法修改', async ({ request }) => {
    // Given 準備測試資料
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U_update_test_009',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createInternalMedicineTreatment() // 內科 5 分鐘
    const newTreatmentType = await createFirstVisitTreatment() // 初診 10 分鐘（需要更多時間）

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    futureDate.setHours(0, 0, 0, 0)

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: futureDate,
    })

    const originalTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 25,
    })

    // And 新時段 "slot456" 剩餘分鐘數為 3（不足內科的 5 分鐘，更不足初診的 10 分鐘）
    const newTimeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 3,
    })

    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: originalTimeSlot.id,
      appointmentDate: futureDate,
      status: 'booked',
    })

    // When 病患修改預約（初診 10 分鐘 > 新時段餘量 3 分鐘）
    const response = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newTimeSlot.id,
        treatmentTypeId: newTreatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

// ============================================================
// 以下 Rules 標記為 #TODO，待 Feature File 補充後再生成
// ============================================================

// test.describe('修改預約時必須扣除新時段分鐘數', () => {
//   /**
//    * Rule: 修改預約時必須扣除新時段分鐘數
//    * 狀態: #TODO - Feature File 尚未定義 Examples
//    */
// })

// test.describe('修改成功後必須發送 LINE 通知', () => {
//   /**
//    * Rule: 修改成功後必須發送 LINE 通知
//    * 狀態: #TODO - Feature File 尚未定義 Examples
//    */
// })
