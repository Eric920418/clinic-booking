// tests/e2e/factories/time-slot.ts
// 時段測試資料工廠

import { prisma } from '../helpers/db'

interface TimeSlotData {
  scheduleId: string
  startTime?: Date
  endTime?: Date
  totalMinutes?: number
  remainingMinutes?: number
}

/**
 * 創建測試時段
 */
export async function createTimeSlot(data: TimeSlotData) {
  // 使用 1970-01-01 作為時間基準（只取時間部分）
  const defaultStartTime = new Date('1970-01-01T09:00:00')
  const defaultEndTime = new Date('1970-01-01T09:30:00')

  return prisma.timeSlot.create({
    data: {
      scheduleId: data.scheduleId,
      startTime: data.startTime ?? defaultStartTime,
      endTime: data.endTime ?? defaultEndTime,
      totalMinutes: data.totalMinutes ?? 30,
      remainingMinutes: data.remainingMinutes ?? 30,
    },
  })
}

/**
 * 創建已滿時段（剩餘分鐘數為 0）
 */
export async function createFullTimeSlot(data: TimeSlotData) {
  return createTimeSlot({
    ...data,
    remainingMinutes: 0,
  })
}

/**
 * 創建多個連續時段
 */
export async function createTimeSlots(
  scheduleId: string,
  slots: Array<{ startHour: number; startMinute: number; remainingMinutes?: number }>
) {
  const results = []

  for (const slot of slots) {
    const startTime = new Date(`1970-01-01T${String(slot.startHour).padStart(2, '0')}:${String(slot.startMinute).padStart(2, '0')}:00`)
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000) // +30 分鐘

    const timeSlot = await createTimeSlot({
      scheduleId,
      startTime,
      endTime,
      remainingMinutes: slot.remainingMinutes ?? 30,
    })
    results.push(timeSlot)
  }

  return results
}
