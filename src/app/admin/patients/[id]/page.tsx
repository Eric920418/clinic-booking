/**
 * 病患歷史資料頁面
 * 顯示特定患者的看診歷史記錄
 */
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Search, Trash2 } from 'lucide-react';
import DeleteRecordModal from '@/components/admin/DeleteRecordModal';

// 歷史記錄類型
interface HistoryRecord {
  id: string;
  time: string;
  date: string;
  patientName: string;
  idNumber: string;
  birthDate: string;
  phone: string;
  doctorName: string;
  treatmentType: string;
  status: string;
  createdDate: string;
  createdTime: string;
  note: string;
}

// 狀態對應
const STATUS_MAP: Record<string, { label: string; className: string }> = {
  completed: { label: '已完成', className: 'bg-success/10 text-success border border-success' },
  booked: { label: '已預約', className: 'bg-blue-100 text-blue-700' },
  checked_in: { label: '已報到', className: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: '已取消', className: 'bg-neutral-100 text-neutral-500' },
  no_show: { label: '未報到', className: 'bg-error/10 text-error' },
};

export default function PatientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState<HistoryRecord[]>([]);

  // 載入狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 刪除確認 Modal 狀態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // 載入患者歷史記錄
  // TODO: 目前 API 沒有提供單一患者歷史端點，暫時使用預約列表
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/appointments?limit=100');
        const result = await response.json();

        if (result.success && result.data?.items) {
          const history: HistoryRecord[] = result.data.items.map((item: {
            id: string;
            startTime: string;
            appointmentDate: string;
            patientName: string;
            patientPhone?: string;
            doctor: string;
            treatmentType: string;
            status: string;
            createdAt: string;
          }) => {
            const createdAt = new Date(item.createdAt);
            return {
              id: item.id,
              time: item.startTime,
              date: item.appointmentDate,
              patientName: item.patientName,
              idNumber: '',
              birthDate: '',
              phone: item.patientPhone || '',
              doctorName: item.doctor,
              treatmentType: item.treatmentType,
              status: item.status,
              createdDate: createdAt.toLocaleDateString('zh-TW'),
              createdTime: createdAt.toLocaleTimeString('zh-TW'),
              note: '',
            };
          });
          setHistoryList(history);
        } else {
          setHistoryList([]);
        }
        setError(null);
      } catch (err) {
        console.error('載入歷史記錄失敗:', err);
        setError('載入歷史記錄失敗');
        setHistoryList([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [params.id]);

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
  const handleConfirmDelete = async () => {
    if (deletingRecordId) {
      try {
        const response = await fetch(`/api/admin/appointments/${deletingRecordId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          setHistoryList((prev) => prev.filter((r) => r.id !== deletingRecordId));
        }
      } catch (err) {
        console.error('刪除記錄失敗:', err);
      }
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    載入中...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    {searchQuery ? '找不到符合的記錄' : '目前沒有歷史資料'}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((record) => {
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
                        {record.idNumber && (
                          <div className="text-sm text-neutral-600">ID: {record.idNumber}</div>
                        )}
                        {record.birthDate && (
                          <div className="text-sm text-neutral-600">BD: {record.birthDate}</div>
                        )}
                        {record.phone && (
                          <div className="text-sm text-neutral-600">{record.phone}</div>
                        )}
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
                })
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
