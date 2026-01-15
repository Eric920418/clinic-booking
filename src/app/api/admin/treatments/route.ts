// src/app/api/admin/treatments/route.ts
// Feature: 管理診療類型
// API: 取得所有診療項目 / 新增診療項目

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

/**
 * GET /api/admin/treatments
 * 取得所有診療項目列表
 */
export async function GET(
  _request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const treatments = await prisma.treatmentType.findMany({
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: treatments,
    })

  } catch (error) {
    console.error('[GET /api/admin/treatments]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得診療項目列表失敗' },
    }, { status: 500 })
  }
}

/**
 * POST /api/admin/treatments
 * 新增診療項目
 *
 * Rules:
 * - 名稱不可重複
 * - 扣除分鐘數必須大於 0 且不超過 30 分鐘
 */
const createTreatmentSchema = z.object({
  name: z.string().min(1, '診療項目名稱不可為空').max(50, '名稱最多 50 字元'),
  durationMinutes: z.number()
    .int({ message: '扣除分鐘數必須為整數' })
    .min(1, { message: '扣除分鐘數必須大於 0' })
    .max(30, { message: '扣除分鐘數不可超過 30 分鐘' }),
})

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createTreatmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { name, durationMinutes } = parsed.data

    // 檢查名稱是否已存在
    const existing = await prisma.treatmentType.findFirst({
      where: { name },
    })

    if (existing) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '此診療項目名稱已存在' },
      }, { status: 400 })
    }

    // 建立診療項目
    const treatment = await prisma.treatmentType.create({
      data: {
        name,
        durationMinutes,
        isActive: true,
      },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CREATE_TREATMENT_TYPE',
        targetType: 'treatment_type',
        targetId: treatment.id,
        details: { name, durationMinutes },
      },
    })

    return NextResponse.json({
      success: true,
      data: treatment,
    }, { status: 201 })

  } catch (error) {
    console.error('[POST /api/admin/treatments]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '新增診療項目失敗' },
    }, { status: 500 })
  }
}
