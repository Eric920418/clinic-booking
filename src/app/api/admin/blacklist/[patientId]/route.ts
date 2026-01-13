// src/app/api/admin/blacklist/[patientId]/route.ts
// 移除黑名單 API
// Feature: 黑名單管理.feature

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, isSuperAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    patientId: string
  }>
}

/**
 * DELETE /api/admin/blacklist/{patientId}
 * 管理員移除黑名單
 *
 * 業務規則：
 * - 超級管理員可手動移除黑名單
 * - 一般管理員無法移除黑名單
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { patientId } = await params

    // 1. 驗證管理員身份
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: '請先登入',
        },
        { status: 401 }
      )
    }

    // 2. 檢查是否為超級管理員
    if (!isSuperAdmin(currentUser)) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: '一般管理員無法移除黑名單',
        },
        { status: 403 }
      )
    }

    // 3. 檢查病患是否存在
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { blacklist: true },
    })

    if (!patient) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: '找不到病患',
        },
        { status: 404 }
      )
    }

    // 4. 使用交易移除黑名單
    await prisma.$transaction(async (tx) => {
      // 刪除黑名單記錄
      if (patient.blacklist) {
        await tx.blacklist.delete({
          where: { patientId },
        })
      }

      // 更新病患的黑名單狀態
      await tx.patient.update({
        where: { id: patientId },
        data: { isBlacklisted: false },
      })
    })

    return NextResponse.json({
      success: true,
      message: '已成功移除黑名單',
    })
  } catch (error) {
    console.error('[DELETE /api/admin/blacklist/{patientId}]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '移除黑名單失敗',
      },
      { status: 500 }
    )
  }
}
