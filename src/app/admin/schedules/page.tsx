/**
 * 診次排班頁面 - 月曆檢視
 * 管理醫師的排班表
 * 使用 SWR 進行資料快取
 */
'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useDoctors, useSchedules, type Doctor, type Schedule, type TimeSlot } from '@/lib/api';

// 時段選項
const TIME_SLOT_OPTIONS = [
  { id: 'morning', label: '早班：09:00-12:30' },
  { id: 'afternoon', label: '午班：14:00-17:30' },
  { id: 'evening', label: '晚班：18:00-21:00' },
];

// 週日名稱
const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

// 檢視模式
type ViewMode = 'day' | 'week' | 'month';

export default function SchedulesPage() {
  // 當前日期（用於週檢視）
  const [currentDate, setCurrentDate] = useState(() => {
    return new Date();
  });
  // 當前年月（民國年）
  const [currentYear, setCurrentYear] = useState(() => {
    return new Date().getFullYear() - 1911;
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    return new Date().getMonth() + 1;
  });
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // 篩選狀態
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(TIME_SLOT_OPTIONS[0].id);

  // 下拉選單狀態
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showTimeSlotDropdown, setShowTimeSlotDropdown] = useState(false);

  // 選中的日期
  const [selectedDates, setSelectedDates] = useState<number[]>([]);

  // 選中的時段（日檢視用）
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // 使用 SWR hooks 取得資料
  const { data: doctorsData } = useDoctors();
  const doctors: Doctor[] = doctorsData || [];

  // 計算日期範圍
  const dateRange = useMemo(() => {
    const westernYear = currentYear + 1911;
    const startDate = new Date(westernYear, currentMonth - 1, 1);
    const endDate = new Date(westernYear, currentMonth, 0);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }, [currentYear, currentMonth]);

  const { data: schedulesData, error: swrError, isLoading } = useSchedules(dateRange);

  // 轉換班表資料格式
  const schedules: Schedule[] = useMemo(() => {
    if (!schedulesData) return [];
    return schedulesData.map((item) => ({
      id: item.id,
      doctorId: item.doctorId,
      doctorName: item.doctorName,
      date: item.date,
      isAvailable: item.isAvailable,
      timeSlots: item.timeSlots || [],
    }));
  }, [schedulesData]);

  const loading = isLoading;
  const error = swrError ? swrError.message : null;

  // 西元年轉民國年
  const toMinguoYear = (westernYear: number) => westernYear - 1911;

  // 取得該月天數
  const getDaysInMonth = (year: number, month: number) => {
    // 民國年轉西元年
    const westernYear = year + 1911;
    return new Date(westernYear, month, 0).getDate();
  };

  // 取得該月第一天是星期幾
  const getFirstDayOfMonth = (year: number, month: number) => {
    const westernYear = year + 1911;
    return new Date(westernYear, month - 1, 1).getDay();
  };

  // 取得當週的開始日（週日）
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  };

  // 取得當週的結束日（週六）
  const getWeekEnd = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day));
    return d;
  };

  // 產生週檢視的日期
  const generateWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  };

  // 格式化週日期範圍顯示
  const formatWeekRange = () => {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = getWeekEnd(currentDate);
    const startYear = toMinguoYear(weekStart.getFullYear());
    const startMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
    const startDay = String(weekStart.getDate()).padStart(2, '0');
    const endMonth = String(weekEnd.getMonth() + 1).padStart(2, '0');
    const endDay = String(weekEnd.getDate()).padStart(2, '0');
    return `${startYear}-${startMonth}-${startDay} ~ ${startYear}-${endMonth}-${endDay}`;
  };

  // 產生日曆格子
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days: (number | null)[] = [];

    // 前面的空白格
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // 該月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  // 切換月份
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDates([]);
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDates([]);
  };

  // 切換週
  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
    setSelectedDates([]);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
    setSelectedDates([]);
  };

  // 切換日
  const handlePrevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setSelectedSlots([]);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setSelectedSlots([]);
  };

  // 格式化單日日期顯示
  const formatDayDate = () => {
    const year = toMinguoYear(currentDate.getFullYear());
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 點擊時段標籤（日檢視）
  const handleSlotClick = (slotId: string) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slotId)) {
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
  };

  // 點擊日期
  const handleDateClick = (day: number) => {
    setSelectedDates((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  // 醫師多選處理
  const handleDoctorToggle = (doctorId: string) => {
    setSelectedDoctorIds((prev) => {
      if (prev.includes(doctorId)) {
        return prev.filter((id) => id !== doctorId);
      }
      return [...prev, doctorId];
    });
  };

  // 取得特定日期的班表資訊
  const getScheduleForDate = (day: number) => {
    const westernYear = currentYear + 1911;
    const dateStr = `${westernYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedules.filter((s) => s.date === dateStr);
  };

  const calendarDays = generateCalendarDays();
  const weekDays = generateWeekDays();
  const selectedTimeSlotLabel = TIME_SLOT_OPTIONS.find((t) => t.id === selectedTimeSlot)?.label;

  // 導航處理
  const handlePrev = () => {
    if (viewMode === 'day') {
      handlePrevDay();
    } else if (viewMode === 'week') {
      handlePrevWeek();
    } else {
      handlePrevMonth();
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      handleNextDay();
    } else if (viewMode === 'week') {
      handleNextWeek();
    } else {
      handleNextMonth();
    }
  };

  // 日期顯示文字
  const getDateDisplayText = () => {
    if (viewMode === 'day') {
      return formatDayDate();
    }
    if (viewMode === 'week') {
      return formatWeekRange();
    }
    return `${currentYear}年 ${currentMonth}月`;
  };

  // 取得當日班表（日檢視用）
  const getDaySchedules = () => {
    const dateStr = currentDate.toISOString().split('T')[0];
    const daySchedules = schedules.filter((s) => s.date === dateStr);

    // 按醫師分組
    const doctorScheduleMap = new Map<string, { doctorId: string; doctorName: string; slots: { id: string; label: string }[] }>();

    daySchedules.forEach((schedule) => {
      if (!doctorScheduleMap.has(schedule.doctorId)) {
        doctorScheduleMap.set(schedule.doctorId, {
          doctorId: schedule.doctorId,
          doctorName: schedule.doctorName,
          slots: [],
        });
      }

      const entry = doctorScheduleMap.get(schedule.doctorId)!;
      schedule.timeSlots.forEach((slot) => {
        entry.slots.push({
          id: `${schedule.doctorId}-${slot.id}`,
          label: `${slot.startTime}-${slot.endTime}`,
        });
      });
    });

    return Array.from(doctorScheduleMap.values());
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">診次排班</h1>
        <button
          type="button"
          className="h-10 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
        >
          新增預約
        </button>
      </header>

      {/* 主內容區 */}
      <div className="p-8">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg text-error">
            {error}
          </div>
        )}

        {/* 控制列 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* 左側：日期選擇 */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-neutral-600" />
                </button>
                <span className="text-sm font-medium text-neutral-900 min-w-[140px] text-center">
                  {getDateDisplayText()}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                </button>
              </div>

              {/* 檢視模式切換 */}
              <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-primary text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {mode === 'day' ? '日' : mode === 'week' ? '週' : '月'}
                  </button>
                ))}
              </div>
            </div>

            {/* 右側：操作按鈕 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-10 px-4 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-sm rounded-lg border border-neutral-300 transition-colors"
              >
                臨時休診
              </button>
              <button
                type="button"
                className="h-10 px-4 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
              >
                新增班表
              </button>
            </div>
          </div>
        </div>

        {/* 主要內容 */}
        {loading ? (
          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center text-neutral-500">
            載入中...
          </div>
        ) : viewMode === 'day' ? (
          /* 日檢視佈局 */
          <div>
            {/* 醫師篩選 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-neutral-500">選擇醫師</label>
                <span className="text-sm text-primary font-medium">
                  {selectedDoctorIds.length === 0 ? doctors.length : selectedDoctorIds.length}/{doctors.length}
                </span>
              </div>
              <div className="relative w-64">
                <button
                  type="button"
                  onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                  className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                >
                  <span className="text-neutral-700">
                    {selectedDoctorIds.length === 0 || selectedDoctorIds.length === doctors.length
                      ? '全部醫師'
                      : `已選 ${selectedDoctorIds.length} 位`}
                  </span>
                  <ChevronDown className="w-5 h-5 text-neutral-400" />
                </button>
                {showDoctorDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorIds(doctors.map((d) => d.id))}
                        className="text-sm text-primary hover:underline"
                      >
                        全選
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDoctorIds([])}
                        className="text-sm text-neutral-500 hover:underline"
                      >
                        取消
                      </button>
                    </div>
                    {doctors.map((doctor) => {
                      const isSelected = selectedDoctorIds.length === 0 || selectedDoctorIds.includes(doctor.id);
                      return (
                        <button
                          key={doctor.id}
                          type="button"
                          onClick={() => handleDoctorToggle(doctor.id)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-primary border-primary' : 'border-neutral-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>
                            {doctor.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 醫師班表卡片 */}
            <div className="grid grid-cols-4 gap-4">
              {getDaySchedules().length === 0 ? (
                <div className="col-span-4 bg-neutral-50 rounded-xl p-8 text-center text-neutral-500">
                  當日尚無排班資料
                </div>
              ) : (
                getDaySchedules().map((doctor) => (
                  <div key={doctor.doctorId} className="bg-neutral-50 rounded-xl p-4">
                    <div className="text-sm font-bold text-neutral-900 mb-3">
                      {doctor.doctorName}
                    </div>
                    <div className="space-y-2">
                      {doctor.slots.length === 0 ? (
                        <div className="text-sm text-neutral-400">尚未排班</div>
                      ) : (
                        doctor.slots.map((slot) => {
                          const isSelected = selectedSlots.includes(slot.id);
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => handleSlotClick(slot.id)}
                              className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                                isSelected
                                  ? 'border-primary text-primary bg-white'
                                  : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                              }`}
                            >
                              {slot.label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* 週/月檢視佈局 */
          <div className="flex gap-6">
            {/* 左側篩選區 */}
            <div className="w-64 flex-shrink-0 space-y-4">
              {/* 選擇醫師 */}
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-neutral-500">選擇醫師</label>
                  <span className="text-sm text-primary font-medium">
                    {selectedDoctorIds.length}/{doctors.length}
                  </span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDoctorDropdown(!showDoctorDropdown);
                      setShowTimeSlotDropdown(false);
                    }}
                    className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">
                      {selectedDoctorIds.length === 0
                        ? '全部醫師'
                        : selectedDoctorIds.length === doctors.length
                          ? '全部醫師'
                          : `已選 ${selectedDoctorIds.length} 位`}
                    </span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showDoctorDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {/* 全選/取消 */}
                      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctorIds(doctors.map((d) => d.id));
                          }}
                          className="text-sm text-primary hover:underline"
                        >
                          全選
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDoctorIds([])}
                          className="text-sm text-neutral-500 hover:underline"
                        >
                          取消
                        </button>
                      </div>
                      {doctors.map((doctor) => {
                        const isSelected = selectedDoctorIds.includes(doctor.id);
                        return (
                          <button
                            key={doctor.id}
                            type="button"
                            onClick={() => handleDoctorToggle(doctor.id)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'bg-primary border-primary' : 'border-neutral-300'
                            }`}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>
                              {doctor.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 選擇時段 */}
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-neutral-500">選擇時段</label>
                  <span className="text-sm text-primary font-medium">0/5</span>
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimeSlotDropdown(!showTimeSlotDropdown);
                      setShowDoctorDropdown(false);
                    }}
                    className="w-full h-10 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">{selectedTimeSlotLabel}</span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showTimeSlotDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {TIME_SLOT_OPTIONS.map((slot) => {
                        const isSelected = selectedTimeSlot === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              setSelectedTimeSlot(slot.id);
                              setShowTimeSlotDropdown(false);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              isSelected ? 'border-primary' : 'border-neutral-300'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </div>
                            <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>
                              {slot.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 操作說明 */}
              <div className="bg-warning/10 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-warning mb-1">操作說明</div>
                    <p className="text-xs text-warning/80 leading-relaxed">
                      選在日曆「點擊」範圍底色會顯示為藍色的類別，可獲取後新增至上方「新增班表」或「臨時休診」後，即可完成操作。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右側日曆區 */}
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                {viewMode === 'week' ? (
                <>
                  {/* 週檢視 - 標題（週名+日期） */}
                  <div className="grid grid-cols-7 border-b border-neutral-200">
                    {weekDays.map((date, index) => (
                      <div
                        key={index}
                        className="py-3 text-center border-r border-neutral-100 last:border-r-0"
                      >
                        <div className={`text-sm font-medium ${
                          index === 0 || index === 6 ? 'text-neutral-400' : 'text-neutral-600'
                        }`}>
                          {WEEKDAYS[index]}
                        </div>
                        <div className="text-primary font-bold text-base mt-1">
                          {date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 週檢視 - 格子 */}
                  <div className="grid grid-cols-7">
                    {weekDays.map((date, index) => {
                      const day = date.getDate();
                      const isSelected = selectedDates.includes(day);
                      const daySchedules = schedules.filter((s) => s.date === date.toISOString().split('T')[0]);

                      return (
                        <div
                          key={index}
                          className={`min-h-[200px] border-r border-neutral-100 last:border-r-0 p-3 cursor-pointer hover:bg-neutral-50 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => handleDateClick(day)}
                        >
                          {daySchedules.length === 0 ? (
                            <div className="text-sm text-neutral-400">
                              尚未排班
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {daySchedules.map((schedule) => (
                                <div key={schedule.id} className="text-xs text-primary">
                                  {schedule.doctorName}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* 月檢視 - 週標題 */}
                  <div className="grid grid-cols-7 border-b border-neutral-200">
                    {WEEKDAYS.map((day, index) => (
                      <div
                        key={day}
                        className={`py-3 text-center text-sm font-medium ${
                          index === 0 || index === 6 ? 'text-neutral-400' : 'text-neutral-600'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* 月檢視 - 日曆格子 */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, index) => {
                      const isSelected = day !== null && selectedDates.includes(day);
                      const isWeekend = index % 7 === 0 || index % 7 === 6;
                      const daySchedules = day ? getScheduleForDate(day) : [];

                      return (
                        <div
                          key={index}
                          className={`min-h-[100px] border-b border-r border-neutral-100 p-2 ${
                            day === null ? 'bg-neutral-50' : 'cursor-pointer hover:bg-neutral-50'
                          } ${isSelected ? 'bg-primary/10' : ''}`}
                          onClick={() => day !== null && handleDateClick(day)}
                        >
                          {day !== null && (
                            <>
                              <div className={`text-sm font-medium mb-1 ${
                                isSelected ? 'text-primary' : isWeekend ? 'text-neutral-400' : 'text-neutral-900'
                              }`}>
                                {day}
                              </div>
                              {daySchedules.length === 0 ? (
                                <div className="text-xs text-neutral-400">
                                  尚未排班
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  {daySchedules.slice(0, 2).map((schedule) => (
                                    <div key={schedule.id} className="text-xs text-primary truncate">
                                      {schedule.doctorName}
                                    </div>
                                  ))}
                                  {daySchedules.length > 2 && (
                                    <div className="text-xs text-neutral-400">
                                      +{daySchedules.length - 2} 更多
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

              {/* 底部提示 */}
              <div className="mt-4 bg-primary/5 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-primary mb-1">智慧疊加排班</div>
                    <p className="text-xs text-primary/80 leading-relaxed">
                      系統支援針對同一位醫師於相同日期「重複疊加」班表。您可以先排入固定班表，再根據需要手動追加「特殊班表」，臨時休診功能則可以精準覆蓋特定時段，確保切換正確顯示。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
