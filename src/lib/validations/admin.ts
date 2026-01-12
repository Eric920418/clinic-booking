/**
 * 管理員相關驗證
 * 對應規格：spec/features/管理員登入.feature
 */
import { z } from 'zod';

/**
 * 登入 Schema
 * 對應規格：第 4.1.1 節 登入
 */
export const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '請輸入密碼'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * 密碼驗證規則
 * 對應規格：第 4.6.3 節 密碼設定
 * - 最小長度：8 字元
 * - 需包含：大寫、小寫、數字
 */
export const passwordSchema = z
  .string()
  .min(8, '密碼至少 8 個字元')
  .regex(/[A-Z]/, '密碼需包含至少一個大寫字母')
  .regex(/[a-z]/, '密碼需包含至少一個小寫字母')
  .regex(/[0-9]/, '密碼需包含至少一個數字');

/**
 * 建立管理員 Schema
 * 對應規格：第 4.6.1 節 帳號管理
 */
export const createAdminSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: passwordSchema,
  name: z.string().min(1, '請輸入姓名'),
  role: z.enum(['admin', 'super_admin']).default('admin'),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;

/**
 * 更新管理員 Schema
 */
export const updateAdminSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'super_admin']).optional(),
  isActive: z.boolean().optional(),
  language: z.enum(['zh-TW', 'en']).optional(),
  timezone: z.string().optional(),
});

export type UpdateAdminInput = z.infer<typeof updateAdminSchema>;

/**
 * 重設密碼 Schema
 */
export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

