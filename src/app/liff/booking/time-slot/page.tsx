/**
 * 選擇時段頁面
 * 顯示可預約時段，3 欄格子布局
 * 狀態：可預約(綠)、剩餘不多(橘)、額滿(灰)
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 時段狀態類型
type SlotStatus = 'available' | 'limited' | 'full';

interface TimeSlot {
  id: string;
  time: string;
  status: SlotStatus;
  remainingMinutes: number;
}

// 模擬時段資料（實際應從 API 取得）
const generateMockTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const statuses: SlotStatus[] = ['available', 'limited', 'full'];

  // 上午時段 09:00 - 12:00
  for (let hour = 9; hour < 12; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const randomStatus = statuses[Math.floor(Math.random() * 3)];
      slots.push({
        id: `slot-${hour}-${min}`,
        time,
        status: randomStatus,
        remainingMinutes: randomStatus === 'full' ? 0 : randomStatus === 'limited' ? 5 : 25,
      });
    }
  }

  // 下午時段 14:00 - 17:00
  for (let hour = 14; hour < 17; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const randomStatus = statuses[Math.floor(Math.random() * 3)];
      slots.push({
        id: `slot-${hour}-${min}`,
        time,
        status: randomStatus,
        remainingMinutes: randomStatus === 'full' ? 0 : randomStatus === 'limited' ? 5 : 25,
      });
    }
  }

  return slots;
};

export default function SelectTimeSlotPage() {
  const router = useRouter();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 模擬載入時段資料
    const timer = setTimeout(() => {
      setTimeSlots(generateMockTimeSlots());
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
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
