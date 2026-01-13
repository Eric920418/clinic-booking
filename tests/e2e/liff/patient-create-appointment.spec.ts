// tests/e2e/liff/patient-create-appointment.spec.ts
// Feature: 病患建立預約
// API Endpoint: POST /api/patient/appointments

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import {
  createPatient,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
  addPatientToBlacklist,
} from '../factories'

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
})

test.describe('病患不可在黑名單中', () => {
  /**
   * Rule: 病患不可在黑名單中
   */

  test('黑名單病患無法建立預約', async ({ request }) => {
    // Given 病患 LINE User ID 為 "U1234567890abcdef"
    const patient = await createPatient({
      lineUserId: 'U1234567890abcdef',
      name: '黑名單病患',
    })

    // And 該病患在黑名單中
    await addPatientToBlacklist(patient.id, '累計未報到 3 次')

    // 準備其他必要資料
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({ scheduleId: schedule.id })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'U1234567890abcdef',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(403)

    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('時段剩餘分鐘數必須大於等於診療所需分鐘數', () => {
  /**
   * Rule: 時段剩餘分鐘數必須大於等於診療所需分鐘數
   */

  test('時段剩餘分鐘數足夠時可預約', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest001',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })

    // And 診療類型為 "初診"，初診所需分鐘數為 10
    const treatmentType = await createTreatmentType({
      name: '初診',
      durationMinutes: 10,
    })

    // And 時段剩餘分鐘數為 10
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 10,
    })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest001',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 預約記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)

    // And 時段剩餘分鐘數為 0
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedSlot?.remainingMinutes).toBe(0)
  })

  test('時段剩餘分鐘數不足時無法預約並建議其他時段', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest002',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })

    // And 診療類型為 "初診"，初診所需分鐘數為 10
    const treatmentType = await createTreatmentType({
      name: '初診',
      durationMinutes: 10,
    })

    // And 時段剩餘分鐘數為 5（不足）
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 5,
    })

    // And 同一醫師有其他可用時段（用於 API 返回建議）
    await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      remainingMinutes: 30,
    })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest002',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)

    // And 返回錯誤訊息 "時段已滿"
    expect(body.message).toContain('時段已滿')

    // And 返回其他可用時段建議
    expect(body.alternativeSlots).toBeDefined()
    expect(Array.isArray(body.alternativeSlots)).toBe(true)
  })
})

test.describe('病患當日不可有重複預約', () => {
  /**
   * Rule: 病患當日不可有重複預約
   */

  test('病患當日已有預約時無法再次預約', async ({ request }) => {
    // Given 病患 ID 為 "patient123"
    const patient = await createPatient({
      lineUserId: 'Utest003',
      name: '測試病患',
    })

    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })

    // And 預約日期為 "2026-01-15"
    const appointmentDate = new Date('2026-01-15')
    const schedule = await createSchedule({ doctorId: doctor.id, date: appointmentDate })
    const timeSlot1 = await createTimeSlot({ scheduleId: schedule.id })
    const timeSlot2 = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
    })

    // And 該病患在 "2026-01-15" 已有狀態為 "booked" 的預約
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: doctor.id,
        treatmentTypeId: treatmentType.id,
        timeSlotId: timeSlot1.id,
        appointmentDate: appointmentDate,
        status: 'booked',
      },
    })

    // When 病患建立預約於 "2026-01-15"
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest003',
        slotId: timeSlot2.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(409)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('E004') // 當日已有預約
  })

  test('病患當日無預約時可建立預約', async ({ request }) => {
    // Given 病患 ID 為 "patient123"
    await createPatient({
      lineUserId: 'Utest004',
      name: '測試病患',
    })

    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })

    // And 預約日期為 "2026-01-15"
    const appointmentDate = new Date('2026-01-15')
    const schedule = await createSchedule({ doctorId: doctor.id, date: appointmentDate })
    const timeSlot = await createTimeSlot({ scheduleId: schedule.id })

    // And 該病患在 "2026-01-15" 無預約（不需要準備任何預約資料）

    // When 病患建立預約於 "2026-01-15"
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest004',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 預約記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)
  })
})

test.describe('預約成功後必須扣除時段分鐘數', () => {
  /**
   * Rule: 預約成功後必須扣除時段分鐘數
   */

  test('預約初診扣除 10 分鐘', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest005',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })

    // And 診療類型為 "初診"，初診所需分鐘數為 10
    const treatmentType = await createTreatmentType({
      name: '初診',
      durationMinutes: 10,
    })

    // And 時段剩餘分鐘數為 30
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 30,
    })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest005',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 時段剩餘分鐘數為 20（30 - 10 = 20）
    expect(response.ok()).toBeTruthy()

    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedSlot?.remainingMinutes).toBe(20)
  })

  test('預約內科扣除 5 分鐘', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest006',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })

    // And 診療類型為 "內科"，內科所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })

    // And 時段剩餘分鐘數為 30
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 30,
    })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest006',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 時段剩餘分鐘數為 25（30 - 5 = 25）
    expect(response.ok()).toBeTruthy()

    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedSlot?.remainingMinutes).toBe(25)
  })
})

// Rule: 預約成功後必須建立預約記錄
// #TODO - 待補充 Example

test.describe('預約成功後必須發送 LINE 通知', () => {
  /**
   * Rule: 預約成功後必須發送 LINE 通知
   */

  test('預約成功發送通知訊息', async ({ request }) => {
    // Given 病患 LINE User ID 為 "U1234567890abcdef"
    await createPatient({
      lineUserId: 'U1234567890abcdef',
      name: '測試病患',
    })

    // And 醫師姓名為 "王醫師"
    const doctor = await createDoctor({ name: '王醫師' })

    // And 診療類型為 "初診"
    const treatmentType = await createTreatmentType({
      name: '初診',
      durationMinutes: 10,
    })

    // And 預約日期為 "2026-01-15"，預約時段為 "09:00-09:30"
    const appointmentDate = new Date('2026-01-15')
    const schedule = await createSchedule({ doctorId: doctor.id, date: appointmentDate })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'U1234567890abcdef',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 預約成功
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)

    // Then LINE 訊息發送至 "U1234567890abcdef"
    // 注意：這個驗證可能需要 Mock LINE Messaging API
    // 或者檢查 API 回應中是否有通知發送成功的標記
    expect(body.notificationSent).toBe(true)
  })
})

test.describe('不可選擇過去日期', () => {
  /**
   * Rule: 不可選擇過去日期
   */

  test('選擇過去日期無法建立預約', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest007',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })

    // And 預約日期為過去日期（假設當前日期為 2026-01-15，預約 2026-01-14）
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1) // 昨天
    const schedule = await createSchedule({ doctorId: doctor.id, date: pastDate })
    const timeSlot = await createTimeSlot({ scheduleId: schedule.id })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest007',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('不可選擇超過 30 天後的日期', () => {
  /**
   * Rule: 不可選擇超過 30 天後的日期
   */

  test('選擇 31 天後的日期無法建立預約', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest008',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })

    // And 預約日期為 31 天後
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 31)
    const schedule = await createSchedule({ doctorId: doctor.id, date: futureDate })
    const timeSlot = await createTimeSlot({ scheduleId: schedule.id })

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest008',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('選擇 30 天後的日期可建立預約', async ({ request }) => {
    // Given 準備測試資料
    await createPatient({
      lineUserId: 'Utest009',
      name: '測試病患',
    })
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({ name: '初診', durationMinutes: 10 })

    // And 預約日期為剛好 30 天後
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const schedule = await createSchedule({ doctorId: doctor.id, date: futureDate })
    const timeSlot = await createTimeSlot({ scheduleId: schedule.id })

    // And 時段剩餘分鐘數足夠
    // And 病患當日無預約（這是第一次預約）

    // When 病患建立預約
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Utest009',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 預約記錄被建立
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)
  })
})

// Rule: 每次預約僅能選擇一個診療項目
// #TODO - 待補充 Example
