/**
 * 管理後台 - 預約排程
 * 顯示預約列表，支援搜尋、多選篩選、出席管理
 * 使用 SWR 進行資料快取
 */
'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import EditAppointmentModal from '@/components/admin/EditAppointmentModal';
import { useDoctors, useAppointments, type Doctor } from '@/lib/api';
import { useAddAppointment } from '@/contexts/AddAppointmentContext';

// 預約類型
interface Appointment {
  id: string;
  time: string;
  date: string;
  patientName: string;
  idNumber: string;
  birthDate: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  treatmentType: string;
  treatmentTypeId: string;
  status: string;
  note: string;
  attendance: 'present' | 'absent' | null;
}

// 項目選項
const TREATMENTS = [
  { id: 'first_visit', name: '初診' },
  { id: 'internal', name: '內科' },
  { id: 'acupuncture', name: '針灸' },
];

// 狀態選項
const STATUSES = [
  { id: 'booked', name: '已預約' },
  { id: 'checked_in', name: '已報到' },
  { id: 'completed', name: '已完成' },
  { id: 'cancelled', name: '已取消' },
  { id: 'no_show', name: '未報到' },
];

// 狀態對應樣式
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  booked: { label: '已預約', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '已報到', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', className: 'bg-success/10 text-success border border-success' },
  cancelled: { label: '已取消', className: 'bg-neutral-100 text-neutral-500' },
  no_show: { label: '未報到', className: 'bg-error/10 text-error' },
};

// 預約資料類型
interface AppointmentData {
  id: string;
  date: string;
  time: string;
  doctorId: string;
  treatmentType: string;
  status: string;
  note: string;
}

// 多選下拉選單組件
interface MultiSelectDropdownProps {
  label: string;
  options: { id: string; name: string }[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isOpen: boolean;
  onToggle: () => void;
  displayText: string;
}

function MultiSelectDropdown({
  label,
  options,
  selectedIds,
  onSelectionChange,
  isOpen,
  onToggle,
  displayText,
}: MultiSelectDropdownProps) {
  const handleSelectAll = () => {
    onSelectionChange(options.map((opt) => opt.id));
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <label className="text-sm text-neutral-500">{label}</label>
        <span className="text-xs text-primary font-medium">
          {selectedIds.length}/{options.length}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="w-36 h-10 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg flex items-center justify-between text-sm"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
          {/* 全選/取消按鈕 */}
          <div className="flex border-b border-neutral-200">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex-1 px-3 py-2 text-sm text-primary font-medium hover:bg-primary/5 border-r border-neutral-200"
            >
              全選
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="flex-1 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              取消
            </button>
          </div>
          {/* 選項列表 */}
          <div className="max-h-48 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleToggleItem(option.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-neutral-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppointmentsPage() {
  const { openModal } = useAddAppointment();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // 多選篩選狀態
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Dropdown 開關狀態
  const [openDropdown, setOpenDropdown] = useState<'doctor' | 'treatment' | 'status' | null>(null);

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentData | null>(null);

  // 使用 SWR hooks 取得資料
  const { data: doctorsData } = useDoctors();
  const doctors: Doctor[] = doctorsData || [];

  // 建立篩選參數
  const appointmentFilters = useMemo(() => ({
    dateFrom: selectedDate,
    dateTo: selectedDate,
    doctorId: selectedDoctors.length === 1 ? selectedDoctors[0] : undefined,
    status: selectedStatuses.length === 1 ? selectedStatuses[0] : undefined,
  }), [selectedDate, selectedDoctors, selectedStatuses]);

  const { data: appointmentsData, error: swrError, isLoading, mutate } = useAppointments(appointmentFilters);

  // 轉換預約資料格式
  const appointments: Appointment[] = useMemo(() => {
    if (!appointmentsData?.items) return [];
    return appointmentsData.items.map((item) => ({
      id: item.id,
      time: item.startTime,
      date: item.appointmentDate,
      patientName: item.patientName,
      idNumber: '',
      birthDate: '',
      phone: item.patientPhone || '',
      doctorId: item.doctorId || '',
      doctorName: item.doctor,
      treatmentType: item.treatmentType,
      treatmentTypeId: item.treatmentTypeId || '',
      status: item.status,
      note: item.notes || '',
      attendance: null,
    }));
  }, [appointmentsData]);

  const loading = isLoading;
  const error = swrError ? swrError.message : null;

  // 取得顯示文字
  const getDoctorDisplayText = () => {
    if (selectedDoctors.length === 0) return '全部醫師';
    if (selectedDoctors.length === doctors.length) return '全部醫師';
    if (selectedDoctors.length === 1) {
      return doctors.find((d) => d.id === selectedDoctors[0])?.name || '全部醫師';
    }
    return `已選 ${selectedDoctors.length} 位`;
  };

  const getTreatmentDisplayText = () => {
    if (selectedTreatments.length === 0) return '全部項目';
    if (selectedTreatments.length === TREATMENTS.length) return '全部項目';
    if (selectedTreatments.length === 1) {
      return TREATMENTS.find((t) => t.id === selectedTreatments[0])?.name || '全部項目';
    }
    return `已選 ${selectedTreatments.length} 項`;
  };

  const getStatusDisplayText = () => {
    if (selectedStatuses.length === 0) return '全部狀態';
    if (selectedStatuses.length === STATUSES.length) return '全部狀態';
    if (selectedStatuses.length === 1) {
      return STATUSES.find((s) => s.id === selectedStatuses[0])?.name || '全部狀態';
    }
    return `已選 ${selectedStatuses.length} 種`;
  };

  // 新增預約
  const handleNewAppointment = () => {
    openModal();
  };

  // 編輯預約
  const handleEditAppointment = (appointment: Appointment) => {
    // 找到醫師 ID
    const doctor = doctors.find((d) => d.name === appointment.doctorName);
    setEditingAppointment({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time,
      doctorId: doctor?.id || '',
      treatmentType: appointment.treatmentType === '內科' ? 'internal' : appointment.treatmentType === '初診' ? 'first_visit' : 'acupuncture',
      status: appointment.status,
      note: appointment.note,
    });
    setIsEditModalOpen(true);
  };

  // 標記出席
  const handleAttendance = async (id: string, status: 'present' | 'absent') => {
    try {
      const newStatus = status === 'present' ? 'checked_in' : 'no_show';
      const response = await fetch(`/api/admin/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // 使用 SWR mutate 重新獲取資料
        await mutate();
      }
    } catch (err) {
      console.error('更新出席狀態失敗:', err);
    }
  };

  // 儲存預約資料
  const handleSaveAppointment = async (data: AppointmentData) => {
    try {
      // 先更新狀態
      const statusResponse = await fetch(`/api/admin/appointments/${data.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status }),
      });
      const statusResult = await statusResponse.json();
      if (!statusResult.success) {
        console.error('更新狀態失敗:', statusResult.error?.message);
      }

      // 找到醫師名稱（優先從 doctors 列表找，找不到就用原始資料）
      const doctor = doctors.find((d) => d.id === data.doctorId);
      const doctorName = doctor?.name;

      // 再更新其他欄位（日期、時間、醫師、診療類型）
      const updateResponse = await fetch(`/api/admin/appointments/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: data.date,
          time: data.time,
          doctorId: data.doctorId,
          doctorName: doctorName,
          treatmentType: data.treatmentType,
        }),
      });
      const updateResult = await updateResponse.json();
      if (!updateResult.success) {
        console.error('更新預約失敗:', updateResult.error?.message);
      }

      // 重新獲取資料
      await mutate();
    } catch (err) {
      console.error('更新預約失敗:', err);
    }
  };

  // 刪除預約
  const handleDeleteAppointment = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // 使用 SWR mutate 重新獲取資料
        await mutate();
      }
    } catch (err) {
      console.error('刪除預約失敗:', err);
    }
  };

  // 搜尋過濾
  const filteredAppointments = appointments.filter((apt) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!apt.patientName.toLowerCase().includes(query) &&
          !apt.phone.includes(query)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white px-6 pt-4">
        <h1 className="text-xl font-bold text-neutral-900 pb-4 border-b border-neutral-200">預約排程</h1>
      </header>

      {/* 主內容 */}
      <div className="p-6">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg text-error">
            {error}
          </div>
        )}

        {/* 搜尋列 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="查詢患者"
            className="w-full max-w-md h-11 pl-12 pr-4 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>

        {/* 篩選器 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex items-end gap-4">
            {/* 日期篩選 */}
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">日期</label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-36 h-10 px-3 pr-10 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* 醫師篩選（多選） */}
            <MultiSelectDropdown
              label="醫師"
              options={doctors}
              selectedIds={selectedDoctors}
              onSelectionChange={setSelectedDoctors}
              isOpen={openDropdown === 'doctor'}
              onToggle={() => setOpenDropdown(openDropdown === 'doctor' ? null : 'doctor')}
              displayText={getDoctorDisplayText()}
            />

            {/* 項目篩選（多選） */}
            <MultiSelectDropdown
              label="項目"
              options={TREATMENTS}
              selectedIds={selectedTreatments}
              onSelectionChange={setSelectedTreatments}
              isOpen={openDropdown === 'treatment'}
              onToggle={() => setOpenDropdown(openDropdown === 'treatment' ? null : 'treatment')}
              displayText={getTreatmentDisplayText()}
            />

            {/* 狀態篩選（多選） */}
            <MultiSelectDropdown
              label="狀態"
              options={STATUSES}
              selectedIds={selectedStatuses}
              onSelectionChange={setSelectedStatuses}
              isOpen={openDropdown === 'status'}
              onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              displayText={getStatusDisplayText()}
            />
          </div>
        </div>

        {/* 預約列表表格 */}
        <div className="bg-white rounded-xl  overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="">
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">預約時段</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">預約患者</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">預約醫師/項目</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">報道狀態</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">備註</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">出席</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    載入中...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    {searchQuery ? '找不到符合的預約' : '尚無預約資料'}
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => {
                  const status = STATUS_MAP[appointment.status] || STATUS_MAP.booked;
                  return (
                    <tr key={appointment.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-4">
                        <div className="text-primary font-bold">{appointment.time}</div>
                        <div className="text-sm text-neutral-500">{appointment.date}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-neutral-900">{appointment.patientName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-neutral-900">{appointment.doctorName}</div>
                        <div className="text-sm text-neutral-500">{appointment.treatmentType}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-neutral-600">{appointment.note}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAttendance(appointment.id, 'present')}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                              appointment.attendance === 'present'
                                ? 'bg-success border-success text-white'
                                : 'border-neutral-300 text-neutral-400 hover:border-success hover:text-success'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAttendance(appointment.id, 'absent')}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                              appointment.attendance === 'absent'
                                ? 'bg-error border-error text-white'
                                : 'border-neutral-300 text-neutral-400 hover:border-error hover:text-error'
                            }`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleEditAppointment(appointment)}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                          編輯資料
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 編輯預約 Modal */}
      <EditAppointmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        initialData={editingAppointment}
        doctors={doctors}
      />
    </div>
  );
}
