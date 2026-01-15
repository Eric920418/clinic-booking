/**
 * 選擇時段頁面
 * 顯示可預約時段，3 欄格子布局
 * 狀態：可預約(綠)、剩餘不多(橘)、額滿(灰)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// 時段狀態類型
type SlotStatus = 'available' | 'limited' | 'full';

interface TimeSlot {
  id: string;
  time: string;
  status: SlotStatus;
  remainingMinutes: number;
}

// 根據剩餘分鐘數決定狀態
const getSlotStatus = (remainingMinutes: number): SlotStatus => {
  if (remainingMinutes <= 0) return 'full';
  if (remainingMinutes <= 10) return 'limited';
  return 'available';
};

export default function SelectTimeSlotPage() {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 從 sessionStorage 取得選擇的醫師和日期
    const fetchTimeSlots = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const doctorStr = sessionStorage.getItem('selectedDoctor');
        const dateStr = sessionStorage.getItem('selectedDate');

        if (!doctorStr || !dateStr) {
          setError('請先選擇醫師和日期');
          setIsLoading(false);
          return;
        }

        const doctor = JSON.parse(doctorStr);
        const date = new Date(dateStr);
        const formattedDate = format(date, 'yyyy-MM-dd');

        const response = await fetch(
          `/api/liff/time-slots?doctorId=${doctor.id}&date=${formattedDate}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setTimeSlots(result.data.map((slot: { id: string; startTime: string; remainingMinutes: number }) => ({
              id: slot.id,
              time: slot.startTime,
              status: getSlotStatus(slot.remainingMinutes),
              remainingMinutes: slot.remainingMinutes,
            })));
          } else {
            setError(result.error?.message || '載入時段失敗');
          }
        } else {
          setError('載入時段失敗');
        }
      } catch (err) {
        console.error('載入時段失敗:', err);
        setError('載入時段失敗');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeSlots();
  }, []);

  // 取得狀態文字和顏色
  const getStatusInfo = (status: SlotStatus) => {
    switch (status) {
      case 'available':
        return { text: '可預約', textColor: 'text-success' };
      case 'limited':
        return { text: '剩餘不多', textColor: 'text-warning' };
      case 'full':
        return { text: '額滿', textColor: 'text-neutral-400' };
    }
  };

  // 選擇時段
  const handleSelectSlot = (slotId: string, status: SlotStatus) => {
    if (status === 'full') return;
    setSelectedSlot(slotId);
  };

  // 確認預約資料
  const handleConfirm = () => {
    if (!selectedSlot) return;

    const slot = timeSlots.find(s => s.id === selectedSlot);
    if (slot) {
      sessionStorage.setItem('selectedTimeSlot', JSON.stringify({
        id: slot.id,
        time: slot.time,
      }));
      router.push('/liff/booking/confirm');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-neutral-500">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[#008ADA] font-medium"
        >
          返回上一頁
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col pt-[44px] pb-8 px-4 overflow-y-auto">
        {/* 標題區塊 */}
        <section className="mb-6">
          <h1 className="text-xl font-bold text-neutral-900 mb-1">
            選擇時間
          </h1>
          <p className="text-sm text-neutral-500">
            請依照您的需求選擇可預約的時間
          </p>
        </section>

        {/* 時段格子 */}
        <section className="flex-1">
          <div className="grid grid-cols-3 gap-3">
            {timeSlots.map((slot) => {
              const { text, textColor } = getStatusInfo(slot.status);
              const isSelected = selectedSlot === slot.id;
              const isDisabled = slot.status === 'full';

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => handleSelectSlot(slot.id, slot.status)}
                  disabled={isDisabled}
                  className={`
                    py-3 px-2 rounded-xl border transition-all
                    flex flex-col items-center justify-center
                    ${isSelected
                      ? 'border-[#008ADA] bg-[#008ADA]/5'
                      : isDisabled
                      ? 'border-neutral-200 bg-neutral-50'
                      : 'border-neutral-200 bg-white'
                    }
                    ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <span
                    className={`text-base font-medium ${
                      isSelected
                        ? 'text-[#008ADA]'
                        : isDisabled
                        ? 'text-neutral-400'
                        : 'text-neutral-900'
                    }`}
                  >
                    {slot.time}
                  </span>
                  <span className={`text-xs mt-1 ${isSelected ? 'text-[#008ADA]' : textColor}`}>
                    {text}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Spacer */}
        <div className="min-h-6" />

        {/* 確認按鈕 */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedSlot}
          className="w-full h-12 bg-[#008ADA] hover:bg-[#0076A5] disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
        >
          確認預約資料
        </button>
      </main>
    </div>
  );
}
