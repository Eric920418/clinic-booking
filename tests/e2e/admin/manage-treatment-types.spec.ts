// tests/e2e/admin/manage-treatment-types.spec.ts
// Feature: 管理診療類型
// 生成來源: spec/features/管理診療類型.feature

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { loginAsAdmin, withAuth, withAuthAndData } from '../helpers/auth'
import {
  createTreatmentType,
  createFirstVisitTreatment,
  createPatient,
  createDoctor,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createAdminUser,
  createCompletedAppointment,
} from '../factories'

// 測試上下文，用於在步驟間傳遞資料
let context: Record<string, unknown> = {}

// Feature-level Background
test.beforeEach(async ({ request }) => {
  // 清空資料庫，確保測試隔離
  await cleanupDatabase()
  context = {}

  // 建立管理員帳號並登入
  const admin = await createAdminUser({
    email: 'admin@clinic.com',
    password: 'Admin123',
  })
  context['adminId'] = admin.id

  const token = await loginAsAdmin(request, 'admin@clinic.com', 'Admin123')
  context['adminToken'] = token
})

test.describe('可新增診療類型', () => {
  /**
   * Rule: 可新增診療類型
   * 狀態: #TODO - Feature File 尚未定義完整 Example
   */

  test.skip('新增診療類型', async () => {
    // TODO: Feature File 尚未定義此 Rule 的 Example
    // 待 Feature File 補充後實作
  })
})

test.describe('可修改診療類型的扣除分鐘數', () => {
  /**
   * Rule: 可修改診療類型的扣除分鐘數
   */

  test('修改初診所需分鐘數', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
    // And 診療類型名稱為 "初診"
    // And 原扣除分鐘數為 10
        const treatmentType = await createFirstVisitTreatment({
      durationMinutes: 10,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 管理員輸入新扣除分鐘數為 15
    context['newDurationMinutes'] = 15

    // When 管理員修改診療類型
        const response = await request.put(
      `/api/admin/treatments/${context['treatmentTypeId']}`,
      withAuthAndData(context['adminToken'] as string, {
        durationMinutes: context['newDurationMinutes'],
      })
    )
    context['lastResponse'] = response

    // Then 診療類型的扣除分鐘數為 15
        expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

        const updatedTreatmentType = await prisma.treatmentType.findUnique({
      where: { id: context['treatmentTypeId'] as string },
    })
    expect(updatedTreatmentType?.durationMinutes).toBe(15)
  })
})

test.describe('扣除分鐘數必須大於 0', () => {
  /**
   * Rule: 扣除分鐘數必須大於 0
   */

  test('扣除分鐘數為 0 無效', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 管理員輸入新扣除分鐘數為 0
    context['newDurationMinutes'] = 0

    // When 管理員修改診療類型
        const response = await request.put(
      `/api/admin/treatments/${context['treatmentTypeId']}`,
      withAuthAndData(context['adminToken'] as string, {
        durationMinutes: context['newDurationMinutes'],
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
        expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })

  test('扣除分鐘數為負數無效', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 管理員輸入新扣除分鐘數為 -5
    context['newDurationMinutes'] = -5

    // When 管理員修改診療類型
        const response = await request.put(
      `/api/admin/treatments/${context['treatmentTypeId']}`,
      withAuthAndData(context['adminToken'] as string, {
        durationMinutes: context['newDurationMinutes'],
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
        expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('扣除分鐘數不可超過 30 分鐘（單一時段長度）', () => {
  /**
   * Rule: 扣除分鐘數不可超過 30 分鐘（單一時段長度）
   */

  test('扣除分鐘數為 30 分鐘有效', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 管理員輸入新扣除分鐘數為 30
    context['newDurationMinutes'] = 30

    // When 管理員修改診療類型
        const response = await request.put(
      `/api/admin/treatments/${context['treatmentTypeId']}`,
      withAuthAndData(context['adminToken'] as string, {
        durationMinutes: context['newDurationMinutes'],
      })
    )
    context['lastResponse'] = response

    // Then 診療類型的扣除分鐘數為 30
        expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

        const updatedTreatmentType = await prisma.treatmentType.findUnique({
      where: { id: context['treatmentTypeId'] as string },
    })
    expect(updatedTreatmentType?.durationMinutes).toBe(30)
  })

  test('扣除分鐘數超過 30 分鐘無效', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 管理員輸入新扣除分鐘數為 35
    context['newDurationMinutes'] = 35

    // When 管理員修改診療類型
        const response = await request.put(
      `/api/admin/treatments/${context['treatmentTypeId']}`,
      withAuthAndData(context['adminToken'] as string, {
        durationMinutes: context['newDurationMinutes'],
      })
    )
    context['lastResponse'] = response

    // Then 操作失敗
        expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
  })
})

test.describe('可停用診療類型', () => {
  /**
   * Rule: 可停用診療類型
   */

  test('停用診療類型後狀態更新', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
    // And 診療類型狀態為啟用
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
      isActive: true,
    })
    context['treatmentTypeId'] = treatmentType.id

    // When 管理員停用診療類型
        const response = await request.post(
      `/api/admin/treatments/${context['treatmentTypeId']}/disable`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 診療類型狀態為停用
        expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

        const updatedTreatmentType = await prisma.treatmentType.findUnique({
      where: { id: context['treatmentTypeId'] as string },
    })
    expect(updatedTreatmentType?.isActive).toBe(false)
  })
})

test.describe('停用診療類型時自動取消所有使用此類型的未來預約並通知病患', () => {
  /**
   * Rule: 停用診療類型時自動取消所有使用此類型的未來預約並通知病患
   */

  test('停用診療類型時取消相關未來預約', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
      isActive: true,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 使用此診療類型的未來預約有
    //   | appointment_id | appointment_date | patient_line_user_id |
    //   | appt1          | 2026-01-20       | U1111111111111111    |
    //   | appt2          | 2026-01-25       | U2222222222222222    |
    
    // 建立前置資料：病患 1
    const patient1 = await createPatient({
      name: '病患一',
      lineUserId: 'U1111111111111111',
    })
    context['patient1Id'] = patient1.id

    // 建立前置資料：病患 2
    const patient2 = await createPatient({
      name: '病患二',
      lineUserId: 'U2222222222222222',
    })
    context['patient2Id'] = patient2.id

    // 建立前置資料：醫師
    const doctor = await createDoctor({ name: '測試醫師' })
    context['doctorId'] = doctor.id

    // 建立前置資料：班表和時段（2026-01-20）
    const schedule1 = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-20'),
    })
    const timeSlot1 = await createTimeSlot({
      scheduleId: schedule1.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })
    context['timeSlot1Id'] = timeSlot1.id

    // 建立前置資料：班表和時段（2026-01-25）
    const schedule2 = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-25'),
    })
    const timeSlot2 = await createTimeSlot({
      scheduleId: schedule2.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })
    context['timeSlot2Id'] = timeSlot2.id

    // 建立預約 1
    const appointment1 = await createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot1.id,
      appointmentDate: new Date('2026-01-20'),
      status: 'booked',
    })
    context['appointment1Id'] = appointment1.id

    // 建立預約 2
    const appointment2 = await createAppointment({
      patientId: patient2.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot2.id,
      appointmentDate: new Date('2026-01-25'),
      status: 'booked',
    })
    context['appointment2Id'] = appointment2.id

    // When 管理員停用診療類型
        const response = await request.post(
      `/api/admin/treatments/${context['treatmentTypeId']}/disable`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 操作成功
        expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 預約 "appt1" 狀態為 "cancelled"
        const updatedAppointment1 = await prisma.appointment.findUnique({
      where: { id: context['appointment1Id'] as string },
    })
    expect(updatedAppointment1?.status).toBe('cancelled')

    // And 預約 "appt2" 狀態為 "cancelled"
        const updatedAppointment2 = await prisma.appointment.findUnique({
      where: { id: context['appointment2Id'] as string },
    })
    expect(updatedAppointment2?.status).toBe('cancelled')

    // And LINE 訊息發送至 "U1111111111111111"
    // And LINE 訊息發送至 "U2222222222222222"
        // 驗證 API 回應中包含已通知的病患列表
    expect(body.data.notifiedPatients).toBeDefined()
    expect(body.data.notifiedPatients).toContain('U1111111111111111')
    expect(body.data.notifiedPatients).toContain('U2222222222222222')
  })

  test('停用診療類型時已完成的預約不受影響', async ({ request }) => {
    // Given 診療類型 ID 為 "treatment123"
        const treatmentType = await createTreatmentType({
      name: '測試診療',
      durationMinutes: 10,
      isActive: true,
    })
    context['treatmentTypeId'] = treatmentType.id

    // 建立前置資料：病患
    const patient = await createPatient({
      name: '測試病患',
      lineUserId: 'U3333333333333333',
    })
    context['patientId'] = patient.id

    // 建立前置資料：醫師
    const doctor = await createDoctor({ name: '測試醫師' })
    context['doctorId'] = doctor.id

    // And 使用此診療類型的預約有
    //   | appointment_id | appointment_date | status    |
    //   | appt1          | 2026-01-10       | completed |
    //   | appt2          | 2026-01-20       | booked    |

    // 建立前置資料：班表和時段（2026-01-10，過去日期，已完成的預約）
    const schedule1 = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-10'),
    })
    const timeSlot1 = await createTimeSlot({
      scheduleId: schedule1.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })

    // 建立前置資料：班表和時段（2026-01-20，未來日期，booked 的預約）
    const schedule2 = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-20'),
    })
    const timeSlot2 = await createTimeSlot({
      scheduleId: schedule2.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })

    // 建立已完成的預約（appt1）
    const appointment1 = await createCompletedAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot1.id,
      appointmentDate: new Date('2026-01-10'),
    })
    context['appointment1Id'] = appointment1.id

    // 建立未來的 booked 預約（appt2）
    const appointment2 = await createAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot2.id,
      appointmentDate: new Date('2026-01-20'),
      status: 'booked',
    })
    context['appointment2Id'] = appointment2.id

    // When 管理員停用診療類型
        const response = await request.post(
      `/api/admin/treatments/${context['treatmentTypeId']}/disable`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 操作成功
        expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // And 預約 "appt1" 狀態為 "completed"（已完成的預約不受影響）
        const updatedAppointment1 = await prisma.appointment.findUnique({
      where: { id: context['appointment1Id'] as string },
    })
    expect(updatedAppointment1?.status).toBe('completed')

    // And 預約 "appt2" 狀態為 "cancelled"（未來的 booked 預約被取消）
        const updatedAppointment2 = await prisma.appointment.findUnique({
      where: { id: context['appointment2Id'] as string },
    })
    expect(updatedAppointment2?.status).toBe('cancelled')
  })
})
