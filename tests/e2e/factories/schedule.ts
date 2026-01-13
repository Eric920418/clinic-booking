// tests/e2e/factories/schedule.ts
// 班表測試資料工廠

import { prisma } from '../helpers/db'

interface ScheduleData {
  doctorId: string
  date?: Date
  isAvailable?: boolean
}

/**
 * 創建測試班表
 */
export async function createSchedule(data: ScheduleData) {
  // 預設日期為明天（確保是未來日期）
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  return prisma.schedule.create({
    data: {
      doctorId: data.doctorId,
      date: data.date ?? tomorrow,
      isAvailable: data.isAvailable ?? true,
    },
  })
}

/**
 * 創建停診班表
 */
export async function createSuspendedSchedule(data: ScheduleData) {
  return createSchedule({
    ...data,
    isAvailable: false,
  })
}
