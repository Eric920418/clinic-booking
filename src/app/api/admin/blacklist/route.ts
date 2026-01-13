// src/app/api/admin/blacklist/route.ts
// 黑名單管理 API
// Feature: 黑名單管理.feature

import { NextResponse } from 'next/server'

/**
 * GET /api/admin/blacklist
 * 取得黑名單列表
 *
 * 回應格式（根據 api.yml）：
 * Array<{
 *   id: string,
 *   patientId: string,
 *   patientName: string,
 *   reason: string,
 *   createdBy: string,
 *   createdAt: string
 * }>
 */
export async function GET() {
  // 紅燈階段：不實作業務邏輯，返回 501 Not Implemented
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: '取得黑名單列表功能尚未實作',
    },
    { status: 501 }
  )
}

/**
 * POST /api/admin/blacklist
 * 管理員加入黑名單
 *
 * 業務規則：
 * - 超級管理員可手動加入黑名單
 * - 黑名單操作必須記錄操作人、時間與原因
 *
 * 請求格式（根據 api.yml）：
 * {
 *   patientId: string,
 *   reason: string
 * }
 *
 * 回應格式：
 * {
 *   id: string,
 *   patientId: string,
 *   patientName: string,
 *   reason: string,
 *   createdBy: string,
 *   createdAt: string
 * }
 */
export async function POST() {
  // 紅燈階段：不實作業務邏輯，返回 501 Not Implemented
  return NextResponse.json(
    {
      success: false,
      error: 'NOT_IMPLEMENTED',
      message: '加入黑名單功能尚未實作',
    },
    { status: 501 }
  )
}
