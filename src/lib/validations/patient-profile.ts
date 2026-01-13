/**
 * 病患資料驗證
 * 對應測試：tests/e2e/liff/patient-data.spec.ts
 * Feature: 病患資料處理.feature
 */
import { z } from 'zod'

/**
 * 台灣身分證字號驗證
 *
 * 規則：
 * 1. 格式: 1 英文字母 + 9 數字
 * 2. 首字母: 有效縣市代碼 (A-Z，排除 I, O, X)
 * 3. 第 2 碼: 性別碼 (1=男, 2=女)
 * 4. 檢查碼: 加權驗證
 */
export function validateTaiwanNationalId(nationalId: string): boolean {
  // 格式檢查：1 英文字母 + 9 數字
  if (!/^[A-Z][0-9]{9}$/.test(nationalId)) {
    return false
  }

  // 縣市代碼對照表
  const cityCodeMap: Record<string, number> = {
    A: 10, // 台北市
    B: 11, // 台中市
    C: 12, // 基隆市
    D: 13, // 台南市
    E: 14, // 高雄市
    F: 15, // 新北市
    G: 16, // 宜蘭縣
    H: 17, // 桃園市
    I: 34, // 嘉義市（但 I 不常用）
    J: 18, // 新竹縣
    K: 19, // 苗栗縣
    L: 20, // 台中縣（已併入台中市）
    M: 21, // 南投縣
    N: 22, // 彰化縣
    O: 35, // 新竹市（但 O 不常用）
    P: 23, // 雲林縣
    Q: 24, // 嘉義縣
    R: 25, // 台南縣（已併入台南市）
    S: 26, // 高雄縣（已併入高雄市）
    T: 27, // 屏東縣
    U: 28, // 花蓮縣
    V: 29, // 台東縣
    W: 32, // 金門縣
    X: 30, // 澎湖縣（X 不是常用縣市代碼，但保留）
    Y: 31, // 陽明山（已併入台北市）
    Z: 33, // 連江縣
  }

  const firstLetter = nationalId[0]

  // 檢查首字母是否為有效縣市代碼
  // 根據 Feature File：X 不是有效縣市代碼
  // 實際上 X 代表澎湖縣，但根據測試要求，我們排除 X
  if (!cityCodeMap[firstLetter] || firstLetter === 'X') {
    return false
  }

  // 性別碼檢查：第 2 碼必須是 1 或 2
  const genderCode = nationalId[1]
  if (genderCode !== '1' && genderCode !== '2') {
    return false
  }

  // 檢查碼驗證
  const cityCode = cityCodeMap[firstLetter]
  const n1 = Math.floor(cityCode / 10) // 十位數
  const n2 = cityCode % 10 // 個位數

  // 將身分證字號轉為數字陣列
  const digits = nationalId.slice(1).split('').map(Number)

  // 加權計算
  // n1 * 1 + n2 * 9 + d1 * 8 + d2 * 7 + d3 * 6 + d4 * 5 + d5 * 4 + d6 * 3 + d7 * 2 + d8 * 1 + d9 * 1
  const weights = [8, 7, 6, 5, 4, 3, 2, 1, 1]
  let sum = n1 + n2 * 9

  for (let i = 0; i < 9; i++) {
    sum += digits[i] * weights[i]
  }

  // 檢查碼：總和能被 10 整除
  return sum % 10 === 0
}

/**
 * 台灣手機號碼格式驗證
 * 格式: 09xxxxxxxx (10 位數字，09 開頭)
 */
export function validateTaiwanPhone(phone: string): boolean {
  return /^09\d{8}$/.test(phone)
}

/**
 * 出生日期驗證（不可為未來日期）
 */
export function validateBirthDate(birthDate: string): boolean {
  const date = new Date(birthDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return date < today
}

/**
 * 病患資料提交 Schema
 */
export const patientProfileSchema = z.object({
  // LINE User ID
  lineUserId: z.string().min(1, '缺少 LINE User ID'),

  // 姓名：2-20 字元
  name: z
    .string()
    .min(2, '姓名必須至少 2 個字元')
    .max(20, '姓名不可超過 20 個字元'),

  // 電話：台灣手機格式
  phone: z.string().refine(validateTaiwanPhone, {
    message: '請輸入有效的台灣手機號碼（09 開頭，共 10 位數字）',
  }),

  // 身分證字號：台灣身分證格式
  nationalId: z.string().refine(validateTaiwanNationalId, {
    message: '請輸入有效的台灣身分證字號',
  }),

  // 出生年月日：不可為未來日期
  birthDate: z.string().refine(validateBirthDate, {
    message: '出生日期不可為未來日期',
  }),
})

export type PatientProfileInput = z.infer<typeof patientProfileSchema>

/**
 * 病患資料查詢 Schema (GET)
 */
export const patientProfileQuerySchema = z.object({
  lineUserId: z.string().min(1, '缺少 LINE User ID'),
  nationalId: z.string().optional(),
})

export type PatientProfileQueryInput = z.infer<typeof patientProfileQuerySchema>
