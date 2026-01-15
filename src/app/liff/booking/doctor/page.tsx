/**
 * 選擇醫師與日期頁面
 * 合併選擇醫師和選擇日期功能
 */
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Circle, CheckCircle2 } from 'lucide-react';

// 醫師型別
interface Doctor {
  id: string;
  name: string;
  note: string;
}

// 星期標籤
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function SelectDoctorAndDatePage() {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入醫師資料
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/liff/doctors');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setDoctors(result.data.map((d: { id: string; name: string; treatmentTypes?: { name: string }[] }) => ({
              id: d.id,
              name: d.name,
              note: d.treatmentTypes?.map((t: { name: string }) => t.name).join('、') || '',
            })));
          }
        } else {
          setError('載入醫師資料失敗');
        }
      } catch (err) {
        console.error('載入醫師資料失敗:', err);
        setError('載入醫師資料失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  // 取得當前月份的日曆資料
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 當月第一天
    const firstDay = new Date(year, month, 1);
    // 當月最後一天
    const lastDay = new Date(year, month + 1, 0);
    // 第一天是星期幾
    const startDayOfWeek = firstDay.getDay();
    // 當月總天數
    const daysInMonth = lastDay.getDate();

    // 建立日曆陣列
    const days: (number | null)[] = [];

    // 填充前面的空格
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return { year, month, days };
  }, [currentDate]);

  // 切換月份
  const changeMonth = (delta: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + delta);
      return newDate;
    });
    setSelectedDate(null);
  };

  // 選擇日期
  const handleSelectDate = (day: number) => {
    const date = new Date(calendarData.year, calendarData.month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 不能選過去的日期
    if (date < today) return;

    setSelectedDate(date);

    // 如果已選擇醫師，跳轉到時段選擇
    if (selectedDoctor) {
      const doctor = doctors.find(d => d.id === selectedDoctor);
      sessionStorage.setItem('selectedDoctor', JSON.stringify({
        id: selectedDoctor,
        name: doctor?.name,
      }));
      sessionStorage.setItem('selectedDate', date.toISOString());

      router.push('/liff/booking/treatment');
    }
  };

  // 選擇醫師
  const handleSelectDoctor = (doctorId: string) => {
    setSelectedDoctor(doctorId);

    // 如果已選擇日期，跳轉到時段選擇
    if (selectedDate) {
      const doctor = doctors.find(d => d.id === doctorId);
      sessionStorage.setItem('selectedDoctor', JSON.stringify({
        id: doctorId,
        name: doctor?.name,
      }));
      sessionStorage.setItem('selectedDate', selectedDate.toISOString());

      router.push('/liff/booking/treatment');
    }
  };

  // 判斷日期是否可選
  const isDateSelectable = (day: number) => {
    const date = new Date(calendarData.year, calendarData.month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  // 判斷是否為選中日期
  const isSelectedDate = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === calendarData.year &&
      selectedDate.getMonth() === calendarData.month &&
      selectedDate.getDate() === day
    );
  };

  // 判斷是否為今天
  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === calendarData.year &&
      today.getMonth() === calendarData.month &&
      today.getDate() === day
    );
  };

  // 載入中狀態
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-neutral-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      <main className="flex-1 flex flex-col pt-[44px] pb-8 px-4 overflow-y-auto">
        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* 選擇醫師區塊 */}
        <section className="mb-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold text-neutral-900 mb-1">
              選擇醫師
            </h1>
            <p className="text-sm text-neutral-500">
              請先選擇想預約的醫師
            </p>
          </div>

          {/* 醫師列表 */}
          <div className="space-y-3">
            {doctors.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => handleSelectDoctor(doctor.id)}
                className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                  selectedDoctor === doctor.id
                    ? 'border-primary-500 bg-primary-500/5'
                    : 'border-neutral-400 bg-white'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-neutral-900">
                    {doctor.name}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {doctor.note}
                  </div>
                </div>
                {selectedDoctor === doctor.id ? (
                  <CheckCircle2 className="w-6 h-6 text-primary-500" />
                ) : (
                  <Circle className="w-6 h-6 text-neutral-300" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 選擇日期區塊 */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-neutral-900 mb-1">
              選擇日期
            </h2>
            <p className="text-sm text-neutral-500">
              請選擇一個預約日期
            </p>
          </div>

          {/* 日曆卡片 */}
          <div className="bg-white rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] p-4">
            {/* 月份導航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-neutral-600" />
              </button>
              <div className="text-center">
                <span className="font-bold text-neutral-900">
                  {calendarData.year}年
                </span>
                <span className="font-bold text-neutral-900 ml-2">
                  {calendarData.month + 1}月
                </span>
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            {/* 星期標題 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-sm font-medium py-2 ${
                    index === 0 ? 'text-error' : index === 6 ? 'text-primary-500' : 'text-neutral-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 日期格子 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarData.days.map((day, index) => (
                <div key={index} className="aspect-square flex items-center justify-center">
                  {day !== null && (
                    <button
                      type="button"
                      onClick={() => handleSelectDate(day)}
                      disabled={!isDateSelectable(day) || !selectedDoctor}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-all ${
                        isSelectedDate(day)
                          ? 'bg-primary-500 text-white shadow-md'
                          : isToday(day)
                          ? 'bg-primary-500/10 text-primary-500 font-bold'
                          : isDateSelectable(day) && selectedDoctor
                          ? 'hover:bg-neutral-100 text-neutral-900'
                          : 'text-neutral-300 cursor-not-allowed'
                      }`}
                    >
                      {day}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 提示訊息 */}
          {!selectedDoctor && (
            <p className="mt-4 text-center text-sm text-neutral-500">
              請先選擇醫師後再選擇日期
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
