/**
 * 確認預約資料頁面
 * 顯示預約詳情供用戶確認
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, MapPin, Phone, AlertCircle } from 'lucide-react';
import { useLiffAuth } from '@/contexts/LiffAuthContext';

interface BookingData {
  doctor: { id: string; name: string } | null;
  date: Date | null;
  timeSlot: { id: string; time: string } | null;
  treatment: { id: string; name: string; minutes: number } | null;
  profile: {
    name: string;
    phone: string;
    idNumber: string;
    birthDate: string;
  } | null;
}

// 診所資訊（固定）
const CLINIC_INFO = {
  name: '欣百漢忠醫院',
  address: '台北市松山區南京東路五段80號',
};

export default function ConfirmBookingPage() {
  const router = useRouter();
  const { isLoggedIn, lineProfile, login, isLiffReady } = useLiffAuth();
  const [bookingData, setBookingData] = useState<BookingData>({
    doctor: null,
    date: null,
    timeSlot: null,
    treatment: null,
    profile: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLineLoginRequired, setIsLineLoginRequired] = useState(false);

  useEffect(() => {
    // 從 sessionStorage 讀取預約資料
    const doctorStr = sessionStorage.getItem('selectedDoctor');
    const dateStr = sessionStorage.getItem('selectedDate');
    const timeSlotStr = sessionStorage.getItem('selectedTimeSlot');
    const treatmentStr = sessionStorage.getItem('selectedTreatment');
    const profileStr = sessionStorage.getItem('profileData');

    setBookingData({
      doctor: doctorStr ? JSON.parse(doctorStr) : null,
      date: dateStr ? new Date(dateStr) : null,
      timeSlot: timeSlotStr ? JSON.parse(timeSlotStr) : null,
      treatment: treatmentStr ? JSON.parse(treatmentStr) : null,
      profile: profileStr ? JSON.parse(profileStr) : null,
    });
  }, []);

  // 檢查 LINE 登入狀態
  useEffect(() => {
    // 檢查 localStorage 是否有 lineUserId（可能來自之前的登入）
    const lineUserId = localStorage.getItem('lineUserId');
    // 如果沒有登入 LINE 且沒有已存的 lineUserId，標記需要登入
    if (!isLoggedIn && !lineUserId) {
      setIsLineLoginRequired(true);
    } else {
      setIsLineLoginRequired(false);
    }
  }, [isLoggedIn]);

  // 格式化日期為民國年格式
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear() - 1911; // 轉換為民國年
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日 星期${weekday}`;
  };

  // LINE 登入處理
  const handleLineLogin = async () => {
    if (!isLiffReady) {
      alert('LIFF 尚未準備完成，請稍後再試');
      return;
    }
    await login();
  };

  // 送出預約
  const handleSubmit = async () => {
    // 取得 LINE User ID
    const lineUserId = localStorage.getItem('lineUserId') || localStorage.getItem('mockLineUserId');

    // 如果沒有 LINE User ID，觸發登入流程
    if (!lineUserId) {
      await handleLineLogin();
      return;
    }

    setIsLoading(true);

    try {

      if (!bookingData.doctor || !bookingData.date || !bookingData.timeSlot || !bookingData.treatment) {
        alert('預約資料不完整');
        setIsLoading(false);
        return;
      }

      // 呼叫真實 API 建立預約
      const response = await fetch('/api/liff/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId,
          doctorId: bookingData.doctor.id,
          timeSlotId: bookingData.timeSlot.id,
          treatmentTypeId: bookingData.treatment.id,
          appointmentDate: bookingData.date.toISOString().split('T')[0],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        alert(result.error?.message || '預約失敗');
        setIsLoading(false);
        return;
      }

      // 清除 sessionStorage 中的預約流程資料
      sessionStorage.removeItem('selectedDoctor');
      sessionStorage.removeItem('selectedDate');
      sessionStorage.removeItem('selectedTimeSlot');
      sessionStorage.removeItem('selectedTreatment');

      // 跳轉到成功頁
      router.push('/liff/booking/success');
    } catch (error) {
      console.error('預約失敗:', error);
      alert('預約失敗，請稍後再試');
      setIsLoading(false);
    }
  };

  // 返回修改
  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col pt-[44px] pb-8 px-4 overflow-y-auto">
        {/* 標題區塊 */}
        <section className="text-center mb-6">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">
            確認預約資料
          </h1>
          <p className="text-sm text-neutral-500">
            請核對下方的預約詳情
          </p>
        </section>

        {/* 預約詳情卡片 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-4">
          {/* 醫師名稱 */}
          <h2 className="text-lg font-bold text-neutral-900 mb-4">
            {bookingData.doctor?.name || '---'} 醫師
          </h2>

          {/* 看診日期 */}
          <div className="flex items-start gap-3 mb-4">
            <Calendar className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">看診日期</p>
              <p className="font-medium text-neutral-900">
                {formatDate(bookingData.date)}
              </p>
            </div>
          </div>

          {/* 看診時間 */}
          <div className="flex items-start gap-3 mb-4">
            <Clock className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">看診時間</p>
              <p className="font-medium text-neutral-900">
                {bookingData.timeSlot?.time || '---'}
              </p>
            </div>
          </div>

          {/* 看診項目 */}
          <div className="flex items-start gap-3 mb-4">
            <User className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">看診項目</p>
              <p className="font-medium text-neutral-900">
                {bookingData.treatment?.name || '---'}
              </p>
            </div>
          </div>

          {/* 診所地址 */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">診所地址</p>
              <p className="font-medium text-neutral-900">{CLINIC_INFO.name}</p>
              <p className="text-sm text-neutral-500">{CLINIC_INFO.address}</p>
            </div>
          </div>
        </div>

        {/* 預約人資料卡片 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          {/* 預約人 */}
          <div className="flex items-start gap-3 mb-4">
            <User className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">預約人</p>
              <p className="font-medium text-neutral-900">
                {bookingData.profile?.name || '---'}
              </p>
            </div>
          </div>

          {/* 聯絡方式 */}
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-neutral-500">聯絡方式</p>
              <p className="font-medium text-neutral-900">
                {bookingData.profile?.phone || '---'}
              </p>
            </div>
          </div>
        </div>

        {/* LINE 登入提示 - 未登入時顯示 */}
        {isLineLoginRequired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 mb-1">
                  需要 LINE 登入
                </p>
                <p className="text-sm text-amber-700 mb-3">
                  為了發送預約確認通知，請先登入 LINE 帳號
                </p>
                <button
                  type="button"
                  onClick={handleLineLogin}
                  disabled={!isLiffReady}
                  className="w-full h-10 bg-[#06C755] hover:bg-[#05b34c] disabled:bg-neutral-300 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.46 7.12c0 2.47-2.49 4.48-5.46 4.48-.25 0-.5-.01-.74-.03l-1.5 1.08c-.08.06-.18.09-.28.09-.15 0-.29-.07-.38-.19-.13-.17-.11-.41.04-.56l1.08-1.2c-1.89-.67-3.22-2.11-3.22-3.67 0-2.47 2.49-4.48 5.46-4.48s5.46 2.01 5.46 4.48z"/>
                  </svg>
                  使用 LINE 登入
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* 按鈕區 */}
        <div className="space-y-3">
          {/* 確認送出按鈕 */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || isLineLoginRequired}
            className="w-full h-12 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
          >
            {isLoading ? '送出中...' : isLineLoginRequired ? '請先登入 LINE' : '確認並送出預約'}
          </button>

          {/* 返回修改按鈕 */}
          <button
            type="button"
            onClick={handleGoBack}
            disabled={isLoading}
            className="w-full h-12 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-base rounded-xl border border-neutral-300 transition-all disabled:opacity-50"
          >
            返回修改
          </button>
        </div>
      </main>
    </div>
  );
}
