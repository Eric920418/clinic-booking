// tests/e2e/liff/view-appointments.spec.ts
import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import {
  createPatient,
  createDoctor,
  createTreatmentType,
  createSchedule,
  createTimeSlot,
} from '../factories'
import { createAppointment } from '../factories/appointment'

/**
 * Feature: 病患查看預約
 *   作為 病患
 *   為了 了解我的預約資訊
 *   我想要 查看預約詳情
 */

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe('系統必須顯示預約日期與時段', () => {
  // TODO: 待補充 Example
})

test.describe('系統必須顯示醫師姓名', () => {
  // TODO: 待補充 Example
})

test.describe('系統必須顯示診療類型', () => {
  // TODO: 待補充 Example
})

test.describe('系統必須顯示預約狀態', () => {
  test('顯示各種預約狀態', async ({ request }) => {
    // Given 病患有以下預約
    //   | appointment_date | status      |
    //   | 2026-01-15       | booked      |
    //   | 2026-01-16       | checked_in  |
    //   | 2026-01-17       | completed   |
    //   | 2026-01-18       | no_show     |
    //   | 2026-01-19       | cancelled   |
    const patient = await createPatient({
      name: '王小明',
      phone: '0912345678',
      nationalId: 'A123456789',
      lineUserId: 'U1234567890',
    })

    const doctor = await createDoctor({ name: '李醫師' })

    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })

    const appointmentData = [
      { date: new Date('2026-01-15'), status: 'booked' as const },
      { date: new Date('2026-01-16'), status: 'checked_in' as const },
      { date: new Date('2026-01-17'), status: 'completed' as const },
      { date: new Date('2026-01-18'), status: 'no_show' as const },
      { date: new Date('2026-01-19'), status: 'cancelled' as const },
    ]

    for (const { date, status } of appointmentData) {
      const schedule = await createSchedule({ doctorId: doctor.id, date })
      const timeSlot = await createTimeSlot({
        scheduleId: schedule.id,
        startTime: new Date('1970-01-01T09:00:00'),
        endTime: new Date('1970-01-01T09:30:00'),
        remainingMinutes: 30,
      })
      await createAppointment({
        patientId: patient.id,
        doctorId: doctor.id,
        treatmentTypeId: treatmentType.id,
        timeSlotId: timeSlot.id,
        appointmentDate: date,
        status,
      })
    }

    // When 病患查看預約列表
    const response = await request.get('/api/patient/appointments', {
      params: { lineUserId: patient.lineUserId! },
    })

    // Then 顯示預約狀態如下
    //   | appointment_date | status      | status_label |
    //   | 2026-01-15       | booked      | 已預約       |
    //   | 2026-01-16       | checked_in  | 已報到       |
    //   | 2026-01-17       | completed   | 已完成       |
    //   | 2026-01-18       | no_show     | 未報到       |
    //   | 2026-01-19       | cancelled   | 已取消       |
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(5)

    const expectedResults = [
      { appointmentDate: '2026-01-15', status: 'booked', statusLabel: '已預約' },
      { appointmentDate: '2026-01-16', status: 'checked_in', statusLabel: '已報到' },
      { appointmentDate: '2026-01-17', status: 'completed', statusLabel: '已完成' },
      { appointmentDate: '2026-01-18', status: 'no_show', statusLabel: '未報到' },
      { appointmentDate: '2026-01-19', status: 'cancelled', statusLabel: '已取消' },
    ]

    for (const expected of expectedResults) {
      const appointment = body.data.find((a: { appointmentDate: string }) =>
        a.appointmentDate.startsWith(expected.appointmentDate)
      )
      expect(appointment).toBeDefined()
      expect(appointment.status).toBe(expected.status)
      expect(appointment.statusLabel).toBe(expected.statusLabel)
    }
  })
})

test.describe('系統必須顯示預約建立時間', () => {
  // TODO: 待補充 Example
})
