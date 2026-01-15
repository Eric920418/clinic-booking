/**
 * 患者資料頁面
 * 顯示所有患者列表，支援搜尋和編輯功能
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil } from 'lucide-react';
import EditPatientModal from '@/components/admin/EditPatientModal';

// 患者類型（來自API）
interface Patient {
  id: string;
  name: string;
  nationalId: string;
  birthDate: string;
  phone: string;
  notes: string | null;
  noShowCount: number;
  isBlacklisted: boolean;
  appointmentCount: number;
}

// 患者資料類型（Modal使用）
interface PatientData {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  birthDate: string;
  doctorId?: string;
  treatmentType: string;
  note: string;
}

export default function PatientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);

  // 載入狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);

  // 載入患者列表
  const fetchPatients = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const url = search
        ? `/api/admin/patients?search=${encodeURIComponent(search)}`
        : '/api/admin/patients';
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data?.items) {
        setPatients(result.data.items);
      } else {
        setPatients([]);
        if (!result.success) {
          setError(result.error?.message || '載入患者列表失敗');
        }
      }
      setError(null);
    } catch (err) {
      console.error('載入患者列表失敗:', err);
      setError(err instanceof Error ? err.message : '載入患者列表失敗');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // 搜尋（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchPatients(searchQuery);
      } else {
        fetchPatients();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPatients]);

  // 編輯患者
  const handleEditPatient = (patient: Patient) => {
    setEditingPatient({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      idNumber: patient.nationalId,
      birthDate: patient.birthDate,
      doctorId: '1',
      treatmentType: 'internal',
      note: patient.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // 儲存患者資料
  const handleSavePatient = async (data: PatientData) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/patients/${data.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          nationalId: data.idNumber,
          birthDate: data.birthDate,
          notes: data.note || null,
        }),
      });
      const result = await response.json();

      if (result.success) {
        // 重新載入列表
        await fetchPatients(searchQuery || undefined);
      } else {
        setError(result.error?.message || '儲存失敗');
      }
    } catch (err) {
      console.error('儲存患者資料失敗:', err);
      setError(err instanceof Error ? err.message : '儲存患者資料失敗');
    } finally {
      setSaving(false);
    }
  };

  // 刪除患者
  const handleDeletePatient = async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/admin/patients/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        // 重新載入列表
        await fetchPatients(searchQuery || undefined);
      } else {
        setError(result.error?.message || '刪除失敗');
      }
    } catch (err) {
      console.error('刪除患者失敗:', err);
      setError(err instanceof Error ? err.message : '刪除患者失敗');
    }
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white px-6 pt-4">
        <h1 className="text-xl font-bold text-neutral-900 pb-4 border-b border-neutral-200">患者資料</h1>
      </header>

      {/* 主內容 */}
      <div className="p-6">
        {/* 錯誤提示 */}
        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg text-error">
            {error}
          </div>
        )}

        {/* 搜尋框 */}
        <div className="mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="查詢患者"
              className="w-full h-11 pl-12 pr-4 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 患者列表表格 */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="">
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">患者名字</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">基本資料</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4 w-24">預約次數</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4 w-1/3">備註</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    載入中...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    {searchQuery ? '找不到符合的患者' : '目前沒有患者資料'}
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => router.push(`/admin/patients/${patient.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="font-medium text-neutral-900">
                        {patient.name}
                        {patient.isBlacklisted && (
                          <span className="ml-2 px-2 py-0.5 bg-error/10 text-error text-xs rounded">黑名單</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {patient.nationalId && (
                        <div className="text-sm text-neutral-600">ID: {patient.nationalId}</div>
                      )}
                      {patient.birthDate && (
                        <div className="text-sm text-neutral-600">BD: {patient.birthDate}</div>
                      )}
                      {patient.phone && (
                        <div className="text-sm text-neutral-600">{patient.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-neutral-900">{patient.appointmentCount} 次</div>
                      {patient.noShowCount > 0 && (
                        <div className="text-sm text-error">未報到: {patient.noShowCount} 次</div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-sm text-neutral-600 max-w-xs truncate">{patient.notes}</div>
                    </td>
                    <td className="px-6 py-5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPatient(patient);
                        }}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-600 disabled:bg-neutral-300 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                        編輯資料
                      </button>
                    </td>
                  </tr>
                ))
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
