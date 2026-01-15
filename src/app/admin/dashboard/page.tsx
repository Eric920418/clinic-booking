/**
 * 管理後台 Dashboard - 數據概覽
 * 顯示今日預約統計和預約列表
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import EditPatientModal from '@/components/admin/EditPatientModal';

// 醫師類型
interface Doctor {
  id: string;
  name: string;
}

// 預約類型
interface Appointment {
  id: string;
  time: string;
  date: string;
  patientName: string;
  idNumber: string;
  birthDate: string;
  phone: string;
  treatmentType: string;
  status: string;
  note: string;
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
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState({
    booked: 0,
    completed: 0,
    cancelled: 0,
  });

  // 載入狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);

  // 載入醫師列表
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch('/api/liff/doctors');
        const result = await response.json();
        if (result.success && result.data) {
          const doctorList = result.data.map((d: { id: string; name: string }) => ({
            id: d.id,
            name: d.name,
          }));
          setDoctors(doctorList);
          if (doctorList.length > 0) {
            setSelectedDoctor(doctorList[0]);
          }
        }
      } catch (err) {
        console.error('載入醫師列表失敗:', err);
        setError('載入醫師列表失敗');
      }
    };
    fetchDoctors();
  }, []);

  // 載入統計數據
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('/api/admin/dashboard/summary');
        const result = await response.json();
        if (result.success && result.data) {
          setStats({
            booked: result.data.todayBooked || 0,
            completed: result.data.todayCompleted || 0,
            cancelled: result.data.todayCancelled || 0,
          });
        }
      } catch (err) {
        console.error('載入統計數據失敗:', err);
      }
    };
    fetchSummary();
  }, []);

  // 載入今日預約列表
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const params = new URLSearchParams({
          dateFrom: today,
          dateTo: today,
        });
        if (selectedDoctor?.id) {
          params.append('doctorId', selectedDoctor.id);
        }

        const response = await fetch(`/api/admin/appointments?${params}`);
        const result = await response.json();

        if (result.success && result.data?.items) {
          const appointmentList = result.data.items.map((item: {
            id: string;
            startTime: string;
            appointmentDate: string;
            patientName: string;
            patientPhone: string;
            treatmentType: string;
            status: string;
          }) => ({
            id: item.id,
            time: item.startTime,
            date: item.appointmentDate,
            patientName: item.patientName,
            idNumber: '', // API 未返回
            birthDate: '', // API 未返回
            phone: item.patientPhone || '',
            treatmentType: item.treatmentType,
            status: item.status,
            note: '', // API 未返回
          }));
          setAppointments(appointmentList);
        } else {
          setAppointments([]);
        }
        setError(null);
      } catch (err) {
        console.error('載入預約列表失敗:', err);
        setError('載入預約列表失敗');
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedDoctor]);

  // 新增預約
  const handleNewAppointment = () => {
    router.push('/admin/appointments/new');
  };

  // 編輯預約 - 開啟 Modal
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingPatient({
      id: appointment.id,
      name: appointment.patientName,
      phone: appointment.phone,
      idNumber: appointment.idNumber,
      birthDate: appointment.birthDate,
      treatmentType: appointment.treatmentType === '內科' ? 'internal' : appointment.treatmentType === '初診' ? 'first_visit' : 'acupuncture',
      note: appointment.note,
    });
    setIsEditModalOpen(true);
  };

  // 儲存患者資料
  const handleSavePatient = async (data: PatientData) => {
    // TODO: 呼叫 API 更新患者資料
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === data.id
          ? {
              ...apt,
              patientName: data.name,
              phone: data.phone,
              idNumber: data.idNumber,
              birthDate: data.birthDate,
              treatmentType: data.treatmentType === 'internal' ? '內科' : data.treatmentType === 'first_visit' ? '初診' : '針灸',
              note: data.note,
            }
          : apt
      )
    );
  };

  // 刪除預約
  const handleDeletePatient = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/appointments/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== id));
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
            {error}
          </div>
        )}

        {/* 醫師篩選 */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <label className="text-sm text-neutral-500 mb-1 block">醫師</label>
              <button
                type="button"
                onClick={() => setShowDoctorDropdown(!showDoctorDropdown)}
                className="w-40 h-10 px-3 bg-white border border-neutral-300 rounded-lg flex items-center justify-between text-sm"
              >
                <span>{selectedDoctor?.name || '選擇醫師'}</span>
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
                          setSelectedDoctor(doctor);
                          setShowDoctorDropdown(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{doctor.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="text-sm text-primary font-medium">
              {selectedDoctor ? 1 : 0}/{doctors.length}
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* 今日已預約 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <span className="text-sm text-neutral-600">今日已預約</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">{stats.booked}</div>
              </div>
              <Calendar className="w-6 h-6 text-neutral-300" />
            </div>
          </div>

          {/* 今日已完成 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-success rounded-full" />
                  <span className="text-sm text-neutral-600">今日已完成</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">{stats.completed}</div>
              </div>
              <CheckCircle className="w-6 h-6 text-neutral-300" />
            </div>
          </div>

          {/* 今日已取消 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 bg-error rounded-full" />
                  <span className="text-sm text-neutral-600">今日已取消</span>
                </div>
                <div className="text-4xl font-bold text-neutral-900">{stats.cancelled}</div>
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
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">看診時間</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">預約患者</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">基本資料</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">預約項目</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">報到狀態</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-3">備註</th>
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
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    今日尚無預約
                  </td>
                </tr>
              ) : (
                appointments.map((appointment) => {
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
                        {appointment.idNumber && (
                          <div className="text-sm text-neutral-600">ID: {appointment.idNumber}</div>
                        )}
                        {appointment.birthDate && (
                          <div className="text-sm text-neutral-600">BD: {appointment.birthDate}</div>
                        )}
                        {appointment.phone && (
                          <div className="text-sm text-neutral-600">{appointment.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-neutral-900">{appointment.treatmentType}</div>
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
