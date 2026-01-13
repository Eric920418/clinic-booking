// tests/e2e/helpers/auth.ts
// 認證輔助函式

import { APIRequestContext } from '@playwright/test'

/**
 * 以管理員身份登入並返回帶有認證 Cookie 的請求上下文
 *
 * @param request Playwright APIRequestContext
 * @param email 管理員 email
 * @param password 管理員密碼
 * @returns 登入後的 token（用於後續請求）
 */
export async function loginAsAdmin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string | null> {
  const response = await request.post('/api/admin/auth/login', {
    data: { email, password },
  })

  if (!response.ok()) {
    return null
  }

  // 從 Set-Cookie header 取得 token
  const cookies = response.headers()['set-cookie']
  if (cookies) {
    const match = cookies.match(/admin-token=([^;]+)/)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * 創建帶有認證 header 的請求選項
 *
 * @param token 認證 token
 * @returns 請求選項
 */
export function withAuth(token: string) {
  return {
    headers: {
      Cookie: `admin-token=${token}`,
    },
  }
}

/**
 * 合併認證 header 與其他請求選項
 */
export function withAuthAndData<T>(token: string, data: T) {
  return {
    headers: {
      Cookie: `admin-token=${token}`,
    },
    data,
  }
}
