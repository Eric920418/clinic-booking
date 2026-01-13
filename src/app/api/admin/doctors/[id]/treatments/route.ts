// src/app/api/admin/doctors/[id]/treatments/route.ts
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
const addDoctorTreatmentSchema = z.object({
  treatmentTypeId: z.string().uuid(),
})

/**
 * POST /api/admin/doctors/{id}/treatments
 * 為醫師新增可看診項目
 *
 * Feature: 管理醫師資料.feature
 * Rules:
 * - 可設定醫師可看診項目
 * - 相同醫師不可重複關聯相同診療項目
 */
export async function POST(
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
    const validationResult = addDoctorTreatmentSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '參數格式錯誤' },
      }, { status: 400 })
    }

    const { treatmentTypeId } = validationResult.data

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

    // 檢查診療類型是否存在
    const treatmentType = await prisma.treatmentType.findUnique({
      where: { id: treatmentTypeId },
    })

    if (!treatmentType) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '診療類型不存在' },
      }, { status: 404 })
    }

    // 檢查是否已經存在關聯（相同醫師不可重複關聯相同診療項目）
    const existingRelation = await prisma.doctorTreatment.findUnique({
      where: {
        doctorId_treatmentTypeId: {
          doctorId,
          treatmentTypeId,
        },
      },
    })

    if (existingRelation) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '此醫師已關聯此診療類型' },
      }, { status: 400 })
    }

    // 建立關聯
    const doctorTreatment = await prisma.doctorTreatment.create({
      data: {
        doctorId,
        treatmentTypeId,
      },
      include: {
        doctor: true,
        treatmentType: true,
      },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'ADD_DOCTOR_TREATMENT',
        targetType: 'doctor_treatment',
        targetId: doctorTreatment.id,
        details: {
          doctorId,
          doctorName: doctor.name,
          treatmentTypeId,
          treatmentTypeName: treatmentType.name,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: doctorTreatment,
    })

  } catch (error) {
    console.error('[POST /api/admin/doctors/:id/treatments]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '新增醫師診療項目失敗' },
    }, { status: 500 })
  }
}
