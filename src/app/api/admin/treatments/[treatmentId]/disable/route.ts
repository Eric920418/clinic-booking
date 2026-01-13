// src/app/api/admin/treatments/[treatmentId]/disable/route.ts
// Feature: 管理診療類型

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { sendLineMessage } from '@/lib/line'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ treatmentId: string }>
}

/**
 * POST /api/admin/treatments/{treatmentId}/disable
 * 管理員停用診療類型
 *
 * Feature: 管理診療類型.feature
 * Rules:
 * - 可停用診療類型
 * - 停用診療類型時自動取消所有使用此類型的未來預約並通知病患
 * - 停用診療類型時已完成的預約不受影響
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

    const { treatmentId } = await params

    // 檢查診療類型是否存在
    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentId },
    })

    if (!treatmentType) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在' },
      }, { status: 404 })
    }

    // 停用診療類型
    const updatedTreatmentType = await prisma.treatmentType.update({
      where: { id: treatmentId },
      data: { isActive: false },
    })

    // 取得今天日期（用於篩選未來預約）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 查詢所有使用此診療類型的未來預約（狀態為 booked）
    // Rule: 停用診療類型時已完成的預約不受影響
    const futureAppointments = await prisma.appointment.findMany({
      where: {
        treatmentTypeId: treatmentId,
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
        timeSlot: {
          include: {
            schedule: {
              include: {
                doctor: true,
              },
            },
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
        const doctorName = appointment.timeSlot.schedule.doctor.name

        await sendLineMessage(
          appointment.patient.lineUserId,
          [{
            type: 'text',
            text: `您好，由於「${treatmentType.name}」診療類型已停用，您於 ${dateStr} ${doctorName} 醫師的預約已自動取消。造成不便，敬請見諒。`,
          }]
        )
        notifiedPatients.push(appointment.patient.lineUserId)
      }
    }

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'DISABLE_TREATMENT_TYPE',
        targetType: 'treatment_type',
        targetId: treatmentId,
        details: {
          treatmentTypeName: treatmentType.name,
          cancelledAppointmentIds,
          notifiedPatients,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTreatmentType,
        cancelledAppointments: cancelledAppointmentIds.length,
        notifiedPatients,
      },
    })

  } catch (error) {
    console.error('[POST /api/admin/treatments/:id/disable]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '停用診療類型失敗' },
    }, { status: 500 })
  }
}
