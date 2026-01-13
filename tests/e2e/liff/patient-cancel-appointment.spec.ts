// tests/e2e/liff/patient-cancel-appointment.spec.ts
// Feature: 病患取消預約
// API Endpoint: DELETE /api/patient/appointments/{appointmentId}

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import {
  createPatient,
  createDoctor,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createFirstVisitTreatment,
  createInternalMedicineTreatment,
} from '../factories'

// Feature-level Background
test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('取消預約時必須更新預約狀態為「已取消」', () => {
  test('取消預約後狀態變更', async ({ request }) => {
    // Given 系統中有一筆狀態為 booked 的預約
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'U1234567890abcdef',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 20,
    })
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: schedule.date,
      status: 'booked',
    })

    // When 病患取消預約
    const response = await request.delete(`/api/patient/appointments/${appointment.id}`)

    // Then 預約狀態變更為 cancelled
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.status).toBe('cancelled')

    // And 資料庫中的預約狀態也已更新
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment).not.toBeNull()
    expect(updatedAppointment?.status).toBe('cancelled')
  })
})

test.describe('取消預約時必須釋放時段分鐘數', () => {
  test('取消初診預約釋放 10 分鐘', async ({ request }) => {
    // Given 系統中有一筆初診預約，時段剩餘 15 分鐘
    const patient = await createPatient({
      name: '王小明',
      lineUserId: 'Utest001',
    })
    const doctor = await createDoctor({ name: '李醫師' })
    const treatmentType = await createFirstVisitTreatment() // 10 分鐘
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 15,
    })
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: schedule.date,
      status: 'booked',
    })

    // When 病患取消預約
    const response = await request.delete(`/api/patient/appointments/${appointment.id}`)

    // Then 時段剩餘分鐘數歸還為 25（15 + 10）
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot).not.toBeNull()
    expect(updatedTimeSlot?.remainingMinutes).toBe(25)
  })

  test('取消內科預約釋放 5 分鐘', async ({ request }) => {
    // Given 系統中有一筆內科預約，時段剩餘 20 分鐘
    const patient = await createPatient({
      name: '李小華',
      lineUserId: 'Utest002',
    })
    const doctor = await createDoctor({ name: '王醫師' })
    const treatmentType = await createInternalMedicineTreatment() // 5 分鐘
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 20,
    })
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: schedule.date,
      status: 'booked',
    })

    // When 病患取消預約
    const response = await request.delete(`/api/patient/appointments/${appointment.id}`)

    // Then 時段剩餘分鐘數歸還為 25（20 + 5）
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)

    const updatedTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: timeSlot.id },
    })
    expect(updatedTimeSlot).not.toBeNull()
    expect(updatedTimeSlot?.remainingMinutes).toBe(25)
  })
})

test.describe('取消成功後必須發送 LINE 通知', () => {
  test('取消預約發送通知訊息', async ({ request }) => {
    // Given 系統中有一筆預約，病患 LINE User ID 為 U1234567890abcdef
    const patient = await createPatient({
      name: '張小明',
      lineUserId: 'U1234567890abcdef',
    })
    const doctor = await createDoctor({ name: '陳醫師' })
    const treatmentType = await createFirstVisitTreatment()
    const schedule = await createSchedule({ doctorId: doctor.id })
    const timeSlot = await createTimeSlot({
      scheduleId: schedule.id,
      remainingMinutes: 20,
    })
    const appointment = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot.id,
      appointmentDate: schedule.date,
      status: 'booked',
    })

    // When 病患取消預約
    const response = await request.delete(`/api/patient/appointments/${appointment.id}`)

    // Then 系統發送 LINE 通知
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.notificationSent).toBe(true)
  })
})
