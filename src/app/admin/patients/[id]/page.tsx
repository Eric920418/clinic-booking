/**
 * 病患歷史資料頁面
 * 顯示特定患者的看診歷史記錄
 */
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Trash2, ArrowLeft } from 'lucide-react';
import DeleteRecordModal from '@/components/admin/DeleteRecordModal';

// 模擬歷史資料
const MOCK_HISTORY = [
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
    createdDate: '115-01-12',
    createdTime: '14:33:03',
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
    doctorName: '王醫師',
    treatmentType: '內科',
    status: 'completed',
    createdDate: '115-01-12',
    createdTime: '14:33:09',
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
    doctorName: '王醫師',
    treatmentType: '內科',
    status: 'completed',
    createdDate: '115-01-12',
    createdTime: '14:33:23',
    note: '易對數料過敏',
  },
];

// 狀態對應
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'bg-success/10 text-success border border-success' },
  booked: { label: '已預約', className: 'bg-blue-100 text-blue-700' },
  cancelled: { label: '已取消', className: 'bg-neutral-100 text-neutral-500' },
  no_show: { label: '未報到', className: 'bg-error/10 text-error' },
};

export default function PatientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState(MOCK_HISTORY);

  // 刪除確認 Modal 狀態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // 篩選歷史記錄
  const filteredHistory = historyList.filter((record) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.patientName.toLowerCase().includes(query) ||
      record.idNumber.toLowerCase().includes(query) ||
      record.phone.includes(query)
    );
  });

  // 開啟刪除確認 Modal
  const handleOpenDeleteModal = (id: string) => {
    setDeletingRecordId(id);
    setIsDeleteModalOpen(true);
  };

  // 確認刪除記錄
  const handleConfirmDelete = () => {
    if (deletingRecordId) {
      setHistoryList((prev) => prev.filter((r) => r.id !== deletingRecordId));
    }
    setIsDeleteModalOpen(false);
    setDeletingRecordId(null);
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

        {/* 歷史記錄表格 */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">看診時間</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">患者名字</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">基本資料</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">預約醫師/ 項目</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">報到狀態</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">建立時間</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">備註</th>
                <th className="text-left text-sm font-medium text-neutral-500 px-4 py-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((record) => {
                const status = STATUS_MAP[record.status] || STATUS_MAP.completed;
                return (
                  <tr key={record.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-4">
                      <div className="text-primary font-bold">{record.time}</div>
                      <div className="text-sm text-neutral-500">{record.date}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-neutral-900">{record.patientName}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-neutral-600">ID: {record.idNumber}</div>
                      <div className="text-sm text-neutral-600">BD: {record.birthDate}</div>
                      <div className="text-sm text-neutral-600">{record.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-neutral-900">{record.doctorName}</div>
                      <div className="text-sm text-neutral-600">{record.treatmentType}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-neutral-900">{record.createdDate}</div>
                      <div className="text-sm text-neutral-500">{record.createdTime}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-neutral-600">{record.note}</div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(record.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-error hover:bg-error-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        刪除資料
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    {searchQuery ? '找不到符合的記錄' : '目前沒有歷史資料'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 刪除確認 Modal */}
      <DeleteRecordModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingRecordId(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
