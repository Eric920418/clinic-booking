/**
 * 管理後台 - 預約排程
 * 顯示預約列表，支援搜尋、多選篩選、出席管理
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Calendar,
  ChevronDown,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import EditAppointmentModal from '@/components/admin/EditAppointmentModal';

// 模擬醫師資料（不含「全部」選項）
const DOCTORS = [
  { id: '1', name: '王醫師' },
  { id: '2', name: '李醫師' },
  { id: '3', name: '陳醫師' },
  { id: '4', name: '林醫師' },
  { id: '5', name: '張醫師' },
];

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

// 模擬預約資料
const MOCK_APPOINTMENTS = [
  {
    id: '1',
    time: '10:30',
    date: '115-01-03',
    patientName: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
    attendance: null as 'present' | 'absent' | null,
  },
  {
    id: '2',
    time: '10:30',
    date: '115-01-03',
    patientName: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
    attendance: 'present' as 'present' | 'absent' | null,
  },
  {
    id: '3',
    time: '10:30',
    date: '115-01-03',
    patientName: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
    attendance: 'absent' as 'present' | 'absent' | null,
  },
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
        className="w-36 h-10 px-3 bg-white border border-neutral-300 rounded-lg flex items-center justify-between text-sm"
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
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('115-01-15');
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);

  // 多選篩選狀態
  const [selectedDoctors, setSelectedDoctors] = useState<string[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Dropdown 開關狀態
  const [openDropdown, setOpenDropdown] = useState<'doctor' | 'treatment' | 'status' | null>(null);

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentData | null>(null);

  // 取得顯示文字
  const getDoctorDisplayText = () => {
    if (selectedDoctors.length === 0) return '全部醫師';
    if (selectedDoctors.length === DOCTORS.length) return '全部醫師';
    if (selectedDoctors.length === 1) {
      return DOCTORS.find((d) => d.id === selectedDoctors[0])?.name || '全部醫師';
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
    router.push('/admin/appointments/new');
  };

  // 編輯預約
  const handleEditAppointment = (appointment: typeof MOCK_APPOINTMENTS[0]) => {
    // 找到醫師 ID
    const doctor = DOCTORS.find((d) => d.name === appointment.doctorName);
    setEditingAppointment({
      id: appointment.id,
      date: appointment.date,
      time: appointment.time,
      doctorId: doctor?.id || '1',
      treatmentType: appointment.treatmentType === '內科' ? 'internal' : appointment.treatmentType === '初診' ? 'first_visit' : 'acupuncture',
      status: appointment.status,
      note: appointment.note,
    });
    setIsEditModalOpen(true);
  };

  // 標記出席
  const handleAttendance = (id: string, status: 'present' | 'absent') => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === id ? { ...apt, attendance: status } : apt
      )
    );
  };

  // 儲存預約資料
  const handleSaveAppointment = (data: AppointmentData) => {
    const doctor = DOCTORS.find((d) => d.id === data.doctorId);
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === data.id
          ? {
              ...apt,
              date: data.date,
              time: data.time,
              doctorName: doctor?.name || apt.doctorName,
              treatmentType: data.treatmentType === 'internal' ? '內科' : data.treatmentType === 'first_visit' ? '初診' : '針灸',
              status: data.status,
              note: data.note,
            }
          : apt
      )
    );
  };

  // 刪除預約
  const handleDeleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== id));
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">預約排程</h1>
        <button
          type="button"
          onClick={handleNewAppointment}
          className="h-10 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
        >
          新增預約
        </button>
      </header>

      {/* 主內容 */}
      <div className="p-8">
        {/* 搜尋列 */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="查詢患者"
            className="w-full max-w-md h-11 pl-12 pr-4 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
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
                  type="text"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-36 h-10 px-3 pr-10 bg-white border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>

            {/* 醫師篩選（多選） */}
            <MultiSelectDropdown
              label="醫師"
              options={DOCTORS}
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
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
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
              {appointments.map((appointment) => {
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
              })}
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
      />
    </div>
  );
}
