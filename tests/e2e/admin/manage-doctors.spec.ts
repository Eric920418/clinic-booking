// tests/e2e/admin/manage-doctors.spec.ts
// Feature: 管理醫師資料
// 生成來源: spec/features/管理醫師資料.feature

import { test, expect } from '@playwright/test'
import { cleanupDatabase } from '../helpers/cleanup'
import { prisma } from '../helpers/db'
import { loginAsAdmin, withAuth, withAuthAndData } from '../helpers/auth'
import {
  createDoctor,
  createTreatmentType,
  createPatient,
  createSchedule,
  createTimeSlot,
  createAppointment,
  createAdminUser,
  createCompletedAppointment,
} from '../factories'
import { createDoctorTreatment } from '../factories/doctor-treatment'

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

test.describe('可新增醫師', () => {
  /**
   * Rule: 可新增醫師
   * 驗證：姓名 2-20 字元，預設啟用
   */

  test('新增醫師成功', async ({ request }) => {
    // Given 醫師姓名為 "王大明"
    const doctorName = '王大明'

    // When 管理員新增醫師
    const response = await request.post(
      '/api/admin/doctors',
      withAuthAndData(context['adminToken'] as string, {
        name: doctorName,
      })
    )

    // Then 醫師建立成功
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe(doctorName)

    // And 醫師狀態為啟用
    expect(body.data.isActive).toBe(true)

    // 驗證資料庫
    const doctor = await prisma.doctor.findUnique({
      where: { id: body.data.id },
    })
    expect(doctor).not.toBeNull()
    expect(doctor?.name).toBe(doctorName)
    expect(doctor?.isActive).toBe(true)
  })

  test('醫師姓名不可少於 2 字元', async ({ request }) => {
    // Given 醫師姓名為 "王"（1 字元）
    const doctorName = '王'

    // When 管理員新增醫師
    const response = await request.post(
      '/api/admin/doctors',
      withAuthAndData(context['adminToken'] as string, {
        name: doctorName,
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('醫師姓名不可超過 20 字元', async ({ request }) => {
    // Given 醫師姓名為 21 字元
    const doctorName = '一二三四五六七八九十一二三四五六七八九十一' // 21 字元

    // When 管理員新增醫師
    const response = await request.post(
      '/api/admin/doctors',
      withAuthAndData(context['adminToken'] as string, {
        name: doctorName,
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('可編輯醫師姓名', () => {
  /**
   * Rule: 可編輯醫師姓名
   * 驗證：姓名 2-20 字元
   */

  test('編輯醫師姓名成功', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    // And 醫師原姓名為 "王大明"
    const doctor = await createDoctor({
      name: '王大明',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // When 管理員將醫師姓名修改為 "王小明"
    const newName = '王小明'
    const response = await request.put(
      `/api/admin/doctors/${doctor.id}`,
      withAuthAndData(context['adminToken'] as string, {
        name: newName,
      })
    )

    // Then 醫師姓名更新為 "王小明"
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.name).toBe(newName)

    // 驗證資料庫
    const updatedDoctor = await prisma.doctor.findUnique({
      where: { id: doctor.id },
    })
    expect(updatedDoctor?.name).toBe(newName)
  })

  test('編輯醫師姓名不可少於 2 字元', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '王大明',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // When 管理員將醫師姓名修改為 "王"（1 字元）
    const response = await request.put(
      `/api/admin/doctors/${doctor.id}`,
      withAuthAndData(context['adminToken'] as string, {
        name: '王',
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })

  test('編輯醫師姓名不可超過 20 字元', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '王大明',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // When 管理員將醫師姓名修改為 21 字元
    const response = await request.put(
      `/api/admin/doctors/${doctor.id}`,
      withAuthAndData(context['adminToken'] as string, {
        name: '一二三四五六七八九十一二三四五六七八九十一', // 21 字元
      })
    )

    // Then 操作失敗
    expect(response.ok()).toBeFalsy()
    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
  })
})

test.describe('可設定醫師可看診項目', () => {
  /**
   * Rule: 可設定醫師可看診項目
   */

  test('為醫師新增可看診項目', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '測試醫師',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // And 診療類型 ID 為 "treatment456"
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 該醫師尚未關聯此診療類型（資料庫已清空）

    // When 管理員新增醫師診療項目
    const response = await request.post(
      `/api/admin/doctors/${context['doctorId']}/treatments`,
      withAuthAndData(context['adminToken'] as string, {
        treatmentTypeId: context['treatmentTypeId'],
      })
    )
    context['lastResponse'] = response

    // Then 醫師診療項目關聯被建立
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // 驗證資料庫中關聯已建立
    const doctorTreatment = await prisma.doctorTreatment.findFirst({
      where: {
        doctorId: context['doctorId'] as string,
        treatmentTypeId: context['treatmentTypeId'] as string,
      },
    })
    expect(doctorTreatment).not.toBeNull()
  })

  test('相同醫師不可重複關聯相同診療項目', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '測試醫師',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // And 診療類型 ID 為 "treatment456"
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context['treatmentTypeId'] = treatmentType.id

    // And 該醫師已關聯此診療類型
    await createDoctorTreatment({
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
    })

    // When 管理員新增醫師診療項目
    const response = await request.post(
      `/api/admin/doctors/${context['doctorId']}/treatments`,
      withAuthAndData(context['adminToken'] as string, {
        treatmentTypeId: context['treatmentTypeId'],
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

test.describe('可停用醫師', () => {
  /**
   * Rule: 可停用醫師
   */

  test('停用醫師後狀態更新', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    // And 醫師狀態為啟用
    const doctor = await createDoctor({
      name: '測試醫師',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // When 管理員停用醫師
    const response = await request.post(
      `/api/admin/doctors/${context['doctorId']}/disable`,
      withAuth(context['adminToken'] as string)
    )
    context['lastResponse'] = response

    // Then 醫師狀態為停用
    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    expect(body.success).toBe(true)

    // 驗證資料庫中醫師狀態
    const updatedDoctor = await prisma.doctor.findUnique({
      where: { id: context['doctorId'] as string },
    })
    expect(updatedDoctor?.isActive).toBe(false)
  })
})

test.describe('停用醫師時自動取消所有未來預約並通知病患', () => {
  /**
   * Rule: 停用醫師時自動取消所有未來預約並通知病患
   */

  test('停用醫師時取消未來預約', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '測試醫師',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // And 該醫師有以下未來預約
    //   | appointment_id | appointment_date | patient_line_user_id |
    //   | appt1          | 2026-01-20       | U1111111111111111    |
    //   | appt2          | 2026-01-25       | U2222222222222222    |

    // 建立前置資料：診療類型
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context['treatmentTypeId'] = treatmentType.id

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

    // 建立預約 1（appt1）
    const appointment1 = await createAppointment({
      patientId: patient1.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot1.id,
      appointmentDate: new Date('2026-01-20'),
      status: 'booked',
    })
    context['appointment1Id'] = appointment1.id

    // 建立預約 2（appt2）
    const appointment2 = await createAppointment({
      patientId: patient2.id,
      doctorId: doctor.id,
      treatmentTypeId: treatmentType.id,
      timeSlotId: timeSlot2.id,
      appointmentDate: new Date('2026-01-25'),
      status: 'booked',
    })
    context['appointment2Id'] = appointment2.id

    // When 管理員停用醫師
    const response = await request.post(
      `/api/admin/doctors/${context['doctorId']}/disable`,
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
    expect(body.data.notifiedPatients).toBeDefined()
    expect(body.data.notifiedPatients).toContain('U1111111111111111')
    expect(body.data.notifiedPatients).toContain('U2222222222222222')
  })

  test('停用醫師時已完成的預約不受影響', async ({ request }) => {
    // Given 醫師 ID 為 "doctor123"
    const doctor = await createDoctor({
      name: '測試醫師',
      isActive: true,
    })
    context['doctorId'] = doctor.id

    // 建立前置資料：診療類型
    const treatmentType = await createTreatmentType({
      name: '針灸',
      durationMinutes: 5,
    })
    context['treatmentTypeId'] = treatmentType.id

    // 建立前置資料：病患
    const patient = await createPatient({
      name: '測試病患',
      lineUserId: 'U3333333333333333',
    })
    context['patientId'] = patient.id

    // And 該醫師有以下預約
    //   | appointment_id | appointment_date | status    |
    //   | appt1          | 2026-01-10       | completed |
    //   | appt2          | 2026-01-20       | booked    |

    // 建立前置資料：班表和時段（2026-01-10，已完成的預約）
    const schedule1 = await createSchedule({
      doctorId: doctor.id,
      date: new Date('2026-01-10'),
    })
    const timeSlot1 = await createTimeSlot({
      scheduleId: schedule1.id,
      startTime: new Date('1970-01-01T09:00:00'),
      endTime: new Date('1970-01-01T09:30:00'),
    })

    // 建立前置資料：班表和時段（2026-01-20，未來 booked 的預約）
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

    // When 管理員停用醫師
    const response = await request.post(
      `/api/admin/doctors/${context['doctorId']}/disable`,
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
