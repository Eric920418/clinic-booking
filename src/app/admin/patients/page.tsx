/**
 * 患者資料頁面
 * 顯示所有患者列表，支援搜尋和編輯功能
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil } from 'lucide-react';
import EditPatientModal from '@/components/admin/EditPatientModal';

// 模擬患者資料
const MOCK_PATIENTS = [
  {
    id: '1',
    name: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    treatmentTypeValue: 'internal',
    note: '易對數料過敏',
  },
  {
    id: '2',
    name: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    treatmentTypeValue: 'internal',
    note: '易對數料過敏',
  },
  {
    id: '3',
    name: '陳小美',
    idNumber: 'A112349321',
    birthDate: '083-05-03',
    phone: '0902-568-234',
    doctorName: '王醫師',
    treatmentType: '內科',
    treatmentTypeValue: 'internal',
    note: '易對數料過敏',
  },
];

// 患者資料類型
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
  const [patients, setPatients] = useState(MOCK_PATIENTS);

  // Modal 狀態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientData | null>(null);

  // 篩選患者
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.idNumber.toLowerCase().includes(query) ||
      patient.phone.includes(query)
    );
  });

  // 編輯患者
  const handleEditPatient = (patient: typeof MOCK_PATIENTS[0]) => {
    setEditingPatient({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      idNumber: patient.idNumber,
      birthDate: patient.birthDate,
      doctorId: '1', // 預設王醫師
      treatmentType: patient.treatmentTypeValue,
      note: patient.note,
    });
    setIsEditModalOpen(true);
  };

  // 儲存患者資料
  const handleSavePatient = (data: PatientData) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === data.id
          ? {
              ...p,
              name: data.name,
              phone: data.phone,
              idNumber: data.idNumber,
              birthDate: data.birthDate,
              treatmentTypeValue: data.treatmentType,
              treatmentType: data.treatmentType === 'internal' ? '內科' : data.treatmentType === 'first_visit' ? '初診' : '針灸',
              note: data.note,
            }
          : p
      )
    );
  };

  // 刪除患者
  const handleDeletePatient = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">患者資料</h1>
        <button
          type="button"
          className="h-10 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
        >
          新增預約
        </button>
      </header>

      {/* 主內容 */}
      <div className="p-8">
        {/* 搜尋框 */}
        <div className="mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="查詢患者"
              className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* 患者列表表格 */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">患者名字</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">基本資料</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">預約醫師/ 項目</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">備註</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="border-b border-neutral-100 last:border-0 cursor-pointer hover:bg-neutral-50 transition-colors"
                  onClick={() => router.push(`/admin/patients/${patient.id}`)}
                >
                  <td className="px-6 py-5">
                    <div className="font-medium text-neutral-900">{patient.name}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-neutral-600">ID: {patient.idNumber}</div>
                    <div className="text-sm text-neutral-600">BD: {patient.birthDate}</div>
                    <div className="text-sm text-neutral-600">{patient.phone}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-neutral-900">{patient.doctorName}</div>
                    <div className="text-sm text-neutral-600">{patient.treatmentType}</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm text-neutral-600">{patient.note}</div>
                  </td>
                  <td className="px-6 py-5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPatient(patient);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      編輯資料
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    {searchQuery ? '找不到符合的患者' : '目前沒有患者資料'}
                  </td>
                </tr>
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
