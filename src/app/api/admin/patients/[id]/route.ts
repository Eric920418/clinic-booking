// src/app/api/admin/patients/[id]/route.ts
// Feature: 管理病患資料
// API: 取得/編輯病患資料
// 紅燈階段：僅定義介面，不實作業務邏輯

import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/admin/patients/{patientId}
 * 取得病患詳情
 *
 * @returns PatientResponse
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // 紅燈階段：返回未實作錯誤
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: 'API 尚未實作',
    },
    { status: 501 }
  )
}

/**
 * PATCH /api/admin/patients/{patientId}
 * 編輯病患備註
 *
 * Request Body:
 * {
 *   notes: string  // 病患備註（內部註記）
 * }
 *
 * @returns PatientResponse
 *
 * Feature File Reference:
 * - Rule: 可編輯病患備註
 * - Example: 新增病患備註
 * - Example: 修改病患備註
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // 紅燈階段：返回未實作錯誤
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: 'API 尚未實作',
    },
    { status: 501 }
  )
}
