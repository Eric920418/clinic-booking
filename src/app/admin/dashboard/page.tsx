/**
 * 管理後台 Dashboard - 數據概覽
 * 顯示今日預約統計和預約列表
 * 使用 SWR 進行資料快取和即時更新
 */
'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import EditPatientModal from '@/components/admin/EditPatientModal';
import { useDashboard, type Doctor } from '@/lib/api';
import { useAddAppointment } from '@/contexts/AddAppointmentContext';

// 預約類型（從 API 返回的格式）
interface DashboardAppointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientNationalId: string;
  patientBirthDate: string;
  patientNotes: string;
  doctor: string;
  doctorId: string;
  treatmentType: string;
  treatmentTypeId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

// 狀態對應
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  booked: { label: '已預約', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '已報到', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', className: 'bg-success/10 text-success border border-success' },
  cancelled: { label: '已取消', className: 'bg-neutral-100 text-neutral-500' },
  no_show: { label: '未報到', className: 'bg-error/10 text-error' },
};

// 患者資料類型
interface PatientData {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  birthDate: string;
  treatmentType: string;
  note: string;
}

export default function DashboardPage() {
  const { openModal } = useAddAppointment();
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  // 使用 SWR hook 獲取 Dashboard 資料（包含醫師、統計、預約）
  const { data, error, isLoading, mutate } = useDashboard(selectedDoctorId);

  // 從 data 中解構資料
  const doctors = data?.doctors || [];
  const appointments = (data?.appointments || []) as DashboardAppointment[];
  const summary = data?.summary || { todayBooked: 0, todayCompleted: 0, todayCancelled: 0, todayCheckedIn: 0, todayNoShow: 0 };

  // 從 API 返回的 selectedDoctorId 同步到 state（只在首次載入時）
  // 這樣避免了瀑布式請求：API 自動選擇第一個醫師，前端只需同步
  useEffect(() => {
    if (data?.selectedDoctorId && !selectedDoctorId) {
      setSelectedDoctorId(data.selectedDoctorId);
    }
  }, [data?.selectedDoctorId, selectedDoctorId]);

  // 找到選中的醫師（使用 API 返回的或用戶選擇的）
  const effectiveDoctorId = selectedDoctorId || data?.selectedDoctorId;
  const selectedDoctor = doctors.find((d: Doctor) => d.id === effectiveDoctorId) || null;

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);

  // 新增預約
  const handleNewAppointment = () => {
    openModal();
  };

  // 編輯預約 - 開啟 Modal
  const handleEditAppointment = (appointment: DashboardAppointment) => {
    setEditingPatient({
      id: appointment.id,
      name: appointment.patientName,
      phone: appointment.patientPhone,
      idNumber: appointment.patientNationalId,
      birthDate: appointment.patientBirthDate,
      treatmentType: appointment.treatmentTypeId,
      note: appointment.patientNotes,
    });
    setIsEditModalOpen(true);
  };

  // 儲存患者資料
  const handleSavePatient = async (patientData: PatientData) => {
    try {
      const response = await fetch(`/api/admin/patients/${patientData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: patientData.name,
          phone: patientData.phone,
          nationalId: patientData.idNumber,
          birthDate: patientData.birthDate,
          notes: patientData.note || null,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.error('更新患者資料失敗:', result.error?.message);
      }
      // 更新後重新獲取資料
      await mutate();
    } catch (err) {
      console.error('更新患者資料失敗:', err);
    }
  };

  // 刪除預約
  const handleDeletePatient = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // 刪除後重新獲取資料
        await mutate();
      }
    } catch (err) {
      console.error('刪除預約失敗:', err);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">數據概覽</h1>
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
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg text-error">
            {error.message || "載入資料失敗"}
          </div>
        )}

        {/* 醫師篩選 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-500 mb-1 block">
                  醫師
                </label>
                <div className="text-sm text-primary font-medium">
                  {selectedDoctor ? 1 : 0}/{doctors.length}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                className="w-40 h-10 px-3 bg-white border border-neutral-300 rounded-lg flex items-center justify-between text-sm"
              >
                <span>{selectedDoctor?.name || "選擇醫師"}</span>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
              {showDoctorDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {doctors.map((doctor) => {
                    const isSelected = selectedDoctor?.id === doctor.id;
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctorId(doctor.id);
                          setShowDoctorDropdown(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-primary" : "border-neutral-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <span
                          className={
                            isSelected
                              ? "text-primary font-medium"
                              : "text-neutral-700"
                          }
                        >
                          {doctor.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* 今日已預約 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between">
              <div className="w-1 h-5 bg-primary rounded-full" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-neutral-600">今日已預約</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">
                  {summary.todayBooked}
                </div>
              </div>
              <Calendar className="w-6 h-6 text-neutral-300" />
            </div>
          </div>

          {/* 今日已完成 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between">
              <div className="w-1 h-5 bg-success rounded-full" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-neutral-600">今日已完成</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">
                  {summary.todayCompleted}
                </div>
              </div>
              <CheckCircle className="w-6 h-6 text-neutral-300" />
            </div>
          </div>

          {/* 今日已取消 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between">
              <div>
              <div className="w-1 h-full bg-error rounded-full" />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-neutral-600">今日已取消</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">
                  {summary.todayCancelled}
                </div>
              </div>
              <XCircle className="w-6 h-6 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* 預約列表表格 */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  看診時間
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  預約患者
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  基本資料
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  預約項目
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  報到狀態
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  備註
                </th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-neutral-500"
                  >
                    載入中...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-neutral-500"
                  >
                    今日尚無預約
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => {
                  const status =
                    STATUS_MAP[appointment.status] || STATUS_MAP.booked;
                  return (
                    <tr
                      key={appointment.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="text-primary font-bold">
                          {appointment.startTime}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {appointment.appointmentDate}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-neutral-900">
                          {appointment.patientName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {appointment.patientNationalId && (
                          <div className="text-sm text-neutral-600">
                            ID: {appointment.patientNationalId}
                          </div>
                        )}
                        {appointment.patientBirthDate && (
                          <div className="text-sm text-neutral-600">
                            BD: {appointment.patientBirthDate}
                          </div>
                        )}
                        {appointment.patientPhone && (
                          <div className="text-sm text-neutral-600">
                            {appointment.patientPhone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-neutral-900">
                          {appointment.treatmentType}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-neutral-600">
                          {appointment.patientNotes}
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

      {/* 編輯患者 Modal */}
      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSavePatient}
        onDelete={handleDeletePatient}
        initialData={editingPatient}
      />
    </div>
  );
}
