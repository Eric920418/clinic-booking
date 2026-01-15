// src/app/api/admin/patients/[id]/route.ts
// Feature: 管理病患資料
// API: 取得/編輯病患資料
// 對應規格：spec/features/管理病患資料.feature

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { type ApiResponse } from '@/types'
import { validateTaiwanNationalId } from '@/lib/validations/patient'

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
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    const { id } = await params

    const patient = await prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        nationalId: true,
        birthDate: true,
        notes: true,
        noShowCount: true,
        isBlacklisted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!patient) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '病患不存在' },
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        nationalId: patient.nationalId,
        birthDate: patient.birthDate.toISOString().split('T')[0],
        notes: patient.notes,
        noShowCount: patient.noShowCount,
        isBlacklisted: patient.isBlacklisted,
        createdAt: patient.createdAt.toISOString(),
        updatedAt: patient.updatedAt.toISOString(),
      },
    })

  } catch (error) {
    console.error('[GET /api/admin/patients/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得病患資料失敗' },
    }, { status: 500 })
  }
}

// =============================================
// PATCH: 編輯病患資料
// 對應規格：
// - Rule: 可編輯病患資料
// - 支援更新：姓名、電話、身分證、出生日期、備註
// =============================================
const updatePatientSchema = z.object({
  name: z.string().min(2, '姓名至少 2 個字元').max(20, '姓名最多 20 個字元').optional(),
  phone: z.string().regex(/^09\d{8}$/, '請輸入有效的台灣手機號碼').optional(),
  nationalId: z.string().refine(
    (val) => !val || validateTaiwanNationalId(val),
    '請輸入有效的台灣身分證字號'
  ).optional(),
  birthDate: z.string().optional(),
  notes: z.string().nullable().optional(),
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
    const parsed = updatePatientSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { name, phone, nationalId, birthDate, notes } = parsed.data

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

    // 如果要更新身分證字號，檢查是否與其他患者重複
    if (nationalId && nationalId !== existingPatient.nationalId) {
      const duplicatePatient = await prisma.patient.findUnique({
        where: { nationalId },
      })
      if (duplicatePatient) {
        return NextResponse.json({
          success: false,
          error: { code: 'E001', message: '此身分證字號已被其他患者使用' },
        }, { status: 400 })
      }
    }

    // 建立更新資料物件
    const updateData: {
      name?: string
      phone?: string
      nationalId?: string
      birthDate?: Date
      notes?: string | null
    } = {}

    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (nationalId !== undefined) updateData.nationalId = nationalId
    if (birthDate !== undefined) updateData.birthDate = new Date(birthDate)
    if (notes !== undefined) updateData.notes = notes

    // 更新病患資料
    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPatient.id,
        name: updatedPatient.name,
        phone: updatedPatient.phone,
        nationalId: updatedPatient.nationalId,
        birthDate: updatedPatient.birthDate.toISOString().split('T')[0],
        notes: updatedPatient.notes,
        message: '病患資料更新成功',
      },
    })

  } catch (error) {
    console.error('[PATCH /api/admin/patients/:id]', error)

    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新病患資料失敗' },
    }, { status: 500 })
  }
}

// =============================================
// DELETE: 刪除病患資料
// 注意：有預約記錄的病患無法刪除
// =============================================
export async function DELETE(
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

    const { id } = await params

    // 查詢病患是否存在，並檢查是否有預約記錄
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        _count: { select: { appointments: true } },
        blacklist: true,
      },
    })

    if (!patient) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '病患不存在' },
      }, { status: 404 })
    }

    // 檢查是否有預約記錄
    if (patient._count.appointments > 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'E001',
          message: `無法刪除：此病患有 ${patient._count.appointments} 筆預約記錄`
        },
      }, { status: 400 })
    }

    // 使用交易刪除病患及關聯的黑名單記錄
    await prisma.$transaction(async (tx) => {
      // 先刪除黑名單記錄（如果有）
      if (patient.blacklist) {
        await tx.blacklist.delete({
          where: { patientId: id },
        })
      }
      // 再刪除病患
      await tx.patient.delete({
        where: { id },
      })
    })

    return NextResponse.json({
      success: true,
      data: { message: '病患資料已刪除' },
    })

  } catch (error) {
    console.error('[DELETE /api/admin/patients/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '刪除病患資料失敗' },
    }, { status: 500 })
  }
}
