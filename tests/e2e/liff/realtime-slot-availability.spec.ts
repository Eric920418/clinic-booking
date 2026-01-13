// tests/e2e/liff/realtime-slot-availability.spec.ts
// Feature: 即時更新時段餘量
// API Endpoint: GET /api/slots

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import {
  createPatient,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createDoctorTreatment,
} from '../factories'

// Feature-level Background
test.beforeEach(async () => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
})

test.describe('訂閱 Supabase Realtime 監聽時段變更', () => {
  /**
   * Rule: 訂閱 Supabase Realtime 監聽時段變更
   * TODO: 待 Feature File 補充具體場景
   */

  test.skip('訂閱時段變更頻道', async ({ page }) => {
    // TODO: 待 Feature File 補充具體場景
  })
})

test.describe('新預約時即時廣播時段剩餘分鐘數減少', () => {
  /**
   * Rule: 新預約時即時廣播時段剩餘分鐘數減少
   */

  test('病患 A 預約成功後病患 B 看到餘量更新', async ({ request }) => {
    // Given 時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-20')
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    // And 時段剩餘分鐘數為 10
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      remainingMinutes: 10,
    })

    // 準備病患 A 的資料
    const patientA = await createPatient({
      lineUserId: 'UpatientA001',
      name: '病患A',
    })

    // And 病患 B 正在查看該時段（查詢可用時段）
    const initialResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    // 驗證初始狀態：時段剩餘分鐘數為 10
    expect(initialResponse.ok()).toBeTruthy()
    const initialSlots = await initialResponse.json()
    const initialSlot = initialSlots.find((s: any) => s.id === timeSlot.id)
    expect(initialSlot?.remainingMinutes).toBe(10)

    // And 病患 A 建立預約並扣除 5 分鐘
    const appointmentResponse = await request.post('/api/patient/appointments', {
      data: {
        lineUserId: patientA.lineUserId,
        slotId: timeSlot.id,
        treatmentId: treatmentType.id,
      },
    })

    // When 時段餘量變更廣播（透過查詢 API 驗證資料已更新）
    expect(appointmentResponse.ok()).toBeTruthy()

    // Then 病患 B 看到時段剩餘分鐘數為 5

    // 病患 B 再次查詢時段（模擬接收到 Realtime 更新後的狀態）
    const updatedResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    expect(updatedResponse.ok()).toBeTruthy()
    const updatedSlots = await updatedResponse.json()
    const updatedSlot = updatedSlots.find((s: any) => s.id === timeSlot.id)
    expect(updatedSlot?.remainingMinutes).toBe(5) // 10 - 5 = 5

    // 驗證資料庫狀態
    const dbSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(dbSlot?.remainingMinutes).toBe(5)
  })
})

test.describe('取消預約時即時廣播時段剩餘分鐘數增加', () => {
  /**
   * Rule: 取消預約時即時廣播時段剩餘分鐘數增加
   */

  test('病患 A 取消預約後病患 B 看到餘量更新', async ({ request }) => {
    // Given 時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-20')
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    // And 時段剩餘分鐘數為 5（表示已有預約佔用 5 分鐘）
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      totalMinutes: 10,
      remainingMinutes: 5,
    })

    // 準備病患 A 的資料與預約
    const patientA = await createPatient({
      lineUserId: 'UpatientA002',
      name: '病患A',
    })

    // 病患 A 已有一筆預約
    const appointment = await createAppointment({
      patientId: patientA.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })

    // And 病患 B 正在查看該時段
    // 病患 B 查詢可用時段（模擬病患 B 正在查看）
    const initialResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    // 驗證初始狀態：時段剩餘分鐘數為 5
    expect(initialResponse.ok()).toBeTruthy()
    const initialSlots = await initialResponse.json()
    const initialSlot = initialSlots.find((s: any) => s.id === timeSlot.id)
    expect(initialSlot?.remainingMinutes).toBe(5)

    // And 病患 A 取消預約並釋放 5 分鐘
    const cancelResponse = await request.delete(`/api/patient/appointments/${appointment.id}`)

    // When 時段餘量變更廣播
    expect(cancelResponse.ok()).toBeTruthy()

    // Then 病患 B 看到時段剩餘分鐘數為 10

    // 病患 B 再次查詢時段
    const updatedResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    expect(updatedResponse.ok()).toBeTruthy()
    const updatedSlots = await updatedResponse.json()
    const updatedSlot = updatedSlots.find((s: any) => s.id === timeSlot.id)
    expect(updatedSlot?.remainingMinutes).toBe(10) // 5 + 5 = 10

    // 驗證資料庫狀態
    const dbSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(dbSlot?.remainingMinutes).toBe(10)
  })
})

test.describe('修改預約時即時廣播原時段釋放與新時段扣除', () => {
  /**
   * Rule: 修改預約時即時廣播原時段釋放與新時段扣除
   */

  test('病患 A 修改預約後病患 B 看到兩個時段餘量更新', async ({ request }) => {
    // Given 原時段 ID 為 "slot123"
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-20')
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    // And 原時段剩餘分鐘數為 15
    const originalSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
      totalMinutes: 20,
      remainingMinutes: 15,
    })

    // And 新時段 ID 為 "slot456"
    // And 新時段剩餘分鐘數為 20
    const newSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T10:00:00'),
      endTime: new Date('1970-01-01T10:30:00'),
      totalMinutes: 20,
      remainingMinutes: 20,
    })

    // 準備病患 A 的資料與預約
    const patientA = await createPatient({
      lineUserId: 'UpatientA003',
      name: '病患A',
    })

    // 病患 A 已有一筆預約在原時段
    const appointment = await createAppointment({
      patientId: patientA.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: originalSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })

    // And 病患 B 正在查看這兩個時段
    // 病患 B 查詢可用時段（模擬病患 B 正在查看）
    const initialResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    // 驗證初始狀態
    expect(initialResponse.ok()).toBeTruthy()
    const initialSlots = await initialResponse.json()

    const initialOriginal = initialSlots.find((s: any) => s.id === originalSlot.id)
    const initialNew = initialSlots.find((s: any) => s.id === newSlot.id)
    expect(initialOriginal?.remainingMinutes).toBe(15)
    expect(initialNew?.remainingMinutes).toBe(20)

    // And 病患 A 修改預約從原時段到新時段（原預約釋放 5 分鐘，新預約扣除 5 分鐘）
    const updateResponse = await request.put(`/api/patient/appointments/${appointment.id}`, {
      data: {
        timeSlotId: newSlot.id,
        treatmentTypeId: treatmentType.id,
      },
    })

    // When 時段餘量變更廣播
    expect(updateResponse.ok()).toBeTruthy()

    // Then 病患 B 看到原時段剩餘分鐘數為 20，新時段剩餘分鐘數為 15

    // 病患 B 再次查詢時段
    const updatedResponse = await request.get('/api/slots', {
      params: {
        date: '2026-01-20',
        doctor_id: doctor.id,
      },
    })

    expect(updatedResponse.ok()).toBeTruthy()
    const updatedSlots = await updatedResponse.json()

    const updatedOriginal = updatedSlots.find((s: any) => s.id === originalSlot.id)
    const updatedNew = updatedSlots.find((s: any) => s.id === newSlot.id)

    // 原時段：15 + 5 = 20（釋放原預約）
    expect(updatedOriginal?.remainingMinutes).toBe(20)

    // 新時段：20 - 5 = 15（扣除新預約）
    expect(updatedNew?.remainingMinutes).toBe(15)

    // 驗證資料庫狀態
    const dbOriginalSlot = await prisma.timeSlot.findUnique({
      where: { id: originalSlot.id },
    })
    const dbNewSlot = await prisma.timeSlot.findUnique({
      where: { id: newSlot.id },
    })

    expect(dbOriginalSlot?.remainingMinutes).toBe(20)
    expect(dbNewSlot?.remainingMinutes).toBe(15)
  })
})
