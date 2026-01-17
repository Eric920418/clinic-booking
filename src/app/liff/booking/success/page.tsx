/**
 * 預約完成頁面
 * 顯示預約成功資訊，提供修改和取消選項
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AppointmentData {
  doctor: { id: string; name: string } | null;
  date: Date | null;
  timeSlot: { id: string; time: string } | null;
  treatment: { id: string; name: string } | null;
  profile: { name: string } | null;
}

export default function BookingSuccessPage() {
  const router = useRouter();
  const [appointmentData, setAppointmentData] = useState<AppointmentData>({
    doctor: null,
    date: null,
    timeSlot: null,
    treatment: null,
    profile: null,
  });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    // 從 sessionStorage 讀取預約結果
    const resultStr = sessionStorage.getItem('appointmentResult');

    if (resultStr) {
      const result = JSON.parse(resultStr);
      setAppointmentData({
        doctor: result.doctor,
        date: result.date ? new Date(result.date) : null,
        timeSlot: result.timeSlot,
        treatment: result.treatment,
        profile: result.profile,
      });
    }
  }, []);

  // 格式化日期
  const formatDateShort = (date: Date | null) => {
    if (!date) return { date: '--/--', weekday: '---' };
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    return {
      date: `${month}/${day}`,
      weekday: `星期${weekdays[date.getDay()]}`,
    };
  };

  // 修改預約
  const handleModify = () => {
    router.push('/liff/booking/doctor');
  };

  // 取消預約
  const handleCancel = async () => {
    // TODO: 實際呼叫 API 取消預約
    // await fetch('/api/liff/appointments/cancel', { method: 'POST' });

    // 清除資料並跳轉到取消完成頁
    sessionStorage.clear();
    router.push('/liff/booking/cancelled');
  };

  const { date: dateStr, weekday } = formatDateShort(appointmentData.date);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col pt-[44px] pb-8 px-4">
        {/* 成功卡片 */}
        <div className="bg-primary-500 rounded-2xl p-4 mb-6">
          <h1 className="text-xl font-bold text-white mb-4">
            您已完成掛號！
          </h1>

          {/* 日期時間區塊 */}
          <div className="bg-white/20 rounded-xl p-4 flex items-center gap-4">
            <div className="text-center">
              <div className="text-white text-lg font-bold">{dateStr}</div>
              <div className="text-white/80 text-sm">{weekday}</div>
            </div>
            <div className="text-white text-3xl font-bold">
              {appointmentData.timeSlot?.time || '--:--'}
            </div>
          </div>
        </div>

        {/* 掛號詳情 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <h2 className="text-sm text-neutral-500 mb-4">掛號詳情</h2>

          <div className="space-y-3">
            {/* 預約醫師 */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-700">預約醫師</span>
              <span className="font-medium text-neutral-900">
                {appointmentData.doctor?.name || '---'}
              </span>
            </div>

            {/* 診療項目 */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-700">診療項目</span>
              <span className="font-medium text-neutral-900">
                {appointmentData.treatment?.name || '---'}
              </span>
            </div>

            {/* 就診人 */}
            <div className="flex justify-between items-center">
              <span className="text-neutral-700">就診人</span>
              <span className="font-medium text-neutral-900">
                {appointmentData.profile?.name || '---'}
              </span>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 按鈕區 */}
        <div className="space-y-3">
          {/* 修改預約按鈕 */}
          <button
            type="button"
            onClick={handleModify}
            className="w-full h-12 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-base rounded-xl border border-neutral-300 transition-all"
          >
            修改預約
          </button>

          {/* 取消預約按鈕 */}
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="w-full h-12 bg-error hover:bg-error-700 text-white font-bold text-base rounded-xl transition-all"
          >
            取消預約
          </button>
        </div>
      </main>

      {/* 取消確認對話框 */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-6 w-full max-w-md pb-10">
            <h3 className="text-lg font-bold text-neutral-900 text-center mb-2">
              確定要取消預約？
            </h3>
            <p className="text-sm text-neutral-500 text-center mb-6">
              取消後將無法復原，您需要重新進行掛號流程。
            </p>
            <div className="space-y-3">
              {/* 確認取消按鈕 */}
              <button
                type="button"
                onClick={handleCancel}
                className="w-full h-12 bg-error hover:bg-error-700 text-white font-bold text-base rounded-xl transition-all"
              >
                確認取消
              </button>
              {/* 我在想想按鈕 */}
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                className="w-full h-12 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-base rounded-xl border border-neutral-300 transition-all"
              >
                我在想想
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
