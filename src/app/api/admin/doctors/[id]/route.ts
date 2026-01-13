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
      const firstError = validationResult.error.errors?.[0]?.message || '參數格式錯誤'
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: firstError },
      }, { status: 400 })
    }

    const { name } = validationResult.data

    // 檢查醫師是否存在
    const existingDoctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
    })

    if (!existingDoctor) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '醫師不存在' },
      }, { status: 404 })
    }

    // 更新醫師姓名
    const updatedDoctor = await prisma.doctor.update({
      where: { id: doctorId },
      data: { name },
    })

    // 記錄操作日誌
    await prisma.operationLog.create({
      data: {
        adminUserId: user.userId,
        action: 'UPDATE_DOCTOR',
        targetType: 'doctor',
        targetId: doctorId,
        details: {
          oldName: existingDoctor.name,
          newName: name,
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
