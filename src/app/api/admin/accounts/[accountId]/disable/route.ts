// src/app/api/admin/accounts/[accountId]/disable/route.ts
// 管理帳號 API - POST /api/admin/accounts/{accountId}/disable
// Feature: 管理帳號.feature

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, isSuperAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    accountId: string
  }>
}

/**
 * POST /api/admin/accounts/{accountId}/disable
 * 超級管理員停用帳號
 *
 * Rules:
 * - 僅超級管理員可停用帳號
 * - 停用帳號後狀態更新為 isActive = false
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { accountId } = await params

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
        { success: false, error: '僅超級管理員可停用帳號' },
        { status: 403 }
      )
    }

    // 2. 檢查目標帳號是否存在
    const targetAdmin = await prisma.adminUser.findUnique({
      where: { id: accountId },
    })

    if (!targetAdmin) {
      return NextResponse.json(
        { success: false, error: '找不到指定的帳號' },
        { status: 404 }
      )
    }

    // 3. 防止停用自己的帳號
    if (targetAdmin.id === currentUser.userId) {
      return NextResponse.json(
        { success: false, error: '不可停用自己的帳號' },
        { status: 400 }
      )
    }

    // 4. 停用帳號
    const updatedAdmin = await prisma.adminUser.update({
      where: { id: accountId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updatedAdmin })
  } catch (error) {
    console.error('停用帳號失敗:', error)
    return NextResponse.json(
      { success: false, error: '停用帳號失敗' },
      { status: 500 }
    )
  }
}
