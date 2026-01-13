// src/app/api/patient/appointments/route.ts
// Feature: 病患建立預約

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { startOfDay, endOfDay, addDays, isBefore, isAfter } from 'date-fns'

// 請求驗證 Schema
const createAppointmentSchema = z.object({
  lineUserId: z.string().min(1, 'LINE User ID 為必填'),
  slotId: z.string().uuid('時段 ID 格式錯誤'),
  treatmentId: z.string().uuid('診療類型 ID 格式錯誤'),
})

/**
 * POST /api/patient/appointments
 * 病患建立預約
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析並驗證請求
    const body = await request.json()
    const parsed = createAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: parsed.error.issues[0].message,
        },
        { status: 400 }
      )
    }

    const { lineUserId, slotId, treatmentId } = parsed.data

    // 2. 查詢病患
    const patient = await prisma.patient.findUnique({
      where: { lineUserId },
      include: { blacklist: true },
    })

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'PATIENT_NOT_FOUND',
          message: '找不到病患資料',
        },
        { status: 404 }
      )
    }

    // 3. Rule: 病患不可在黑名單中
    if (patient.isBlacklisted || patient.blacklist) {
      return NextResponse.json(
        {
          success: false,
          error: 'E005',
          message: '帳號已被停權',
        },
        { status: 403 }
      )
    }

    // 4. 查詢時段及相關資料
    const timeSlot = await prisma.timeSlot.findUnique({
      where: { id: slotId },
      include: {
        schedule: {
          include: { doctor: true },
        },
      },
    })

    if (!timeSlot) {
      return NextResponse.json(
        {
          success: false,
          error: 'SLOT_NOT_FOUND',
          message: '找不到時段',
        },
        { status: 404 }
      )
    }

    // 5. 查詢診療類型
    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentId },
    })

    if (!treatmentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'TREATMENT_NOT_FOUND',
          message: '找不到診療類型',
        },
        { status: 404 }
      )
    }

    const appointmentDate = timeSlot.schedule.date
    const today = startOfDay(new Date())

    // 6. Rule: 不可選擇過去日期
    if (isBefore(startOfDay(appointmentDate), today)) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAST_DATE',
          message: '不可選擇過去日期',
        },
        { status: 400 }
      )
    }

    // 7. Rule: 不可選擇超過 30 天後的日期
    const maxDate = addDays(today, 30)
    if (isAfter(startOfDay(appointmentDate), maxDate)) {
      return NextResponse.json(
        {
          success: false,
          error: 'DATE_TOO_FAR',
          message: '不可選擇超過 30 天後的日期',
        },
        { status: 400 }
      )
    }

    // 8. Rule: 時段剩餘分鐘數必須大於等於診療所需分鐘數
    if (timeSlot.remainingMinutes < treatmentType.durationMinutes) {
      // 查詢同一日期的其他可用時段
      const alternativeSlots = await prisma.timeSlot.findMany({
        where: {
          schedule: {
            date: appointmentDate,
            doctorId: timeSlot.schedule.doctorId,
          },
          remainingMinutes: { gte: treatmentType.durationMinutes },
          id: { not: slotId },
        },
        include: {
          schedule: true,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'E003',
          message: '時段已滿，剩餘分鐘數不足',
          alternativeSlots: alternativeSlots.map((slot) => ({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            remainingMinutes: slot.remainingMinutes,
          })),
        },
        { status: 400 }
      )
    }

    // 9. Rule: 病患當日不可有重複預約
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        patientId: patient.id,
        appointmentDate: {
          gte: startOfDay(appointmentDate),
          lte: endOfDay(appointmentDate),
        },
        status: {
          in: ['booked', 'checked_in'],
        },
      },
    })

    if (existingAppointment) {
      return NextResponse.json(
        {
          success: false,
          error: 'E004',
          message: '當日已有預約',
        },
        { status: 409 }
      )
    }

    // 10. 使用交易建立預約並扣除時段分鐘數
    const appointment = await prisma.$transaction(async (tx) => {
      // 再次檢查時段餘量（防止併發問題）
      const currentSlot = await tx.timeSlot.findUnique({
        where: { id: slotId },
      })

      if (!currentSlot || currentSlot.remainingMinutes < treatmentType.durationMinutes) {
        throw new Error('時段已滿')
      }

      // 扣除時段分鐘數
      await tx.timeSlot.update({
        where: { id: slotId },
        data: {
          remainingMinutes: {
            decrement: treatmentType.durationMinutes,
          },
        },
      })

      // 建立預約
      return tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: timeSlot.schedule.doctorId,
          treatmentTypeId: treatmentId,
          timeSlotId: slotId,
          appointmentDate: appointmentDate,
          status: 'booked',
        },
        include: {
          doctor: true,
          treatmentType: true,
          timeSlot: true,
        },
      })
    })

    // 11. 發送 LINE 通知（模擬成功）
    // TODO: 實際整合 LINE Messaging API
    const notificationSent = true

    return NextResponse.json(
      {
        success: true,
        data: {
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorName: appointment.doctor.name,
          treatmentName: appointment.treatmentType.name,
          appointmentDate: appointment.appointmentDate,
          status: appointment.status,
        },
        notificationSent,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/patient/appointments]', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.issues[0].message,
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === '時段已滿') {
      return NextResponse.json(
        {
          success: false,
          error: 'E003',
          message: '時段已滿',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '預約失敗，請稍後再試',
      },
      { status: 500 }
    )
  }
}

// 預約狀態中文標籤映射
const STATUS_LABEL_MAP: Record<string, string> = {
  booked: '已預約',
  checked_in: '已報到',
  completed: '已完成',
  no_show: '未報到',
  cancelled: '已取消',
}

/**
 * GET /api/patient/appointments
 * 病患查看預約列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('lineUserId')

    if (!lineUserId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_LINE_USER_ID',
          message: 'LINE User ID 為必填',
        },
        { status: 400 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { lineUserId },
    })

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'PATIENT_NOT_FOUND',
          message: '找不到病患資料',
        },
        { status: 404 }
      )
    }

    const appointments = await prisma.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: true,
        treatmentType: true,
        timeSlot: true,
      },
      orderBy: { appointmentDate: 'desc' },
    })

    // 加入 statusLabel 欄位
    const appointmentsWithLabel = appointments.map((apt) => ({
      ...apt,
      statusLabel: STATUS_LABEL_MAP[apt.status] ?? apt.status,
    }))

    return NextResponse.json({
      success: true,
      data: appointmentsWithLabel,
    })
  } catch (error) {
    console.error('[GET /api/patient/appointments]', error)
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
