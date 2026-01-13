// src/app/api/admin/time-slots/[id]/route.ts
/**
 * 單一時段操作 API
 *
 * GET /api/admin/time-slots/{id} - 取得時段詳情
 * PATCH /api/admin/time-slots/{id} - 調整時段餘量
 * DELETE /api/admin/time-slots/{id} - 刪除時段
 *
 * PATCH Request Body:
 * {
 *   remainingMinutes: number  // 新的剩餘分鐘數
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
 * - 可手動調整時段剩餘分鐘數
 * - 剩餘分鐘數為 0 時不可手動調整
 * - 新餘量不可超過總分鐘數
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
// GET: 取得時段詳情
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

    const { id } = await params

    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
      include: {
        schedule: {
          include: {
            doctor: true,
          },
        },
      },
    })

    if (!timeSlot) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '時段不存在' },
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: timeSlot,
    })

  } catch (error) {
    console.error('[GET /api/admin/time-slots/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得時段失敗' },
    }, { status: 500 })
  }
}

// =============================================
// PATCH: 調整時段餘量
// Rules:
// - 可手動調整時段剩餘分鐘數
// - 剩餘分鐘數為 0 時不可手動調整
// - 新餘量不可超過總分鐘數
// =============================================
const updateTimeSlotSchema = z.object({
  remainingMinutes: z.number().int().min(0, '剩餘分鐘數不可為負數'),
})

export async function PATCH(
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

    const { id } = await params
    const body = await request.json()
    const parsed = updateTimeSlotSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { remainingMinutes: newRemainingMinutes } = parsed.data

    // 查詢時段
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
    })

    if (!timeSlot) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '時段不存在' },
      }, { status: 404 })
    }

    // Rule: 剩餘分鐘數為 0 時不可手動調整
    if (timeSlot.remainingMinutes === 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '剩餘分鐘數為 0 時不可手動調整' },
      }, { status: 400 })
    }

    // Rule: 新餘量不可超過總分鐘數
    if (newRemainingMinutes > timeSlot.totalMinutes) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '新餘量不可超過總分鐘數' },
      }, { status: 400 })
    }

    // 更新時段餘量
    const updatedTimeSlot = await prisma.timeSlot.update({
      where: { id },
      data: { remainingMinutes: newRemainingMinutes },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'UPDATE_TIME_SLOT',
        targetType: 'timeSlot',
        targetId: id,
        details: {
          previousRemainingMinutes: timeSlot.remainingMinutes,
          newRemainingMinutes,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTimeSlot.id,
        scheduleId: updatedTimeSlot.scheduleId,
        startTime: updatedTimeSlot.startTime,
        endTime: updatedTimeSlot.endTime,
        totalMinutes: updatedTimeSlot.totalMinutes,
        remainingMinutes: updatedTimeSlot.remainingMinutes,
      },
    })

  } catch (error) {
    console.error('[PATCH /api/admin/time-slots/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新時段失敗' },
    }, { status: 500 })
  }
}

// =============================================
// DELETE: 刪除時段
// =============================================
export async function DELETE(
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

    const { id } = await params

    // 檢查時段是否存在
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id },
      include: {
        appointments: {
          where: {
            status: { in: ['booked', 'checked_in'] },
          },
        },
      },
    })

    if (!timeSlot) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '時段不存在' },
      }, { status: 404 })
    }

    // 檢查是否有進行中的預約
    if (timeSlot.appointments.length > 0) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '時段有進行中的預約，無法刪除' },
      }, { status: 400 })
    }

    // 刪除時段
    await prisma.timeSlot.delete({
      where: { id },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'DELETE_TIME_SLOT',
        targetType: 'timeSlot',
        targetId: id,
        details: {
          scheduleId: timeSlot.scheduleId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: '時段已刪除' },
    })

  } catch (error) {
    console.error('[DELETE /api/admin/time-slots/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '刪除時段失敗' },
    }, { status: 500 })
  }
}
