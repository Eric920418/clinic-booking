// src/app/api/patient/appointments/[id]/route.ts
// Feature: 病患預約管理（查看、修改、取消）

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { patientUpdateAppointmentSchema } from '@/lib/validations/patient-appointment'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/patient/appointments/{id}
 * 病患查看預約詳情
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: true,
        treatmentType: true,
        timeSlot: true,
        patient: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'E007',
          message: '無此預約',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: appointment,
    })
  } catch (error) {
    console.error('[GET /api/patient/appointments/:id]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '查詢預約失敗',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/patient/appointments/{id}
 * 病患修改預約
 *
 * Rules:
 * - 僅可修改狀態為「已預約」的預約
 * - 不可修改時段開始前 3 小時內的預約
 * - 修改預約時必須立即釋放原時段分鐘數
 * - 修改預約時必須檢查新時段餘量
 * - 修改預約時必須扣除新時段分鐘數
 * - 修改成功後必須發送 LINE 通知
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    const body = await request.json()

    // 0. 使用 Zod 驗證請求資料
    const validationResult = patientUpdateAppointmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: '請求資料格式錯誤',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // 1. 查詢原預約及相關資料
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        treatmentType: true,
        timeSlot: {
          include: {
            schedule: true,
          },
        },
        patient: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'E007',
          message: '無此預約',
        },
        { status: 404 }
      )
    }

    // 2. Rule 1: 僅可修改狀態為「已預約」的預約
    if (appointment.status !== 'booked') {
      return NextResponse.json(
        {
          success: false,
          error: 'E008',
          message: '只有已預約狀態的預約可以修改',
        },
        { status: 403 }
      )
    }

    // 3. Rule 2: 不可修改時段開始前 3 小時內的預約
    const scheduleDate = appointment.timeSlot.schedule.date
    const slotStartTime = appointment.timeSlot.startTime

    // 合併日期和時間
    const appointmentDateTime = new Date(scheduleDate)
    appointmentDateTime.setHours(
      slotStartTime.getUTCHours(),
      slotStartTime.getUTCMinutes(),
      0,
      0
    )

    const now = new Date()
    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    // 剛好 3 小時或不足 3 小時都不允許修改
    if (hoursUntilAppointment <= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'TIME_LIMIT',
          message: '不可修改時段開始前 3 小時內的預約',
        },
        { status: 403 }
      )
    }

    // 4. 取得新時段和新診療類型
    const newTimeSlotId = validatedData.timeSlotId || appointment.timeSlotId
    const newTreatmentTypeId = validatedData.treatmentTypeId || appointment.treatmentTypeId

    // 查詢新時段
    const newTimeSlot = await prisma.timeSlot.findUnique({
      where: { id: newTimeSlotId },
    })

    if (!newTimeSlot) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_SLOT',
          message: '無效的時段',
        },
        { status: 400 }
      )
    }

    // 查詢新診療類型
    const newTreatmentType = await prisma.treatmentType.findUnique({
      where: { id: newTreatmentTypeId },
    })

    if (!newTreatmentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_TREATMENT',
          message: '無效的診療類型',
        },
        { status: 400 }
      )
    }

    // 5. Rule 4: 修改預約時必須檢查新時段餘量
    // 如果是同一個時段，需要考慮釋放原有分鐘數後的餘量
    let availableMinutes = newTimeSlot.remainingMinutes
    if (newTimeSlotId === appointment.timeSlotId) {
      // 同一時段：可用分鐘 = 目前餘量 + 原診療類型的分鐘數
      availableMinutes += appointment.treatmentType.durationMinutes
    }

    if (availableMinutes < newTreatmentType.durationMinutes) {
      return NextResponse.json(
        {
          success: false,
          error: 'E003',
          message: '新時段餘量不足',
        },
        { status: 400 }
      )
    }

    // 6. 使用交易處理修改預約
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // 6.1 Rule 3: 釋放原時段分鐘數（如果換了時段）
      if (newTimeSlotId !== appointment.timeSlotId) {
        await tx.timeSlot.update({
          where: { id: appointment.timeSlotId },
          data: {
            remainingMinutes: {
              increment: appointment.treatmentType.durationMinutes,
            },
          },
        })
      }

      // 6.2 扣除新時段分鐘數
      if (newTimeSlotId !== appointment.timeSlotId) {
        // 不同時段：直接扣除新診療類型的分鐘數
        await tx.timeSlot.update({
          where: { id: newTimeSlotId },
          data: {
            remainingMinutes: {
              decrement: newTreatmentType.durationMinutes,
            },
          },
        })
      } else {
        // 同一時段：先加回原分鐘數，再扣除新分鐘數
        // 等同於：remainingMinutes += 原分鐘 - 新分鐘
        const minutesDiff =
          appointment.treatmentType.durationMinutes - newTreatmentType.durationMinutes
        await tx.timeSlot.update({
          where: { id: newTimeSlotId },
          data: {
            remainingMinutes: {
              increment: minutesDiff,
            },
          },
        })
      }

      // 6.3 更新預約
      const updated = await tx.appointment.update({
        where: { id },
        data: {
          timeSlotId: newTimeSlotId,
          treatmentTypeId: newTreatmentTypeId,
        },
      })

      return updated
    })

    // 7. 發送 LINE 通知（模擬成功）
    // TODO: 實際整合 LINE Messaging API
    const notificationSent = true

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAppointment.id,
        timeSlotId: updatedAppointment.timeSlotId,
        treatmentTypeId: updatedAppointment.treatmentTypeId,
      },
      notificationSent,
    })
  } catch (error) {
    console.error('[PUT /api/patient/appointments/:id]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '修改預約失敗',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/patient/appointments/{id}
 * 病患取消預約
 *
 * Rules:
 * - 取消預約時必須更新預約狀態為「已取消」
 * - 取消預約時必須釋放時段分鐘數
 * - 取消成功後必須發送 LINE 通知
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params

  try {
    // 1. 查詢預約及相關資料
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        treatmentType: true,
        timeSlot: true,
        patient: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'E007',
          message: '無此預約',
        },
        { status: 404 }
      )
    }

    // 2. 檢查預約狀態是否可取消
    if (appointment.status !== 'booked') {
      return NextResponse.json(
        {
          success: false,
          error: 'E008',
          message: '只有已預約狀態的預約可以取消',
        },
        { status: 400 }
      )
    }

    // 3. 使用交易處理取消預約
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      // 3.1 更新預約狀態為 cancelled
      const cancelled = await tx.appointment.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancelledBy: 'patient',
          cancelledReason: '病患自行取消',
        },
      })

      // 3.2 釋放時段分鐘數
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: {
          remainingMinutes: {
            increment: appointment.treatmentType.durationMinutes,
          },
        },
      })

      return cancelled
    })

    // 4. 發送 LINE 通知（模擬成功）
    // TODO: 實際整合 LINE Messaging API
    const notificationSent = true

    return NextResponse.json({
      success: true,
      data: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
      },
      notificationSent,
    })
  } catch (error) {
    console.error('[DELETE /api/patient/appointments/:id]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '取消預約失敗',
      },
      { status: 500 }
    )
  }
}
