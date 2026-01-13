// tests/e2e/admin/update-appointment-status.spec.ts
/**
 * Feature: 管理員更新預約狀態
 *
 * 作為 管理員
 * 為了 記錄病患的報到與看診狀態
 * 我想要 更新預約狀態
 *
 * API: PATCH /api/admin/appointments/{appointmentId}/status
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
  createAdminUser,
  createInternalMedicineTreatment,
} from '../factories'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, unknown> = {}

// Feature-level Background
test.beforeEach(async ({ request }) => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // Given 準備一個管理員帳號並登入
  const admin = await createAdminUser({
    email: 'admin@example.com',
    password: 'Password123',
  })
  context['adminId'] = admin.id

  const token = await loginAsAdmin(request, 'admin@example.com', 'Password123')
  context['adminToken'] = token

  // And 準備病患、醫師、班表、時段、診療類型
  const patient = await createPatient({
    name: '王小明',
    phone: '0912345678',
    nationalId: 'A123456789',
  })
  context['patientId'] = patient.id

  const doctor = await createDoctor({
    name: '李醫師',
  })
  context['doctorId'] = doctor.id

  const schedule = await createSchedule({
    doctorId: doctor.id,
    date: new Date('2024-01-15'),
  })
  context['scheduleId'] = schedule.id

  const timeSlot = await createTimeSlot({
    scheduleId: schedule.id,
    startTime: new Date('1970-01-01T09:00:00'),
    endTime: new Date('1970-01-01T09:30:00'),
    remainingMinutes: 30,
  })
  context['timeSlotId'] = timeSlot.id

  const treatmentType = await createInternalMedicineTreatment()
  context['treatmentTypeId'] = treatmentType.id
})

test.describe('已預約狀態可更新為已報到', () => {
  test('更新為已報到', async ({ request }) => {
    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })

    // When 管理員更新預約狀態為 "checked_in"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'checked_in',
      })
    )

    // Then 預約狀態為 "checked_in"
    expect(response.ok()).toBeTruthy()
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment?.status).toBe('checked_in')
  })
})

test.describe('已報到狀態可更新為已完成', () => {
  test('更新為已完成', async ({ request }) => {
    // Given 預約狀態為 "checked_in"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'checked_in',
    })

    // When 管理員更新預約狀態為 "completed"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'completed',
      })
    )

    // Then 預約狀態為 "completed"
    expect(response.ok()).toBeTruthy()
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment?.status).toBe('completed')
  })
})

test.describe('已預約狀態不可直接更新為已完成', () => {
  test('未報到直接完成應失敗', async ({ request }) => {
    // Given 預約狀態為 "booked"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'booked',
    })

    // When 管理員更新預約狀態為 "completed"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'completed',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('已完成狀態不可變更', () => {
  test('已完成預約無法變更狀態', async ({ request }) => {
    // Given 預約狀態為 "completed"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'completed',
    })

    // When 管理員更新預約狀態為 "booked"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'booked',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('已取消狀態不可變更', () => {
  test('已取消預約無法變更狀態', async ({ request }) => {
    // Given 預約狀態為 "cancelled"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'cancelled',
      cancelledReason: '病患取消',
    })

    // When 管理員更新預約狀態為 "booked"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'booked',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('未報到狀態可改為已報到（補報到）', () => {
  test('未報到可補改為已報到', async ({ request }) => {
    // Given 預約狀態為 "no_show"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'no_show',
    })

    // When 管理員更新預約狀態為 "checked_in"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'checked_in',
      })
    )

    // Then 預約狀態為 "checked_in"
    expect(response.ok()).toBeTruthy()
    const updatedAppointment = await prisma.appointment.findUnique({
      where: { id: appointment.id },
    })
    expect(updatedAppointment?.status).toBe('checked_in')
  })

  test('未報到無法改為已預約', async ({ request }) => {
    // Given 預約狀態為 "no_show"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'no_show',
    })

    // When 管理員更新預約狀態為 "booked"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'booked',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('未報到無法改為已完成', async ({ request }) => {
    // Given 預約狀態為 "no_show"
    const appointment = await createAppointment({
      patientId: context['patientId'] as string,
      doctorId: context['doctorId'] as string,
      treatmentTypeId: context['treatmentTypeId'] as string,
      timeSlotId: context['timeSlotId'] as string,
      appointmentDate: new Date('2024-01-15'),
      status: 'no_show',
    })

    // When 管理員更新預約狀態為 "completed"
    const response = await request.patch(
      `/api/admin/appointments/${appointment.id}/status`,
      withAuthAndData(context['adminToken'] as string, {
        status: 'completed',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})
