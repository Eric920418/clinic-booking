/**
 * 認證工具
 * 對應規格：第 4.1.1 節 登入安全機制
 */
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { AdminRole } from '@/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'clinic-booking-dev-secret-key-32chars'
);

// Session 有效期 24 小時
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  exp?: number;
  iat?: number;
}

/**
 * 產生 JWT Token
 * 對應規格：Session 有效期 24 小時
 */
export async function createToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * 驗證 JWT Token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 密碼雜湊
 * 對應規格：密碼加密儲存（bcrypt）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * 密碼驗證
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 設定認證 Cookie
 */
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('admin-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

/**
 * 取得認證 Cookie
 */
export async function getAuthCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('admin-token')?.value;
}

/**
 * 清除認證 Cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin-token');
}

/**
 * 取得當前登入用戶
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}

/**
 * 檢查是否為超級管理員
 */
export function isSuperAdmin(user: JWTPayload | null): boolean {
  return user?.role === 'super_admin';
}

