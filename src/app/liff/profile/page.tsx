/**
 * 基本資料頁面
 * 用戶填寫個人資料：姓名、電話、身分證、出生日期
 * 會自動載入緩存的資料，不用每次重填
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiffAuth } from '@/contexts/LiffAuthContext';

interface FormData {
  name: string;
  phone: string;
  idNumber: string;
  birthDate: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  idNumber?: string;
  birthDate?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { userProfile, setUserProfile, isLoading: isAuthLoading, lineProfile } = useLiffAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    idNumber: '',
    birthDate: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // 載入緩存的用戶資料
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        idNumber: userProfile.idNumber || '',
        birthDate: userProfile.birthDate || '',
      });
    }
  }, [userProfile]);

  // 驗證身分證字號格式
  const validateIdNumber = (id: string): boolean => {
    const regex = /^[A-Z][12]\d{8}$/;
    return regex.test(id.toUpperCase());
  };

  // 驗證電話格式
  const validatePhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 && cleaned.startsWith('09');
  };

  // 驗證出生日期格式 (民國年)
  const validateBirthDate = (date: string): boolean => {
    const cleaned = date.replace(/\D/g, '');
    if (cleaned.length !== 7) return false;
    const year = parseInt(cleaned.substring(0, 3));
    const month = parseInt(cleaned.substring(3, 5));
    const day = parseInt(cleaned.substring(5, 7));
    return year >= 1 && year <= 113 && month >= 1 && month <= 12 && day >= 1 && day <= 31;
  };

  // 處理輸入變更
  const handleChange = (field: keyof FormData, value: string) => {
    let formattedValue = value;

    // 電話格式化：0905-123-123
    if (field === 'phone') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      if (cleaned.length > 4 && cleaned.length <= 7) {
        formattedValue = `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
      } else if (cleaned.length > 7) {
        formattedValue = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
      } else {
        formattedValue = cleaned;
      }
    }

    // 身分證轉大寫
    if (field === 'idNumber') {
      formattedValue = value.toUpperCase().slice(0, 10);
    }

    // 出生日期格式化
    if (field === 'birthDate') {
      formattedValue = value.replace(/\D/g, '').slice(0, 7);
    }

    setFormData((prev) => ({ ...prev, [field]: formattedValue }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  // 驗證表單
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = '請輸入真實姓名';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '姓名至少需要 2 個字';
    }

    if (!formData.phone) {
      newErrors.phone = '請輸入聯絡電話';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = '請輸入正確的手機號碼';
    }

    if (!formData.idNumber) {
      newErrors.idNumber = '請輸入身分證字號';
    } else if (!validateIdNumber(formData.idNumber)) {
      newErrors.idNumber = '請輸入正確的身分證字號';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = '請輸入出生年月日';
    } else if (!validateBirthDate(formData.birthDate)) {
      newErrors.birthDate = '請輸入正確的出生日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表單
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 保存到 Context（會自動緩存到 localStorage）
      setUserProfile(formData);

      // 同時也存到 sessionStorage（兼容舊邏輯）
      sessionStorage.setItem('profileData', JSON.stringify(formData));

      // 跳轉到預約流程
      router.push('/liff/booking/doctor');
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsLoading(false);
    }
  };

  // 載入中顯示
  if (isAuthLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-[60px] pb-8 px-4">
        {/* Title Section */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            基本資料
          </h1>
          <p className="text-base text-neutral-500">
            請填寫您的基本資料以進行掛號
          </p>
          {/* LINE 登入用戶歡迎訊息 */}
          {lineProfile && (
            <p className="text-sm text-[#06C755] mt-2">
              {lineProfile.displayName}，歡迎回來
            </p>
          )}
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* 真實姓名 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-700">
                真實姓名
              </label>
            </div>
            <input
              type="text"
              placeholder="陳小美"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              maxLength={5}
              className={`w-full h-12 px-3 bg-neutral-100 rounded-lg border text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#008ADA]/20 transition-all ${
                errors.name
                  ? 'border-error'
                  : 'border-neutral-400 focus:border-[#008ADA]'
              }`}
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name}</p>
            )}
          </div>

          {/* 聯絡方式 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-700">
                聯絡方式
              </label>
            </div>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="0905-123-123"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`w-full h-12 px-3 bg-neutral-100 rounded-lg border text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#008ADA]/20 transition-all ${
                errors.phone
                  ? 'border-error'
                  : 'border-neutral-400 focus:border-[#008ADA]'
              }`}
            />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone}</p>
            )}
          </div>

          {/* 身分證字號 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-700">
                身分證字號
              </label>
            </div>
            <input
              type="text"
              placeholder="A123456789"
              value={formData.idNumber}
              onChange={(e) => handleChange('idNumber', e.target.value)}
              maxLength={10}
              className={`w-full h-12 px-3 bg-neutral-100 rounded-lg border text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#008ADA]/20 transition-all ${
                errors.idNumber
                  ? 'border-error'
                  : 'border-neutral-400 focus:border-[#008ADA]'
              }`}
            />
            {errors.idNumber && (
              <p className="text-sm text-error">{errors.idNumber}</p>
            )}
          </div>

          {/* 出生年月日 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-neutral-700">
                出生年月日
              </label>
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0560402 (民國年月日)"
              value={formData.birthDate}
              onChange={(e) => handleChange('birthDate', e.target.value)}
              maxLength={7}
              className={`w-full h-12 px-3 bg-neutral-100 rounded-lg border text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#008ADA]/20 transition-all ${
                errors.birthDate
                  ? 'border-error'
                  : 'border-neutral-400 focus:border-[#008ADA]'
              }`}
            />
            {errors.birthDate && (
              <p className="text-sm text-error">{errors.birthDate}</p>
            )}
            <p className="text-xs text-neutral-400">
              格式：民國年(3碼)+月(2碼)+日(2碼)，例如：0560402
            </p>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-8" />

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-12 bg-[#008ADA] hover:bg-[#0076A5] disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
        >
          {isLoading ? '處理中...' : '下一步'}
        </button>
      </main>
    </div>
  );
}
