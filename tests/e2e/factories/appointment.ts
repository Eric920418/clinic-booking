// tests/e2e/factories/appointment.ts
// 預約測試資料工廠

import { AppointmentStatus } from '@prisma/client'
import { prisma } from '../helpers/db'

interface AppointmentData {
  patientId: string
  doctorId: string
  treatmentTypeId: string
  timeSlotId: string
  appointmentDate: Date
  status?: AppointmentStatus
  cancelledReason?: string | null
  cancelledBy?: string | null
}

/**
 * 創建測試預約
 */
export async function createAppointment(data: AppointmentData) {
  return prisma.appointment.create({
    data: {
      patientId: data.patientId,
      doctorId: data.doctorId,
      treatmentTypeId: data.treatmentTypeId,
      timeSlotId: data.timeSlotId,
      appointmentDate: data.appointmentDate,
      status: data.status ?? 'booked',
      cancelledReason: data.cancelledReason ?? null,
      cancelledBy: data.cancelledBy ?? null,
    },
  })
}

/**
 * 創建已報到的預約
 */
export async function createCheckedInAppointment(data: AppointmentData) {
  return createAppointment({
    ...data,
    status: 'checked_in',
  })
}

/**
 * 創建已完成的預約
 */
export async function createCompletedAppointment(data: AppointmentData) {
  return createAppointment({
    ...data,
    status: 'completed',
  })
}

/**
 * 創建未報到的預約
 */
export async function createNoShowAppointment(data: AppointmentData) {
  return createAppointment({
    ...data,
    status: 'no_show',
  })
}

/**
 * 創建已取消的預約
 */
export async function createCancelledAppointment(
  data: AppointmentData & { cancelledReason?: string; cancelledBy?: string }
) {
  return createAppointment({
    ...data,
    status: 'cancelled',
    cancelledReason: data.cancelledReason ?? '病患取消',
    cancelledBy: data.cancelledBy ?? null,
  })
}
