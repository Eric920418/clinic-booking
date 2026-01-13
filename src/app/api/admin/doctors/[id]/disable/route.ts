// src/app/api/admin/doctors/[id]/disable/route.ts
// Feature: 管理醫師資料

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendLineMessage } from '@/lib/line'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/admin/doctors/{id}/disable
 * 管理員停用醫師
 *
 * Feature: 管理醫師資料.feature
 * Rules:
 * - 可停用醫師
 * - 停用醫師時自動取消所有未來預約並通知病患
 * - 停用醫師時已完成的預約不受影響
 */
export async function POST(
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

    const { id: doctorId } = await params

    // 檢查醫師是否存在
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    })

    if (!doctor) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '醫師不存在' },
      }, { status: 404 })
    }

    // 停用醫師
    const updatedDoctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: { isActive: false },
    })

    // 取得今天日期（用於篩選未來預約）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 查詢所有該醫師的未來預約（狀態為 booked）
    // Rule: 停用醫師時已完成的預約不受影響
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: 'booked',
        timeSlot: {
          schedule: {
            date: {
              gte: today,
            },
          },
        },
      },
      include: {
        patient: true,
        treatmentType: true,
        timeSlot: {
          include: {
            schedule: true,
          },
        },
      },
    })

    // 取消預約並通知病患
    const notifiedPatients: string[] = []
    const cancelledAppointmentIds: string[] = []

    for (const appointment of futureAppointments) {
      // 取消預約
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'cancelled' },
      })
      cancelledAppointmentIds.push(appointment.id)

      // 發送 LINE 通知給病患
      if (appointment.patient.lineUserId) {
        const dateStr = appointment.timeSlot.schedule.date.toLocaleDateString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })

        await sendLineMessage(appointment.patient.lineUserId, [
          {
            type: 'text',
            text: `您好，由於 ${doctor.name} 醫師已停診，您於 ${dateStr} 的預約已自動取消。造成不便，敬請見諒。`,
          },
        ])
        notifiedPatients.push(appointment.patient.lineUserId)
      }
    }

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'DISABLE_DOCTOR',
        targetType: 'doctor',
        targetId: doctorId,
        details: {
          doctorName: doctor.name,
          cancelledAppointmentIds,
          notifiedPatients,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedDoctor,
        cancelledAppointments: cancelledAppointmentIds.length,
        notifiedPatients,
      },
    })

  } catch (error) {
    console.error('[POST /api/admin/doctors/:id/disable]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '停用醫師失敗' },
    }, { status: 500 })
  }
}
