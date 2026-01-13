// src/app/api/admin/patients/[id]/route.ts
// Feature: 管理病患資料
// API: 取得/編輯病患資料
// 對應規格：spec/features/管理病患資料.feature

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =============================================
// GET: 取得病患詳情
// =============================================
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '未登入' },
    }, { status: 401 })
  }

  // TODO: 實作取得病患詳情
  return NextResponse.json({
    success: false,
    error: { code: 'E001', message: 'Not implemented' },
  }, { status: 501 })
}

// =============================================
// PATCH: 編輯病患備註
// 對應規格：
// - Rule: 可編輯病患備註
// - Example: 新增病患備註
// - Example: 修改病患備註
// =============================================
const updatePatientNotesSchema = z.object({
  notes: z.string().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    // 驗證管理員認證
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { id } = await params

    // 解析並驗證 request body
    const body = await request.json()
    const parsed = updatePatientNotesSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { notes } = parsed.data

    // 查詢病患是否存在
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    })

    if (!existingPatient) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '病患不存在' },
      }, { status: 404 })
    }

    // 更新病患備註
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: { notes },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPatient.id,
        notes: updatedPatient.notes,
        message: '病患備註更新成功',
      },
    })

  } catch (error) {
    console.error('[PATCH /api/admin/patients/:id]', error)

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新病患備註失敗' },
    }, { status: 500 })
  }
}
