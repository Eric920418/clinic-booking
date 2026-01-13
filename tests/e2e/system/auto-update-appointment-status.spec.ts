// tests/e2e/system/auto-update-appointment-status.spec.ts
// Feature: 預約狀態自動更新
// 作為 系統
// 為了 自動管理預約狀態
// 我想要 在時段結束後自動將未報到的預約更新狀態

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import {
  createPatient,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createCheckedInAppointment,
  createDoctorTreatment,
} from '../factories'
import { prisma } from '../helpers/db'
import type { APIResponse } from '@playwright/test'

// 測試上下文類型定義
interface TestContext {
  patientId?: string
  doctorId?: string
  treatmentTypeId?: string
  scheduleId?: string
  timeSlotId?: string
  appointmentId?: string
  lastResponse?: APIResponse
}

// 測試上下文，用於在步驟間傳遞資料
let context: TestContext = {}

// Feature-level Background: 清空資料庫，確保測試隔離
test.beforeEach(async () => {
  await cleanupDatabase()
  context = {}
})

test.describe('當日預約時段結束後「已預約」狀態自動改為「未報到」', () => {
  /**
   * Rule: 當日預約時段結束後「已預約」狀態自動改為「未報到」
   */

  test('時段結束後未報到自動更新狀態', async ({ request }) => {
    // Given 準備基礎資料
    const patient = await createPatient({
      name: '王小明',
      noShowCount: 0,
    })
    context.patientId = patient.id

    const doctor = await createDoctor({
      name: '李醫師',
      isActive: true,
    })
    context.doctorId = doctor.id

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context.treatmentTypeId = treatmentType.id

    // 建立醫師診療項目關聯
    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    // Given 預約日期為 "2026-01-15"
    const appointmentDate = new Date('2026-01-15')

    // 建立班表
    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })
    context.scheduleId = schedule.id

    // Given 預約時段結束時間為 "10:00"
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:30:00'),
      endTime: new Date('1970-01-01T10:00:00'),
      remainingMinutes: 25, // 已扣除 5 分鐘
    })
    context.timeSlotId = timeSlot.id

    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })
    context.appointmentId = appointment.id

    // When 系統執行自動狀態更新
    // And 當前時間為 "2026-01-15 10:01"（時段結束後 1 分鐘）
    const response = await request.post('/api/system/auto-update-status', {
      data: {
        currentTime: '2026-01-15T10:01:00',
      },
    })
    context.lastResponse = response

    // Then 預約狀態為 "no_show"
    // 驗證 API 回應
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.processedCount).toBeGreaterThanOrEqual(1)

    // 驗證資料庫中的預約狀態
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: context.appointmentId },
    })
    expect(updatedAppointment).not.toBeNull()
    expect(updatedAppointment?.status).toBe('no_show')
  })

  test('已報到狀態不會被更新為未報到', async ({ request }) => {
    // Given 準備基礎資料
    const patient = await createPatient({
      name: '王小明',
      noShowCount: 0,
    })
    context.patientId = patient.id

    const doctor = await createDoctor({
      name: '李醫師',
      isActive: true,
    })
    context.doctorId = doctor.id

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context.treatmentTypeId = treatmentType.id

    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    // Given 預約日期為 "2026-01-15"
    const appointmentDate = new Date('2026-01-15')

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })
    context.scheduleId = schedule.id

    // Given 預約時段結束時間為 "10:00"
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:30:00'),
      endTime: new Date('1970-01-01T10:00:00'),
      remainingMinutes: 25,
    })
    context.timeSlotId = timeSlot.id

    // Given 預約狀態為 "checked_in"
    const appointment = await createCheckedInAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
    })
    context.appointmentId = appointment.id

    // When 系統執行自動狀態更新
    // And 當前時間為 "2026-01-15 10:01"
    const response = await request.post('/api/system/auto-update-status', {
      data: {
        currentTime: '2026-01-15T10:01:00',
      },
    })
    context.lastResponse = response

    // Then 預約狀態為 "checked_in"（未被更新）
    expect(response.ok()).toBeTruthy()

    // 驗證資料庫中的預約狀態仍為 checked_in
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: context.appointmentId },
    })
    expect(updatedAppointment).not.toBeNull()
    expect(updatedAppointment?.status).toBe('checked_in')
  })
})

test.describe('未報到時病患的未報到次數加 1', () => {
  /**
   * Rule: 未報到時病患的未報到次數加 1
   */

  test('狀態改為未報到時累計次數', async ({ request }) => {
    // Given 病患未報到次數為 1
    const patient = await createPatient({
      name: '王小明',
      noShowCount: 1,
    })
    context.patientId = patient.id

    const doctor = await createDoctor({
      name: '李醫師',
      isActive: true,
    })

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })

    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-15')

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:30:00'),
      endTime: new Date('1970-01-01T10:00:00'),
      remainingMinutes: 25,
    })

    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })
    context.appointmentId = appointment.id

    // When 系統自動將預約狀態更新為 "no_show"
    const response = await request.post('/api/system/auto-update-status', {
      data: {
        currentTime: '2026-01-15T10:01:00',
      },
    })

    // Then 未報到次數為 2
    expect(response.ok()).toBeTruthy()

    // 驗證資料庫中的病患未報到次數
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: context.patientId },
    })
    expect(updatedPatient).not.toBeNull()
    expect(updatedPatient?.noShowCount).toBe(2)
  })
})

test.describe('未報到次數達到 3 次後停止累計', () => {
  /**
   * Rule: 未報到次數達到 3 次後停止累計
   */

  test('未報到次數達到 3 次後不再增加', async ({ request }) => {
    // Given 病患未報到次數為 3（已達上限）
    const patient = await createPatient({
      name: '王小明',
      noShowCount: 3,
    })
    context.patientId = patient.id

    const doctor = await createDoctor({
      name: '李醫師',
      isActive: true,
    })

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })

    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-15')

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:30:00'),
      endTime: new Date('1970-01-01T10:00:00'),
      remainingMinutes: 25,
    })

    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })
    context.appointmentId = appointment.id

    // When 系統自動將預約狀態更新為 "no_show"
    const response = await request.post('/api/system/auto-update-status', {
      data: {
        currentTime: '2026-01-15T10:01:00',
      },
    })

    // Then 未報到次數為 3（未增加，已達上限）
    expect(response.ok()).toBeTruthy()

    // 驗證資料庫中的病患未報到次數仍為 3
    const updatedPatient = await prisma.patient.findUnique({
      where: { id: context.patientId },
    })
    expect(updatedPatient).not.toBeNull()
    expect(updatedPatient?.noShowCount).toBe(3)
  })
})

test.describe('黑名單狀態由批次任務檢查更新', () => {
  /**
   * Rule: 黑名單狀態由批次任務檢查更新
   */

  test('未報到次數更新後不立即設定黑名單', async ({ request }) => {
    // Given 病患未報到次數為 2，isBlacklisted 為 false
    const patient = await createPatient({
      name: '王小明',
      noShowCount: 2,
      isBlacklisted: false,
    })
    context.patientId = patient.id

    const doctor = await createDoctor({
      name: '李醫師',
      isActive: true,
    })

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })

    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    const appointmentDate = new Date('2026-01-15')

    const schedule = await createSchedule({
      doctorId: doctor.id,
      date: appointmentDate,
    })

    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      startTime: new Date('1970-01-01T09:30:00'),
      endTime: new Date('1970-01-01T10:00:00'),
      remainingMinutes: 25,
    })

    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: appointmentDate,
      status: 'booked',
    })
    context.appointmentId = appointment.id

    // When 系統自動將預約狀態更新為 "no_show"
    const response = await request.post('/api/system/auto-update-status', {
      data: {
        currentTime: '2026-01-15T10:01:00',
      },
    })

    // Then 未報到次數為 3
    expect(response.ok()).toBeTruthy()

    const updatedPatient = await prisma.patient.findUnique({
      where: { id: context.patientId },
    })
    expect(updatedPatient).not.toBeNull()
    expect(updatedPatient?.noShowCount).toBe(3)

    // And 病患狀態 is_blacklisted 為 false（黑名單由獨立批次任務處理）
    expect(updatedPatient?.isBlacklisted).toBe(false)
  })
})
