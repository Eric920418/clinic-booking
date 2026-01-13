// src/app/api/admin/accounts/route.ts
// 管理帳號 API - POST /api/admin/accounts
// Feature: 管理帳號.feature

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminSchema } from '@/lib/validations/admin'
import { getCurrentUser, isSuperAdmin, hashPassword } from '@/lib/auth'
import { ZodError } from 'zod'

/**
 * POST /api/admin/accounts
 * 超級管理員新增帳號
 *
 * Rules:
 * - 僅超級管理員可管理帳號
 * - 帳號必須使用 Email 格式
 * - Email 必須唯一
 * - 密碼最小長度為 8 字元
 * - 密碼必須包含大寫、小寫、數字
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證當前用戶是否為超級管理員
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登入' },
        { status: 401 }
      )
    }

    if (!isSuperAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, error: '僅超級管理員可新增帳號' },
        { status: 403 }
      )
    }

    // 2. 解析並驗證 request body
    const body = await request.json()
    const validatedData = createAdminSchema.parse(body)

    // 3. 檢查 Email 是否已存在
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: validatedData.email },
    })

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Email 已被使用' },
        { status: 409 }
      )
    }

    // 4. 雜湊密碼
    const passwordHash = await hashPassword(validatedData.password)

    // 5. 建立管理員帳號
    const adminUser = await prisma.adminUser.create({
      data: {
        email: validatedData.email,
        passwordHash,
        name: validatedData.name,
        role: validatedData.role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { success: true, data: adminUser },
      { status: 201 }
    )
  } catch (error) {
    // Zod 驗證錯誤
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as ZodError
      const firstIssue = zodError.issues?.[0]
      const errorMessage = firstIssue?.message || '驗證失敗'
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      )
    }

    console.error('建立管理員帳號失敗:', error)
    return NextResponse.json(
      { success: false, error: '建立帳號失敗' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/accounts
 * 取得所有管理員帳號列表
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 驗證當前用戶是否為超級管理員
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: '未登入' },
        { status: 401 }
      )
    }

    if (!isSuperAdmin(currentUser)) {
      return NextResponse.json(
        { success: false, error: '僅超級管理員可查看帳號列表' },
        { status: 403 }
      )
    }

    // 2. 取得所有管理員帳號
    const adminUsers = await prisma.adminUser.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: adminUsers })
  } catch (error) {
    console.error('取得管理員列表失敗:', error)
    return NextResponse.json(
      { success: false, error: '取得帳號列表失敗' },
      { status: 500 }
    )
  }
}
