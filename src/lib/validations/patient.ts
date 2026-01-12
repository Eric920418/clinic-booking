/**
 * 病患資料驗證
 * 對應規格：spec/features/病患資料處理.feature
 */
import { z } from 'zod';

/**
 * 台灣身分證字號驗證
 * 對應規格：身分證字號必須符合台灣身分證格式
 * - 1碼英文（有效縣市代碼）
 * - 1碼性別碼（1=男, 2=女）
 * - 8碼數字 + 1碼檢查碼
 */
export function validateTaiwanNationalId(id: string): boolean {
  // 規則：格式必須為 1碼英文 + 9碼數字
  if (!/^[A-Z][0-9]{9}$/.test(id)) {
    return false;
  }

  // 規則：首字母必須為有效縣市代碼
  const validAreaCodes: Record<string, number> = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17,
    I: 34, J: 18, K: 19, L: 20, M: 21, N: 22, O: 35, P: 23,
    Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30,
    Y: 31, Z: 33,
  };

  const firstLetter = id[0];
  if (!(firstLetter in validAreaCodes)) {
    return false;
  }

  // 規則：第2碼必須為性別碼（1=男, 2=女）
  const genderCode = id[1];
  if (genderCode !== '1' && genderCode !== '2') {
    return false;
  }

  // 規則：驗證檢查碼
  const areaCode = validAreaCodes[firstLetter];
  const n1 = Math.floor(areaCode / 10);
  const n2 = areaCode % 10;

  const weights = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  let sum = n1 * weights[0] + n2 * weights[1];

  for (let i = 1; i < 10; i++) {
    sum += parseInt(id[i]) * weights[i + 1];
  }

  return sum % 10 === 0;
}

/**
 * 病患資料 Schema
 * 對應規格：第 3.2.1 節 資料欄位
 */
export const patientSchema = z.object({
  // 姓名：2-20 字元，中英文皆可
  name: z
    .string()
    .min(2, '姓名至少 2 個字元')
    .max(20, '姓名最多 20 個字元'),
  
  // 電話：台灣手機格式 09xxxxxxxx
  phone: z
    .string()
    .regex(/^09\d{8}$/, '請輸入有效的台灣手機號碼（09xxxxxxxx）'),
  
  // 身分證字號：台灣身分證格式驗證
  nationalId: z
    .string()
    .refine(validateTaiwanNationalId, '請輸入有效的台灣身分證字號'),
  
  // 出生年月日：不可為未來日期
  birthDate: z
    .string()
    .or(z.date())
    .transform((val) => (typeof val === 'string' ? new Date(val) : val))
    .refine((date) => date <= new Date(), '出生日期不可為未來日期'),
});

export type PatientInput = z.infer<typeof patientSchema>;

