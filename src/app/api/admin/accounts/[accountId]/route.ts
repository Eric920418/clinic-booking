// src/app/api/admin/accounts/[accountId]/route.ts
// Feature: 管理帳號
// API: 取得/編輯帳號資料

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isSuperAdmin, hashPassword } from '@/lib/auth'
import { type ApiResponse } from '@/types'

interface RouteParams {
  params: Promise<{ accountId: string }>
}

/**
 * GET /api/admin/accounts/{accountId}
 * 取得帳號詳情
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    if (!isSuperAdmin(currentUser)) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '僅超級管理員可查看帳號' },
      }, { status: 403 })
    }

    const { accountId } = await params

    const account = await prisma.adminUser.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!account) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '帳號不存在' },
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: account,
    })

  } catch (error) {
    console.error('[GET /api/admin/accounts/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '取得帳號資料失敗' },
    }, { status: 500 })
  }
}

/**
 * PUT /api/admin/accounts/{accountId}
 * 編輯帳號資料
 *
 * Rules:
 * - 僅超級管理員可編輯帳號
 * - 可更新名稱、角色、密碼
 * - 密碼如有提供，必須符合規則（8字元以上、含大小寫和數字）
 */
const updateAccountSchema = z.object({
  name: z.string().min(1, '名稱不可為空').max(50, '名稱最多 50 字元').optional(),
  role: z.enum(['super_admin', 'admin'], { message: '角色必須為 super_admin 或 admin' }).optional(),
  newPassword: z.string()
    .min(8, '密碼最小長度為 8 字元')
    .regex(/[A-Z]/, '密碼必須包含大寫字母')
    .regex(/[a-z]/, '密碼必須包含小寫字母')
    .regex(/[0-9]/, '密碼必須包含數字')
    .optional()
    .or(z.literal('')),
})

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse>> {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '未登入' },
      }, { status: 401 })
    }

    if (!isSuperAdmin(currentUser)) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '僅超級管理員可編輯帳號' },
      }, { status: 403 })
    }

    const { accountId } = await params
    const body = await request.json()
    const parsed = updateAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: parsed.error.issues[0].message },
      }, { status: 400 })
    }

    const { name, role, newPassword } = parsed.data

    // 檢查帳號是否存在
    const existingAccount = await prisma.adminUser.findUnique({
      where: { id: accountId },
    })

    if (!existingAccount) {
      return NextResponse.json({
        success: false,
        error: { code: 'E001', message: '帳號不存在' },
      }, { status: 404 })
    }

    // 建立更新資料
    const updateData: {
      name?: string
      role?: 'super_admin' | 'admin'
      passwordHash?: string
    } = {}

    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (newPassword && newPassword.length > 0) {
      updateData.passwordHash = await hashPassword(newPassword)
    }

    // 更新帳號
    const updatedAccount = await prisma.adminUser.update({
      where: { id: accountId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedAccount,
    })

  } catch (error) {
    console.error('[PUT /api/admin/accounts/:id]', error)
    return NextResponse.json({
      success: false,
      error: { code: 'E001', message: '更新帳號失敗' },
    }, { status: 500 })
  }
}
