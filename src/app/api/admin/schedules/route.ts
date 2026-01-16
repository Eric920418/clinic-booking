/**
 * 班表管理 API
 * 對應規格：spec/features/管理班表.feature
 *
 * POST /api/admin/schedules - 建立班表
 * GET /api/admin/schedules - 查詢班表列表
 *
 * Rule: 同一醫師在同一日期只能有一筆班表
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

// 時段類型對應的時間範圍
const TIME_SLOT_CONFIGS = {
  morning: { startHour: 9, startMinute: 0, endHour: 12, endMinute: 30 },    // 早班：09:00-12:30
  afternoon: { startHour: 14, startMinute: 0, endHour: 17, endMinute: 30 }, // 午班：14:00-17:30
  evening: { startHour: 18, startMinute: 0, endHour: 21, endMinute: 0 },    // 晚班：18:00-21:00
} as const;

// 每個時段的分鐘數（預設 30 分鐘一個時段）
const SLOT_DURATION_MINUTES = 30;

// =============================================
// POST: 建立班表
// Rule: 同一醫師在同一日期只能有一筆班表
// =============================================
const createScheduleSchema = z.object({
  doctorId: z.string().min(1, '請選擇醫師'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須為 YYYY-MM-DD'),
  timeSlotType: z.enum(['morning', 'afternoon', 'evening']).default('morning'),
})

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createScheduleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { doctorId, date, timeSlotType } = parsed.data
    const scheduleDate = new Date(date)

    // 檢查醫師是否存在
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    })

    if (!doctor) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '醫師不存在' },
      }, { status: 400 })
    }

    // Rule: 同一醫師在同一日期只能有一筆班表
    const existingSchedule = await prisma.schedule.findUnique({
      where: {
        doctorId_date: {
          doctorId,
          date: scheduleDate,
        },
      },
    })

    if (existingSchedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '該醫師在此日期已有班表' },
      }, { status: 400 })
    }

    // 取得時段配置
    const slotConfig = TIME_SLOT_CONFIGS[timeSlotType]

    // 計算時段數量
    const startMinutes = slotConfig.startHour * 60 + slotConfig.startMinute
    const endMinutes = slotConfig.endHour * 60 + slotConfig.endMinute
    const totalDuration = endMinutes - startMinutes
    const slotCount = Math.floor(totalDuration / SLOT_DURATION_MINUTES)

    // 產生時段資料
    const timeSlotsData: { startTime: Date; endTime: Date; totalMinutes: number; remainingMinutes: number }[] = []
    for (let i = 0; i < slotCount; i++) {
      const slotStartMinutes = startMinutes + i * SLOT_DURATION_MINUTES
      const slotEndMinutes = slotStartMinutes + SLOT_DURATION_MINUTES

      // 使用固定日期 1970-01-01 來存儲時間（PostgreSQL Time 類型）
      const startTime = new Date(1970, 0, 1, Math.floor(slotStartMinutes / 60), slotStartMinutes % 60)
      const endTime = new Date(1970, 0, 1, Math.floor(slotEndMinutes / 60), slotEndMinutes % 60)

      timeSlotsData.push({
        startTime,
        endTime,
        totalMinutes: SLOT_DURATION_MINUTES,
        remainingMinutes: SLOT_DURATION_MINUTES,
      })
    }

    // 使用事務建立班表和時段
    const schedule = await prisma.$transaction(async (tx) => {
      // 建立班表
      const newSchedule = await tx.schedule.create({
        data: {
          doctorId,
          date: scheduleDate,
          isAvailable: true,
        },
      })

      // 建立時段
      await tx.timeSlot.createMany({
        data: timeSlotsData.map((slot) => ({
          scheduleId: newSchedule.id,
          ...slot,
        })),
      })

      return newSchedule
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CREATE_SCHEDULE',
        targetType: 'schedule',
        targetId: schedule.id,
        details: {
          doctorId,
          date: date,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: schedule.id,
        doctorId: schedule.doctorId,
        date: schedule.date,
        isAvailable: schedule.isAvailable,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/admin/schedules]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '建立班表失敗' },
    }, { status: 500 })
  }
}

// =============================================
// GET: 查詢班表列表
// =============================================
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const doctorId = searchParams.get('doctorId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (doctorId) {
      where.doctorId = doctorId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        timeSlots: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            totalMinutes: true,
            remainingMinutes: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    })

    // 轉換格式，將 doctor.name 提取為 doctorName
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      doctorId: schedule.doctorId,
      doctorName: schedule.doctor.name,
      date: schedule.date.toISOString().split('T')[0],
      isAvailable: schedule.isAvailable,
      timeSlots: schedule.timeSlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime.toISOString().substring(11, 16),
        endTime: slot.endTime.toISOString().substring(11, 16),
        totalMinutes: slot.totalMinutes,
        remainingMinutes: slot.remainingMinutes,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: formattedSchedules,
    })

  } catch (error) {
    console.error('[GET /api/admin/schedules]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '查詢班表失敗' },
    }, { status: 500 })
  }
}
