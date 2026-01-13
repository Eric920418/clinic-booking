// src/app/api/slots/route.ts
// Feature: 即時更新時段餘量
// 取得可預約時段列表

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

/**
 * GET /api/slots
 * 取得可預約時段列表
 *
 * Query Parameters:
 * - date: 日期（必填，格式：YYYY-MM-DD）
 * - doctor_id: 醫師 ID（選填）
 * - treatment_id: 診療類型 ID（選填）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const doctorId = searchParams.get('doctor_id')
    const treatmentId = searchParams.get('treatment_id')

    // 驗證必填參數
    if (!dateStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_DATE',
          message: '日期為必填',
        },
        { status: 400 }
      )
    }

    // 解析日期
    let date: Date
    try {
      date = parseISO(dateStr)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_DATE',
          message: '日期格式錯誤，請使用 YYYY-MM-DD 格式',
        },
        { status: 400 }
      )
    }

    // 查詢診療類型取得所需分鐘數（用於過濾可用時段）
    let requiredMinutes = 0
    if (treatmentId) {
      const treatmentType = await prisma.treatmentType.findUnique({
        where: { id: treatmentId },
      })
      if (treatmentType) {
        requiredMinutes = treatmentType.durationMinutes
      }
    }

    // 構建查詢條件
    const whereCondition: {
      schedule: {
        date: { gte: Date; lte: Date }
        isAvailable: boolean
        doctorId?: string
      }
      remainingMinutes?: { gte: number }
    } = {
      schedule: {
        date: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
        isAvailable: true,
      },
    }

    // 如果指定醫師，加入篩選
    if (doctorId) {
      whereCondition.schedule.doctorId = doctorId
    }

    // 如果指定診療類型，過濾出剩餘分鐘數足夠的時段
    if (requiredMinutes > 0) {
      whereCondition.remainingMinutes = { gte: requiredMinutes }
    }

    // 查詢時段
    const timeSlots = await prisma.timeSlot.findMany({
      where: whereCondition,
      include: {
        schedule: {
          include: {
            doctor: true,
          },
        },
      },
      orderBy: [
        { schedule: { doctorId: 'asc' } },
        { startTime: 'asc' },
      ],
    })

    // 格式化回應
    const slots = timeSlots.map((slot) => ({
      id: slot.id,
      scheduleId: slot.scheduleId,
      doctorId: slot.schedule.doctorId,
      doctorName: slot.schedule.doctor.name,
      date: slot.schedule.date.toISOString().split('T')[0],
      startTime: slot.startTime.toISOString().split('T')[1].substring(0, 5),
      endTime: slot.endTime.toISOString().split('T')[1].substring(0, 5),
      totalMinutes: slot.totalMinutes,
      remainingMinutes: slot.remainingMinutes,
    }))

    return NextResponse.json(slots)
  } catch (error) {
    console.error('[GET /api/slots]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '查詢時段失敗',
      },
      { status: 500 }
    )
  }
}
