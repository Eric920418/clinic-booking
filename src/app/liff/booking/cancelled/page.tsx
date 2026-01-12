/**
 * 預約取消完成頁面
 * 顯示取消成功訊息，提供重新預約選項
 */
'use client';

import { useRouter } from 'next/navigation';

export default function BookingCancelledPage() {
  const router = useRouter();

  // 重新預約
  const handleRebook = () => {
    router.push('/liff/booking/doctor');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {/* 標題 */}
        <h1 className="text-2xl font-bold text-neutral-900 mb-3 text-center">
          預約已取消
        </h1>

        {/* 說明文字 */}
        <p className="text-base text-neutral-500 text-center mb-8 leading-relaxed">
          您的預約已成功取消。
          <br />
          如需重新安排看診時間，請點擊下方按鈕。
        </p>

        {/* 重新預約按鈕 */}
        <button
          type="button"
          onClick={handleRebook}
          className="w-full max-w-sm h-12 bg-[#008ADA] hover:bg-[#0076A5] text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all"
        >
          重新預約
        </button>
      </main>
    </div>
  );
}
