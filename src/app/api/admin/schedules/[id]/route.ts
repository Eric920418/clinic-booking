/**
 * 單一班表操作 API
 * 對應規格：spec/features/管理班表.feature
 *
 * GET /api/admin/schedules/{id} - 取得班表詳情
 * PATCH /api/admin/schedules/{id} - 更新班表（停診/恢復）
 * DELETE /api/admin/schedules/{id} - 刪除班表
 *
 * Rules:
 * - 標記停診時已預約者必須發送通知
 * - 標記停診時必須將班表設為不可預約
 * - 停診恢復僅限未來日期
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendClinicClosureNotification } from '@/lib/line'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =============================================
// GET: 取得班表詳情
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

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        doctor: true,
        timeSlots: {
          orderBy: { startTime: 'asc' },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表不存在' },
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    })

  } catch (error) {
    console.error('[GET /api/admin/schedules/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得班表失敗' },
    }, { status: 500 })
  }
}

// =============================================
// PATCH: 更新班表（停診/恢復）
// Rules:
// - 標記停診時已預約者必須發送通知
// - 標記停診時必須將班表設為不可預約
// - 停診恢復僅限未來日期
// =============================================
const updateScheduleSchema = z.object({
  isAvailable: z.boolean(),
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
    const parsed = updateScheduleSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { isAvailable } = parsed.data

    // 查詢班表
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        doctor: true,
      },
    })

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表不存在' },
      }, { status: 404 })
    }

    // Rule: 停診恢復僅限未來日期
    // 如果要恢復為可預約 (isAvailable = true)，必須是未來日期
    if (isAvailable && !schedule.isAvailable) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const scheduleDate = new Date(schedule.date)
      scheduleDate.setHours(0, 0, 0, 0)

      if (scheduleDate <= today) {
        return NextResponse.json({
          success: false,
          error: { code: 'E001', message: '過去或當日的停診無法恢復，請選擇未來日期' },
        }, { status: 400 })
      }
    }

    // 更新班表狀態
    const updatedSchedule = await prisma.schedule.update({
      where: { id },
      data: { isAvailable },
    })

    // Rule: 標記停診時已預約者必須發送通知
    const notifiedPatients: string[] = []

    if (!isAvailable && schedule.isAvailable) {
      // 從可預約變成停診，需要通知已預約的病患
      const appointments = await prisma.appointment.findMany({
        where: {
          timeSlot: {
            scheduleId: id,
          },
          status: 'booked',
        },
        include: {
          patient: true,
        },
      })

      // 格式化日期
      const dateStr = schedule.date.toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })

      // 發送通知給每個已預約的病患
      for (const appointment of appointments) {
        if (appointment.patient.lineUserId) {
          await sendClinicClosureNotification(
            appointment.patient.lineUserId,
            schedule.doctor.name,
            dateStr
          )
          notifiedPatients.push(appointment.patient.lineUserId)
        }
      }
    }

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: isAvailable ? 'RESTORE_SCHEDULE' : 'SUSPEND_SCHEDULE',
        targetType: 'schedule',
        targetId: id,
        details: {
          previousIsAvailable: schedule.isAvailable,
          newIsAvailable: isAvailable,
          notifiedPatients,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSchedule.id,
        doctorId: updatedSchedule.doctorId,
        date: updatedSchedule.date,
        isAvailable: updatedSchedule.isAvailable,
        notifiedPatients,
      },
    })

  } catch (error) {
    console.error('[PATCH /api/admin/schedules/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新班表失敗' },
    }, { status: 500 })
  }
}

// =============================================
// DELETE: 刪除班表
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

    // 檢查班表是否存在
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        timeSlots: {
          include: {
            appointments: {
              where: {
                status: { in: ['booked', 'checked_in'] },
              },
            },
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表不存在' },
      }, { status: 404 })
    }

    // 檢查是否有進行中的預約
    const hasActiveAppointments = schedule.timeSlots.some(
      slot => slot.appointments.length > 0
    )

    if (hasActiveAppointments) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '班表下有進行中的預約，無法刪除' },
      }, { status: 400 })
    }

    // 刪除班表（會連帶刪除時段，因為有 Cascade）
    await prisma.schedule.delete({
      where: { id },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'DELETE_SCHEDULE',
        targetType: 'schedule',
        targetId: id,
        details: {
          doctorId: schedule.doctorId,
          date: schedule.date,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: '班表已刪除' },
    })

  } catch (error) {
    console.error('[DELETE /api/admin/schedules/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '刪除班表失敗' },
    }, { status: 500 })
  }
}
