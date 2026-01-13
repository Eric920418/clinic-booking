// src/app/api/system/blacklist-check/route.ts
// 系統執行每日黑名單批次檢查
// Feature: 黑名單管理.feature
// Rule: 未報到累計達 3 次自動加入黑名單（批次處理）

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

/**
 * POST /api/system/blacklist-check
 * 系統執行每日黑名單批次檢查
 *
 * 業務規則：
 * - 檢查所有 noShowCount >= 3 且 isBlacklisted = false 的病患
 * - 將這些病患的 isBlacklisted 設為 true
 * - 建立對應的 Blacklist 記錄
 */
export async function POST() {
  try {
    // 1. 查詢所有未報到次數 >= 3 且尚未加入黑名單的病患
    const patientsToBlacklist = await prisma.patient.findMany({
      where: {
        noShowCount: { gte: 3 },
        isBlacklisted: false,
      },
    })

    // 2. 批次處理每個病患
    const blacklistedPatients: Array<{ patientId: string; noShowCount: number }> = []

    for (const patient of patientsToBlacklist) {
      // 使用交易確保原子性
      await prisma.$transaction(async (tx) => {
        // 更新病患的黑名單狀態
        await tx.patient.update({
          where: { id: patient.id },
          data: { isBlacklisted: true },
        })

        // 建立黑名單記錄
        await tx.blacklist.create({
          data: {
            patientId: patient.id,
            reason: '累計未報到 3 次',
            createdBy: null, // 系統自動處理
          },
        })
      })

      blacklistedPatients.push({
        patientId: patient.id,
        noShowCount: patient.noShowCount,
      })
    }

    return NextResponse.json({
      success: true,
      processedCount: blacklistedPatients.length,
      blacklistedPatients,
    })
  } catch (error) {
    console.error('[POST /api/system/blacklist-check]', error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: '黑名單批次檢查失敗',
      },
      { status: 500 }
    )
  }
}
