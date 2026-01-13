// tests/e2e/liff/concurrent-booking.spec.ts
// Feature: 併發預約控制
// 作為 系統
// 為了 防止時段超額預約
// 我想要 使用資料庫層級鎖定處理併發請求
//
// API Endpoint: POST /api/patient/appointments (含併發控制邏輯)

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import {
  createPatient,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createDoctorTreatment,
} from '../factories'
import { prisma } from '../helpers/db'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, any> = {}

// 取得未來日期（用於測試）
function getFutureDate(daysFromNow: number = 7): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(0, 0, 0, 0)
  return date
}

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}
})

test.describe('使用 Row-Level Lock 鎖定時段記錄', () => {
  /**
   * Rule: 使用 Row-Level Lock 鎖定時段記錄
   * #TODO - 此 Rule 尚未定義具體 Example
   */

  test.skip('TODO: 待定義具體測試案例', async ({ request }) => {
    // 此 Rule 需要定義具體的測試場景
    // 建議場景：驗證併發請求時使用 SELECT ... FOR UPDATE
  })
})

test.describe('先取得鎖定者預約成功', () => {
  /**
   * Rule: 先取得鎖定者預約成功
   */

  test('第一位用戶取得鎖定成功預約', async ({ request }) => {
    // Given 準備醫師
    const doctorA = await createDoctor({ name: '王醫師' })
    context['doctorAId'] = doctorA.id

    // And 準備診療類型 "內科"，所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 準備班表與時段，時段剩餘分鐘數為 5（剛好夠一次內科預約）
    const schedule = await createSchedule({
      doctorId: doctorA.id,
      date: getFutureDate(7), // 使用未來日期
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 5, // 剛好等於內科所需分鐘數
    })
    context['timeSlotId'] = timeSlot.id

    // And 準備病患 A
    const patientA = await createPatient({
      lineUserId: 'UpatientA_concurrent_001',
      name: '病患A',
    })
    context['patientAId'] = patientA.id

    // And 準備病患 B（用於後續併發測試）
    const patientB = await createPatient({
      lineUserId: 'UpatientB_concurrent_002',
      name: '病患B',
    })
    context['patientBId'] = patientB.id

    // When 病患 A 建立預約（第一位取得鎖定）
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'UpatientA_concurrent_001',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })
    context['responseA'] = response

    // Then 病患 A 預約成功
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(201)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toBeDefined()
    // 驗證預約 ID 存在（可能是 body.data.id 或 body.data.appointmentId）
    expect(body.data.id || body.data.appointmentId).toBeDefined()

    // And 時段剩餘分鐘數為 0（已被病患 A 預約佔滿）
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedSlot?.remainingMinutes).toBe(0)
  })

  test('併發請求時先完成者預約成功', async ({ request }) => {
    // Given 準備醫師
    const doctor = await createDoctor({ name: '王醫師' })

    // And 準備診療類型 "內科"，所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })

    // And 準備班表與時段，時段剩餘分鐘數為 5
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: getFutureDate(8), // 使用未來日期
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 5,
    })

    // And 準備兩位病患
    await createPatient({
      lineUserId: 'Uconcurrent_test_A',
      name: '併發測試病患A',
    })
    await createPatient({
      lineUserId: 'Uconcurrent_test_B',
      name: '併發測試病患B',
    })

    // When 兩位病患同時發送預約請求（使用 Promise.all 模擬併發）
    const [responseA, responseB] = await Promise.all([
      request.post('/api/patient/appointments', {
        data: {
          lineUserId: 'Uconcurrent_test_A',
          slotId: timeSlot.id,
          treatmentId: treatmentType.id,
        },
      }),
      request.post('/api/patient/appointments', {
        data: {
          lineUserId: 'Uconcurrent_test_B',
          slotId: timeSlot.id,
          treatmentId: treatmentType.id,
        },
      }),
    ])

    // Then 只有一位預約成功，另一位因餘量不足失敗
    const bodyA = await responseA.json()
    const bodyB = await responseB.json()

    // 計算成功和失敗的數量
    const successCount = [responseA.ok(), responseB.ok()].filter(Boolean).length
    const failCount = [!responseA.ok(), !responseB.ok()].filter(Boolean).length

    // 應該只有一個成功
    expect(successCount).toBe(1)
    expect(failCount).toBe(1)

    // 驗證時段餘量最終為 0
    const updatedSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedSlot?.remainingMinutes).toBe(0)

    // 驗證資料庫中只有一筆預約
    const appointments = await prisma.appointment.findMany({
      where: { timeSlotId: timeSlot.id },
    })
    expect(appointments.length).toBe(1)
  })
})

test.describe('後取得鎖定者檢查時段餘量不足則失敗', () => {
  /**
   * Rule: 後取得鎖定者檢查時段餘量不足則失敗
   */

  test('第二位用戶因餘量不足失敗', async ({ request }) => {
    // Given 準備醫師
    const doctor = await createDoctor({ name: '王醫師' })

    // And 準備診療類型 "內科"，所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })

    // And 準備班表與時段，初始剩餘分鐘數為 5
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: getFutureDate(9), // 使用未來日期
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 5,
    })

    // And 準備病患 A（使用唯一的身分證字號避免衝突）
    const timestamp = Date.now()
    const patientA = await createPatient({
      lineUserId: 'Usequence_test_A',
      name: '順序測試病患A',
      nationalId: `A${String(timestamp).slice(-9)}`,
    })

    // And 準備病患 B（使用唯一的身分證字號避免衝突）
    await createPatient({
      lineUserId: 'Usequence_test_B',
      name: '順序測試病患B',
      nationalId: `B${String(timestamp + 1).slice(-9)}`,
    })

    // And 病患 A 先取得時段鎖定並預約成功（建立前置條件）
    const responseA = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Usequence_test_A',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })
    expect(responseA.ok()).toBeTruthy()

    // And 時段剩餘分鐘數已更新為 0
    const slotAfterA = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(slotAfterA?.remainingMinutes).toBe(0)

    // When 病患 B 取得鎖定並檢查餘量（嘗試預約）
    const responseB = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Usequence_test_B',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 病患 B 預約失敗
    expect(responseB.ok()).toBeFalsy()
    expect(responseB.status()).toBe(400)

    const bodyB = await responseB.json()
    expect(bodyB.success).toBe(false)
    // 驗證錯誤訊息包含餘量不足相關內容
    expect(bodyB.error || bodyB.message).toBeDefined()
  })
})

test.describe('交易失敗時必須回滾所有變更', () => {
  /**
   * Rule: 交易失敗時必須回滾所有變更
   * #TODO - 此 Rule 尚未定義具體 Example
   */

  test.skip('TODO: 待定義具體測試案例', async ({ request }) => {
    // 此 Rule 需要定義具體的測試場景
    // 建議場景：
    // - 預約過程中發生錯誤時，時段餘量不應被扣減
    // - 模擬交易中途失敗的情況
  })
})

test.describe('時段餘量不足時返回錯誤訊息與替代選項', () => {
  /**
   * Rule: 時段餘量不足時返回錯誤訊息與替代選項
   */

  test('衝突時提供同一時段其他醫師的可用選項', async ({ request }) => {
    // Given 準備醫師 A
    const doctorA = await createDoctor({ name: '醫師A' })

    // And 準備醫師 B（作為替代選項）
    const doctorB = await createDoctor({ name: '醫師B' })

    // And 準備診療類型 "內科"，所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })

    // 設定醫師可看診項目（若需要）
    await createDoctorTreatment({
      doctorId: doctorA.id,
      treatmentTypeId: treatmentType.id,
    })
    await createDoctorTreatment({
      doctorId: doctorB.id,
      treatmentTypeId: treatmentType.id,
    })

    // And 準備醫師 A 的班表與時段，時段剩餘分鐘數為 0（已滿）
    const futureDate = getFutureDate(10) // 使用相同的未來日期
    const scheduleA = await createSchedule({
      doctorId: doctorA.id,
      date: futureDate,
    })
    const timeSlotA = await createTimeSlot({
      scheduleId: scheduleA.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 0, // 已滿
    })

    // And 準備醫師 B 的班表與時段（同一日期同一時段），剩餘分鐘數為 10
    const scheduleB = await createSchedule({
      doctorId: doctorB.id,
      date: futureDate, // 同一日期
    })
    const timeSlotB = await createTimeSlot({
      scheduleId: scheduleB.id,
      startTime: new Date('1970-01-01T09:00:00'), // 同一時段
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 10, // 有餘量
    })

    // And 準備病患
    await createPatient({
      lineUserId: 'Ualternative_test',
      name: '替代選項測試病患',
    })

    // When 病患發送預約請求到醫師 A（餘量不足）
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Ualternative_test',
        slotId: timeSlotA.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 返回錯誤訊息 "時段已滿"
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    // API 可能回傳錯誤代碼 E003 或包含 "時段已滿" 的訊息
    const errorInfo = body.error || body.message || body.code || ''
    expect(errorInfo).toBeTruthy() // 確保有錯誤訊息

    // And 返回替代選項包含醫師 B 的時段
    // 根據 API Spec: AppointmentErrorResponse.alternative_slots
    // 注意：此功能需要在 API 中實作，目前可能尚未實作
    expect(body.alternativeSlots).toBeDefined()
    expect(Array.isArray(body.alternativeSlots)).toBe(true)
    expect(body.alternativeSlots.length).toBeGreaterThan(0)

    // 驗證替代選項包含醫師 B 的可用時段
    const hasSlotB = body.alternativeSlots.some(
      (slot: any) =>
        slot.doctorId === doctorB.id || slot.doctorName === '醫師B'
    )
    expect(hasSlotB).toBe(true)
  })

  test('餘量不足但無替代選項時只返回錯誤訊息', async ({ request }) => {
    // Given 只準備一位醫師（無其他醫師可作為替代）
    const doctor = await createDoctor({ name: '唯一醫師' })

    // And 準備診療類型 "內科"，所需分鐘數為 5
    const treatmentType = await createTreatmentType({
      name: '內科',
      durationMinutes: 5,
    })

    // And 時段剩餘分鐘數為 0（已滿）
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: getFutureDate(11), // 使用未來日期
    })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 0,
    })

    // And 準備病患
    await createPatient({
      lineUserId: 'Uno_alternative_test',
      name: '無替代選項測試病患',
    })

    // When 病患發送預約請求
    const response = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: 'Uno_alternative_test',
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // Then 返回錯誤訊息
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body.success).toBe(false)
    // API 可能回傳錯誤代碼 E003 或包含 "時段已滿" 的訊息
    const errorInfo = body.error || body.message || body.code || ''
    expect(errorInfo).toBeTruthy() // 確保有錯誤訊息

    // And 替代選項為空陣列（無可用替代）
    // 注意：此功能需要在 API 中實作，目前可能尚未實作
    expect(body.alternativeSlots).toBeDefined()
    expect(body.alternativeSlots.length).toBe(0)
  })
})
