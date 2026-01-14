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

// 模擬醫師資料
const DOCTORS = [
  { id: '1', name: '王醫師' },
  { id: '2', name: '李醫師' },
  { id: '3', name: '陳醫師' },
  { id: '4', name: '林醫師' },
  { id: '5', name: '張醫師' },
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
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
  },
  {
    id: '2',
    time: '10:30',
    date: '115-01-03',
    patientName: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
  },
  {
    id: '3',
    time: '10:30',
    date: '115-01-03',
    patientName: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    treatmentType: '內科',
    status: 'completed',
    note: '易對數料過敏',
  },
];

// 狀態對應
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  booked: { label: '已預約', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '已報到', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '已完成', className: 'bg-success/10 text-success border border-success' },
  cancelled: { label: '已取消', className: 'bg-neutral-100 text-neutral-500' },
  no_show: { label: '未報到', className: 'bg-error/10 text-error' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [selectedDoctor, setSelectedDoctor] = useState(DOCTORS[0]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [stats, setStats] = useState({
    booked: 1,
    completed: 1,
    cancelled: 1,
  });

  // 新增預約
  const handleNewAppointment = () => {
    router.push('/admin/appointments/new');
  };

  // 編輯預約
  const handleEditAppointment = (id: string) => {
    router.push(`/admin/appointments/${id}/edit`);
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
                <span>{selectedDoctor.name}</span>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </button>
              {showDoctorDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {DOCTORS.map((doctor) => (
                    <button
                      key={doctor.id}
                      type="button"
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setShowDoctorDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                        selectedDoctor.id === doctor.id ? 'bg-primary/5 text-primary' : ''
                      }`}
                    >
                      {doctor.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="text-sm text-primary font-medium">
              0/{DOCTORS.length}
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
                      <div className="text-sm text-neutral-600">ID: {appointment.idNumber}</div>
                      <div className="text-sm text-neutral-600">BD: {appointment.birthDate}</div>
                      <div className="text-sm text-neutral-600">{appointment.phone}</div>
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
                        onClick={() => handleEditAppointment(appointment.id)}
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
    </div>
  );
}
