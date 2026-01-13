// tests/e2e/factories/admin-user.ts
// 管理員帳號測試資料工廠

import { prisma } from '../helpers/db'
import bcrypt from 'bcryptjs'

interface AdminUserData {
  email?: string
  password?: string // 明文密碼，會自動雜湊
  name?: string
  role?: 'admin' | 'super_admin'
  isActive?: boolean
  failedLoginCount?: number
  lockedUntil?: Date | null
}

/**
 * 建立測試用管理員帳號
 *
 * @param data - 管理員資料（可選）
 * @returns 建立的管理員記錄（含 plainPassword 供測試使用）
 *
 * @example
 * // 建立預設管理員
 * const admin = await createAdminUser()
 *
 * // 建立停用帳號
 * const inactiveAdmin = await createAdminUser({ isActive: false })
 *
 * // 建立已鎖定帳號
 * const lockedAdmin = await createAdminUser({
 *   failedLoginCount: 5,
 *   lockedUntil: new Date('2026-01-15T10:15:00'),
 * })
 */
export async function createAdminUser(data: AdminUserData = {}) {
  const timestamp = Date.now()
  const plainPassword = data.password ?? 'Password123'

  // 雜湊密碼
  const passwordHash = await bcrypt.hash(plainPassword, 10)

  const adminUser = await prisma.adminUser.create({
    data: {
      email: data.email ?? `admin${timestamp}@example.com`,
      passwordHash,
      name: data.name ?? '測試管理員',
      role: data.role ?? 'admin',
      isActive: data.isActive ?? true,
      failedLoginCount: data.failedLoginCount ?? 0,
      lockedUntil: data.lockedUntil ?? null,
    },
  })

  // 回傳時附帶明文密碼供測試使用
  return {
    ...adminUser,
    plainPassword,
  }
}

/**
 * 建立已鎖定的管理員帳號
 *
 * @param lockedUntil - 鎖定至何時
 */
export async function createLockedAdminUser(lockedUntil: Date) {
  return createAdminUser({
    failedLoginCount: 5,
    lockedUntil,
  })
}

/**
 * 建立停用的管理員帳號
 */
export async function createInactiveAdminUser() {
  return createAdminUser({
    isActive: false,
  })
}

/**
 * 建立超級管理員帳號
 */
export async function createSuperAdminUser(data: Omit<AdminUserData, 'role'> = {}) {
  return createAdminUser({
    ...data,
    role: 'super_admin',
  })
}
