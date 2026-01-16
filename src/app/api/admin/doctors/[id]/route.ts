// src/app/api/admin/doctors/[id]/route.ts
// Feature: 管理醫師資料

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// 驗證 Schema
const updateDoctorSchema = z.object({
  name: z.string().min(2, '姓名至少 2 字元').max(20, '姓名不可超過 20 字元'),
  treatmentIds: z.array(z.string().uuid('診療項目 ID 格式無效')).optional(),
})

/**
 * PUT /api/admin/doctors/{id}
 * 管理員編輯醫師姓名
 *
 * Feature: 管理醫師資料.feature
 * Rules:
 * - 可編輯醫師姓名
 * - 姓名必須為 2-20 字元
 */
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

    const { id: doctorId } = await params
    const body = await request.json()

    // 驗證輸入
    const validationResult = updateDoctorSchema.safeParse(body)
    if (!validationResult.success) {
      const firstError = validationResult.error.issues?.[0]?.message || '參數格式錯誤'
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: firstError },
      }, { status: 400 })
    }

    const { name, treatmentIds } = validationResult.data

    // 檢查醫師是否存在
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        doctorTreatments: {
          select: { treatmentTypeId: true },
        },
      },
    })

    if (!existingDoctor) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '醫師不存在' },
      }, { status: 404 })
    }

    // 使用事務更新醫師姓名和診療項目關聯
    const updatedDoctor = await prisma.$transaction(async (tx) => {
      // 更新醫師姓名
      const doctor = await tx.doctor.update({
        where: { id: doctorId },
        data: { name },
      })

      // 如果有傳入 treatmentIds，更新診療項目關聯
      if (treatmentIds !== undefined) {
        // 刪除現有關聯
        await tx.doctorTreatment.deleteMany({
          where: { doctorId },
        })

        // 建立新關聯
        if (treatmentIds.length > 0) {
          await tx.doctorTreatment.createMany({
            data: treatmentIds.map(treatmentTypeId => ({
              doctorId,
              treatmentTypeId,
            })),
          })
        }
      }

      // 返回更新後的醫師（含診療項目）
      return tx.doctor.findUnique({
        where: { id: doctorId },
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
    })

    // 記錄操作日誌
    const oldTreatmentIds = existingDoctor.doctorTreatments.map(dt => dt.treatmentTypeId)
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'UPDATE_DOCTOR',
        targetType: 'doctor',
        targetId: doctorId,
        details: {
          oldName: existingDoctor.name,
          newName: name,
          oldTreatmentIds,
          newTreatmentIds: treatmentIds || oldTreatmentIds,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDoctor,
    })

  } catch (error) {
    console.error('[PUT /api/admin/doctors/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '編輯醫師失敗' },
    }, { status: 500 })
  }
}
