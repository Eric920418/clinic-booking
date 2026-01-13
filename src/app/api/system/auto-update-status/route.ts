// src/app/api/system/auto-update-status/route.ts
// Feature: 預約狀態自動更新
// 系統批次任務：自動將已過時段的「已預約」狀態更新為「未報到」

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { APPOINTMENT_CONSTANTS } from '@/lib/constants/appointment'

/**
 * POST /api/system/auto-update-status
 *
 * 系統執行自動狀態更新
 *
 * Rules:
 * - 當日預約時段結束後「已預約」狀態自動改為「未報到」
 * - 未報到時病患的未報到次數加 1
 * - 未報到次數達到 3 次後停止累計
 * - 黑名單狀態由批次任務檢查更新（不在此 API 處理）
 *
 * Request Body:
 * - currentTime: string (ISO 8601) - 可選，用於測試環境模擬當前時間
 *
 * Response:
 * - processedCount: number - 處理的預約數量
 * - updatedAppointments: array - 更新的預約列表
 */
export async function POST(request: NextRequest) {
  try {
    // 解析 request body
    const body = await request.json().catch(() => ({}))

    // 取得當前時間（支援測試環境注入）
    const currentTime = body.currentTime
      ? new Date(body.currentTime)
      : new Date()

    // 取得當前日期（使用 UTC 日期部分，與 Prisma @db.Date 格式一致）
    const year = currentTime.getFullYear()
    const month = currentTime.getMonth()
    const day = currentTime.getDate()
    const currentDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))

    // 取得當前時間的時分（用於比對時段結束時間，使用本地時間）
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // 建立用於比對的時間（使用 1970-01-01 作為基準，因為 TimeSlot 的時間存儲格式）
    const compareTime = new Date(`1970-01-01T${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`)

    // 查詢符合條件的預約：
    // - appointmentDate = 當前日期
    // - status = 'booked'
    // - timeSlot.endTime <= 當前時間
    const appointmentsToUpdate = await prisma.appointment.findMany({
      where: {
        appointmentDate: currentDate,
        status: 'booked',
        timeSlot: {
          endTime: {
            lte: compareTime,
          },
        },
      },
      include: {
        patient: true,
        timeSlot: true,
      },
    })

    const updatedAppointments: Array<{
      appointmentId: string
      patientId: string
      newNoShowCount: number
    }> = []

    // 批次更新預約狀態和病患未報到次數
    for (const appointment of appointmentsToUpdate) {
      // 使用交易確保一致性
      await prisma.$transaction(async (tx) => {
        // 1. 更新預約狀態為 no_show
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: 'no_show' },
        })

        // 2. 更新病患未報到次數（上限為 MAX_NO_SHOW_COUNT）
        const currentNoShowCount = appointment.patient.noShowCount
        const newNoShowCount = Math.min(
          currentNoShowCount + 1,
          APPOINTMENT_CONSTANTS.MAX_NO_SHOW_COUNT
        )

        if (newNoShowCount > currentNoShowCount) {
          await tx.patient.update({
            where: { id: appointment.patientId },
            data: { noShowCount: newNoShowCount },
          })
        }

        updatedAppointments.push({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          newNoShowCount: newNoShowCount,
        })
      })
    }

    return NextResponse.json({
      success: true,
      processedCount: updatedAppointments.length,
      updatedAppointments,
    })
  } catch (error) {
    console.error('Auto update status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : '系統錯誤',
      },
      { status: 500 }
    )
  }
}
