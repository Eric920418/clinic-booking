// src/app/api/admin/schedules/[id]/time-slots/route.ts
/**
 * 班表時段管理 API
 *
 * GET /api/admin/schedules/{scheduleId}/time-slots - 取得班表下所有時段
 * POST /api/admin/schedules/{scheduleId}/time-slots - 建立時段（含加診）
 *
 * POST Request Body:
 * {
 *   startTime: string      // 開始時間 (HH:mm)
 *   endTime: string        // 結束時間 (HH:mm)
 *   totalMinutes?: number  // 總分鐘數（預設 30）
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   data?: { id, scheduleId, startTime, endTime, totalMinutes, remainingMinutes }
 *   error?: string
 * }
 *
 * Rules:
 * - 時段總分鐘數預設為 30 分鐘
 * - 可為醫師新增額外時段（加診）
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =============================================
// GET: 取得班表下所有時段
// =============================================
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { id: scheduleId } = await params

    // 確認班表存在
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表不存在' },
      }, { status: 404 })
    }

    const timeSlots = await prisma.timeSlot.findMany({
      where: { scheduleId },
      orderBy: { startTime: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: timeSlots,
    })

  } catch (error) {
    console.error('[GET /api/admin/schedules/:id/time-slots]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得時段列表失敗' },
    }, { status: 500 })
  }
}

// =============================================
// POST: 建立時段（含加診）
// Rules:
// - 時段總分鐘數預設為 30 分鐘
// - 可為醫師新增額外時段（加診）
// =============================================
const createTimeSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, '開始時間格式必須為 HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, '結束時間格式必須為 HH:mm'),
  totalMinutes: z.number().int().positive().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { id: scheduleId } = await params
    const body = await request.json()
    const parsed = createTimeSlotSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { startTime, endTime, totalMinutes: inputTotalMinutes } = parsed.data

    // 確認班表存在
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表不存在' },
      }, { status: 404 })
    }

    // 轉換時間字串為 Date（使用 1970-01-01 作為基準日期）
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    const startTimeDate = new Date(1970, 0, 1, startHour, startMin, 0)
    const endTimeDate = new Date(1970, 0, 1, endHour, endMin, 0)

    // Rule: 時段總分鐘數預設為 30 分鐘
    const totalMinutes = inputTotalMinutes ?? 30
    const remainingMinutes = totalMinutes

    // 建立時段
    const timeSlot = await prisma.timeSlot.create({
      data: {
        scheduleId,
        startTime: startTimeDate,
        endTime: endTimeDate,
        totalMinutes,
        remainingMinutes,
      },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CREATE_TIME_SLOT',
        targetType: 'timeSlot',
        targetId: timeSlot.id,
        details: {
          scheduleId,
          startTime,
          endTime,
          totalMinutes,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: timeSlot.id,
        scheduleId: timeSlot.scheduleId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        totalMinutes: timeSlot.totalMinutes,
        remainingMinutes: timeSlot.remainingMinutes,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/admin/schedules/:id/time-slots]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '建立時段失敗' },
    }, { status: 500 })
  }
}
