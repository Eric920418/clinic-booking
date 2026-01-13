// src/app/api/admin/treatments/[treatmentId]/route.ts
// Feature: 管理診療類型

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ treatmentId: string }>
}

/**
 * GET /api/admin/treatments/{treatmentId}
 * 取得診療類型詳情
 */
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

    const { treatmentId } = await params

    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentId },
    })

    if (!treatmentType) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在' },
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: treatmentType,
    })

  } catch (error) {
    console.error('[GET /api/admin/treatments/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得診療類型失敗' },
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/treatments/{treatmentId}
 * 管理員修改診療類型
 *
 * Feature: 管理診療類型.feature
 * Rules:
 * - 可修改診療類型的扣除分鐘數
 * - 扣除分鐘數必須大於 0
 * - 扣除分鐘數不可超過 30 分鐘（單一時段長度）
 */
const updateTreatmentSchema = z.object({
  durationMinutes: z.number()
    .int({ message: '扣除分鐘數必須為整數' })
    .min(1, { message: '扣除分鐘數必須大於 0' })
    .max(30, { message: '扣除分鐘數不可超過 30 分鐘' }),
})

export async function PUT(
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

    const { treatmentId } = await params
    const body = await request.json()
    const parsed = updateTreatmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { durationMinutes } = parsed.data

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

    // 更新診療類型
    const updatedTreatmentType = await prisma.treatmentType.update({
      where: { id: treatmentId },
      data: { durationMinutes },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'UPDATE_TREATMENT_TYPE',
        targetType: 'treatment_type',
        targetId: treatmentId,
        details: {
          previousDurationMinutes: treatmentType.durationMinutes,
          newDurationMinutes: durationMinutes,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedTreatmentType,
    })

  } catch (error) {
    console.error('[PUT /api/admin/treatments/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新診療類型失敗' },
    }, { status: 500 })
  }
}
