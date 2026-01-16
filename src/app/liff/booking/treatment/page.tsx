/**
 * 選擇診療項目頁面
 * 顯示選中醫師可看診的項目
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Circle, CheckCircle2 } from 'lucide-react';

// 診療項目型別
interface TreatmentType {
  id: string;
  name: string;
  durationMinutes: number;
}

// 選中的醫師資料
interface SelectedDoctor {
  id: string;
  name: string;
  treatments: TreatmentType[];
}

export default function SelectTreatmentPage() {
  const router = useRouter();
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<SelectedDoctor | null>(null);
  const [loading, setLoading] = useState(true);

  // 從 sessionStorage 讀取選中的醫師資料
  useEffect(() => {
    const storedDoctor = sessionStorage.getItem('selectedDoctor');
    if (storedDoctor) {
      try {
        const parsed = JSON.parse(storedDoctor) as SelectedDoctor;
        setDoctor(parsed);
      } catch (err) {
        console.error('解析醫師資料失敗:', err);
      }
    }
    setLoading(false);
  }, []);

  // 選擇診療項目
  const handleSelectTreatment = (treatmentId: string) => {
    setSelectedTreatment(treatmentId);
  };

  // 查詢可預約時段
  const handleQueryTimeSlots = () => {
    if (!selectedTreatment || !doctor) return;

    const treatment = doctor.treatments.find(t => t.id === selectedTreatment);
    sessionStorage.setItem('selectedTreatment', JSON.stringify({
      id: selectedTreatment,
      name: treatment?.name,
      minutes: treatment?.durationMinutes,
    }));

    router.push('/liff/booking/time-slot');
  };

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-neutral-500">載入中...</div>
      </div>
    );
  }

  // 沒有醫師資料
  if (!doctor) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col items-center justify-center px-4">
        <div className="text-neutral-500 mb-4">請先選擇醫師</div>
        <button
          type="button"
          onClick={() => router.push('/liff/booking/doctor')}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg"
        >
          返回選擇醫師
        </button>
      </div>
    );
  }

  // 醫師沒有診療項目
  if (!doctor.treatments || doctor.treatments.length === 0) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col items-center justify-center px-4">
        <div className="text-neutral-500 mb-4">{doctor.name} 醫師目前沒有可預約的診療項目</div>
        <button
          type="button"
          onClick={() => router.push('/liff/booking/doctor')}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg"
        >
          返回選擇其他醫師
        </button>
      </div>
    );
  }

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
              {doctor.name} 醫師可看診項目
            </p>
          </div>

          {/* 診療項目列表 */}
          <div className="space-y-3">
            {doctor.treatments.map((treatment) => (
              <button
                key={treatment.id}
                type="button"
                onClick={() => handleSelectTreatment(treatment.id)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  selectedTreatment === treatment.id
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-neutral-400 bg-white'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-neutral-900">
                    {treatment.name}
                  </div>
                  <div className="text-sm text-neutral-500">
                    約 {treatment.durationMinutes} 分鐘
                  </div>
                </div>
                {selectedTreatment === treatment.id ? (
                  <CheckCircle2 className="w-6 h-6 text-primary-500" />
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
          className="w-full h-12 bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
        >
          查詢可預約時段
        </button>
      </main>
    </div>
  );
}
