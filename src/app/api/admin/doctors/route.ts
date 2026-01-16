// src/app/api/admin/doctors/route.ts
// Feature: 管理醫師資料

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'
import { z } from 'zod'

// 驗證 Schema
const createDoctorSchema = z.object({
  name: z.string().min(2, '姓名至少 2 字元').max(20, '姓名不可超過 20 字元'),
  treatmentIds: z.array(z.string().uuid()).optional(),
})

/**
 * POST /api/admin/doctors
 * 管理員新增醫師
 *
 * Feature: 管理醫師資料.feature
 * Rules:
 * - 可新增醫師
 * - 姓名必須為 2-20 字元
 * - 新增成功後預設為啟用狀態
 */
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

    // 驗證輸入
    const validationResult = createDoctorSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0]?.message || '參數格式錯誤'
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: firstError },
      }, { status: 400 })
    }

    const { name, treatmentIds } = validationResult.data

    // 建立醫師（預設為啟用狀態），同時關聯診療項目
    const doctor = await prisma.doctor.create({
      data: {
        name,
        isActive: true,
        doctorTreatments: treatmentIds && treatmentIds.length > 0
          ? {
              create: treatmentIds.map(treatmentTypeId => ({
                treatmentTypeId,
              })),
            }
          : undefined,
      },
      include: {
        doctorTreatments: {
          select: {
            treatmentType: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'CREATE_DOCTOR',
        targetType: 'doctor',
        targetId: doctor.id,
        details: {
          doctorName: name,
          treatmentIds: treatmentIds || [],
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: doctor,
    })

  } catch (error) {
    console.error('[POST /api/admin/doctors]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '新增醫師失敗' },
    }, { status: 500 })
  }
}
