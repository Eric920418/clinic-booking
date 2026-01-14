// src/app/api/line/entry/route.ts
// Feature: LINE 入口驗證
// API: POST /api/line/entry

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// 申訴管道資訊（可設定為環境變數或常數）
const APPEAL_INFO = '如有疑問，請聯繫診所櫃台或撥打客服專線：02-1234-5678'

// Request Body Schema
const lineEntrySchema = z.object({
  line_user_id: z.string().min(1, 'LINE User ID 為必填'),
})

/**
 * LINE 入口驗證 API
 *
 * 檢查用戶是否在黑名單中：
 * - 黑名單用戶：返回 403，包含停權原因與申訴管道
 * - 非黑名單用戶：返回 200，導向真人驗證流程
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 解析並驗證 Request Body
    const body = await request.json()
    const validatedData = lineEntrySchema.parse(body)
    const { line_user_id } = validatedData

    // 2. 查詢病患資料（含黑名單關聯）
    const patient = await prisma.patient.findUnique({
      where: { lineUserId: line_user_id },
      include: {
        blacklist: true,
      },
    })

    // 3. 若無病患記錄（新用戶），允許進入驗證流程
    if (!patient) {
      return NextResponse.json({
        success: true,
        next_step: 'verification',
      })
    }

    // 4. 檢查是否在黑名單中
    if (patient.isBlacklisted) {
      // 取得黑名單原因
      const reason = patient.blacklist?.reason || '違反使用規定'

      return NextResponse.json(
        {
          error: 'BLACKLISTED',
          message: '您已被停權，無法使用預約服務',
          reason,
          appeal_info: APPEAL_INFO,
        },
        { status: 403 }
      )
    }

    // 5. 非黑名單用戶，允許進入驗證流程
    return NextResponse.json({
      success: true,
      next_step: 'verification',
      patient_id: patient.id,
    })
  } catch (error) {
    // Zod 驗證錯誤
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || '請求資料格式錯誤',
        },
        { status: 400 }
      )
    }

    // 其他錯誤
    console.error('LINE Entry API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '系統錯誤，請稍後再試',
      },
      { status: 500 }
    )
  }
}
