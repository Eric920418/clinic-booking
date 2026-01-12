/**
 * 選擇診療項目頁面
 * 用戶選擇要預約的診療類型：初診、內科、針灸
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CheckCircle2 } from 'lucide-react';

// 診療項目資料（對應 README 中的診療項目）
const TREATMENT_TYPES = [
  { id: 'first_visit', name: '初診', minutes: 10, note: '首次就診' },
  { id: 'internal', name: '內科', minutes: 5, note: '一般內科診療' },
  { id: 'acupuncture', name: '針灸', minutes: 5, note: '針灸治療' },
];

export default function SelectTreatmentPage() {
  const router = useRouter();
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);

  // 選擇診療項目
  const handleSelectTreatment = (treatmentId: string) => {
    setSelectedTreatment(treatmentId);
  };

  // 查詢可預約時段
  const handleQueryTimeSlots = () => {
    if (!selectedTreatment) return;

    const treatment = TREATMENT_TYPES.find(t => t.id === selectedTreatment);
    sessionStorage.setItem('selectedTreatment', JSON.stringify({
      id: selectedTreatment,
      name: treatment?.name,
      minutes: treatment?.minutes,
    }));

    router.push('/liff/booking/time-slot');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col pt-[44px] pb-8 px-4">
        {/* 標題區塊 */}
        <section className="mb-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-neutral-900 mb-1">
              診療項目
            </h1>
            <p className="text-sm text-neutral-500">
              請依照您的需求選擇診療項目
            </p>
          </div>

          {/* 診療項目列表 */}
          <div className="space-y-3">
            {TREATMENT_TYPES.map((treatment) => (
              <button
                key={treatment.id}
                type="button"
                onClick={() => handleSelectTreatment(treatment.id)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  selectedTreatment === treatment.id
                    ? 'border-[#008ADA] bg-[#008ADA]/5'
                    : 'border-neutral-400 bg-white'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-neutral-900">
                    {treatment.name}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {treatment.note}
                  </div>
                </div>
                {selectedTreatment === treatment.id ? (
                  <CheckCircle2 className="w-6 h-6 text-[#008ADA]" />
                ) : (
                  <Circle className="w-6 h-6 text-neutral-300" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 查詢按鈕 */}
        <button
          type="button"
          onClick={handleQueryTimeSlots}
          disabled={!selectedTreatment}
          className="w-full h-12 bg-[#008ADA] hover:bg-[#0076A5] disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
        >
          查詢可預約時段
        </button>
      </main>
    </div>
  );
}
