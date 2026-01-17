/**
 * 系統設定頁面
 * 包含帳號權限管理和診療資源管理
 * 使用 SWR 進行資料快取和即時更新
 */
'use client';

import { useState, useMemo } from 'react';
import { Trash2, Pencil, ChevronDown, MoreVertical } from 'lucide-react';
import EditTreatmentModal from '@/components/admin/EditTreatmentModal';
import DeleteDoctorModal from '@/components/admin/DeleteDoctorModal';
import EditAccountModal from '@/components/admin/EditAccountModal';
import AddAppointmentModal from '@/components/admin/AddAppointmentModal';
import { useSettings, apiFetch } from '@/lib/api';

// 分頁類型
type TabType = 'accounts' | 'resources';

// 醫師型別（本地使用）
interface Doctor {
  id: string;
  name: string;
  treatments: string[];
  minutesPerSlot: number;
}

// 診療項目型別（本地使用）
interface Treatment {
  id: string;
  name: string;
  minutes: number;
}

// 帳號型別（本地使用）
interface Account {
  id: string;
  username: string;
  role: string;
}

// 分鐘選項
const MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30];

// 權限選項
const ROLE_OPTIONS = [
  { value: 'super_admin', label: '超級管理者' },
  { value: 'admin', label: '管理者' },
  { value: 'staff', label: '一般人員' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  const [localError, setLocalError] = useState<string | null>(null);

  // 使用 SWR hook 獲取設定資料（包含醫師、診療項目、帳號）
  const { data, error: swrError, isLoading, mutate } = useSettings();

  // 轉換 API 資料為本地格式
  const doctors: Doctor[] = useMemo(() =>
    (data?.doctors || []).map(d => ({
      id: d.id,
      name: d.name,
      treatments: (d.doctorTreatments || []).map(dt => dt.treatmentType?.name).filter(Boolean) as string[],
      minutesPerSlot: 30,
    })),
    [data?.doctors]
  );

  const treatments: Treatment[] = useMemo(() =>
    (data?.treatmentTypes || []).map(t => ({
      id: t.id,
      name: t.name,
      minutes: t.durationMinutes,
    })),
    [data?.treatmentTypes]
  );

  const accounts: Account[] = useMemo(() =>
    (data?.accounts || []).map(a => ({
      id: a.id,
      username: a.email,
      role: a.role,
    })),
    [data?.accounts]
  );

  // 項目選項（從 API 取得的診療項目）
  const treatmentOptions = useMemo(() =>
    (data?.treatmentTypes || []).map(t => ({
      value: t.id,
      label: t.name,
    })),
    [data?.treatmentTypes]
  );

  // 合併錯誤訊息
  const error = localError || (swrError ? swrError.message : null);

  // 醫師表單狀態
  const [doctorName, setDoctorName] = useState('');
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [doctorMinutes, setDoctorMinutes] = useState(30);

  // 診療項目表單狀態
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentMinutes, setTreatmentMinutes] = useState(5);

  // 下拉選單狀態
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [showDoctorMinutesDropdown, setShowDoctorMinutesDropdown] = useState(false);
  const [showTreatmentMinutesDropdown, setShowTreatmentMinutesDropdown] = useState(false);

  // 編輯診療項目 Modal 狀態
  const [isEditTreatmentModalOpen, setIsEditTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<{
    id: string;
    name: string;
    minutes: number;
  } | null>(null);

  // 刪除醫師 Modal 狀態
  const [isDeleteDoctorModalOpen, setIsDeleteDoctorModalOpen] = useState(false);
  const [deletingDoctorId, setDeletingDoctorId] = useState<string | null>(null);

  // 內聯編輯醫師狀態
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  const [editingDoctorName, setEditingDoctorName] = useState('');
  const [editingDoctorTreatments, setEditingDoctorTreatments] = useState<string[]>([]);
  const [showEditTreatmentDropdown, setShowEditTreatmentDropdown] = useState(false);

  // 帳號管理狀態
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountRole, setAccountRole] = useState('staff');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [activeAccountMenu, setActiveAccountMenu] = useState<string | null>(null);

  // 編輯帳號 Modal 狀態
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{
    id: string;
    username: string;
    role: string;
  } | null>(null);

  // 新增預約 Modal 狀態
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);

  // 新增醫師
  const handleAddDoctor = async () => {
    if (!doctorName.trim()) return;

    try {
      const response = await apiFetch('/api/admin/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: doctorName,
          treatmentIds: selectedTreatments.length > 0 ? selectedTreatments : undefined,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setDoctorName('');
        setSelectedTreatments([]);
        // 重新獲取資料
        await mutate();
      } else {
        setLocalError(result.error?.message || '新增醫師失敗');
      }
    } catch (err) {
      console.error('新增醫師失敗:', err);
      setLocalError('新增醫師失敗');
    }
  };

  // 開啟刪除醫師確認 Modal
  const handleDeleteDoctor = (id: string) => {
    setDeletingDoctorId(id);
    setIsDeleteDoctorModalOpen(true);
  };

  // 確認刪除醫師
  const handleConfirmDeleteDoctor = async () => {
    if (deletingDoctorId) {
      try {
        // 呼叫停用 API（軟刪除）
        const response = await apiFetch(`/api/admin/doctors/${deletingDoctorId}/disable`, {
          method: 'POST',
        });

        const result = await response.json();

        if (result.success) {
          // 重新獲取資料
          await mutate();
        } else {
          setLocalError(result.error?.message || '停用醫師失敗');
        }
      } catch (err) {
        console.error('停用醫師失敗:', err);
        setLocalError('停用醫師失敗');
      }
    }
    setIsDeleteDoctorModalOpen(false);
    setDeletingDoctorId(null);
  };

  // 開始內聯編輯醫師
  const startEditDoctor = (doctor: Doctor) => {
    // 從 API 資料中取得該醫師的診療項目 IDs
    const apiDoctor = data?.doctors?.find(d => d.id === doctor.id);
    const treatmentIds = (apiDoctor?.doctorTreatments || [])
      .map(dt => dt.treatmentType?.id)
      .filter(Boolean) as string[];

    setEditingDoctorId(doctor.id);
    setEditingDoctorName(doctor.name);
    setEditingDoctorTreatments(treatmentIds);
    setShowEditTreatmentDropdown(false);
  };

  // 取消編輯醫師
  const cancelEditDoctor = () => {
    setEditingDoctorId(null);
    setEditingDoctorName('');
    setEditingDoctorTreatments([]);
    setShowEditTreatmentDropdown(false);
  };

  // 切換編輯中的診療項目選擇
  const toggleEditDoctorTreatment = (treatmentId: string) => {
    setEditingDoctorTreatments(prev =>
      prev.includes(treatmentId)
        ? prev.filter(id => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  // 儲存編輯醫師
  const saveEditDoctor = async () => {
    if (!editingDoctorId || !editingDoctorName.trim()) return;

    try {
      const response = await apiFetch(`/api/admin/doctors/${editingDoctorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingDoctorName,
          treatmentIds: editingDoctorTreatments,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await mutate();
        cancelEditDoctor();
      } else {
        setLocalError(result.error?.message || '更新醫師失敗');
      }
    } catch (err) {
      console.error('更新醫師失敗:', err);
      setLocalError('更新醫師失敗');
    }
  };

  // 新增診療項目
  const handleAddTreatment = async () => {
    if (!treatmentName.trim()) return;

    try {
      const response = await apiFetch('/api/admin/treatments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: treatmentName, durationMinutes: treatmentMinutes }),
      });
      const result = await response.json();

      if (result.success) {
        await mutate();
        setTreatmentName('');
        setTreatmentMinutes(5);
      } else {
        setLocalError(result.error?.message || '新增診療項目失敗');
      }
    } catch (err) {
      console.error('新增診療項目失敗:', err);
      setLocalError('新增診療項目失敗');
    }
  };

  // 編輯診療項目
  const handleEditTreatment = (treatment: Treatment) => {
    setEditingTreatment(treatment);
    setIsEditTreatmentModalOpen(true);
  };

  // 儲存診療項目
  const handleSaveTreatment = async (treatmentData: { id: string; name: string; minutes: number }) => {
    try {
      // 呼叫 API 更新診療項目
      const response = await apiFetch(`/api/admin/treatments/${treatmentData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: treatmentData.minutes }),
      });

      const result = await response.json();

      if (result.success) {
        // 重新獲取資料
        await mutate();
      } else {
        setLocalError(result.error?.message || '更新診療項目失敗');
      }
    } catch (err) {
      console.error('更新診療項目失敗:', err);
      setLocalError('更新診療項目失敗');
    }
  };

  // 刪除診療項目
  const handleDeleteTreatment = async (id: string) => {
    try {
      // 呼叫停用 API（軟刪除）
      const response = await apiFetch(`/api/admin/treatments/${id}/disable`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重新獲取資料
        await mutate();
      } else {
        setLocalError(result.error?.message || '停用診療項目失敗');
      }
    } catch (err) {
      console.error('停用診療項目失敗:', err);
      setLocalError('停用診療項目失敗');
    }
  };

  // 切換診療項目選擇
  const toggleTreatmentSelection = (value: string) => {
    setSelectedTreatments((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  // 新增帳號
  const handleAddAccount = async () => {
    if (!accountUsername.trim() || !accountPassword.trim()) return;

    try {
      const response = await apiFetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: accountUsername,
          password: accountPassword,
          name: accountUsername.split('@')[0],
          role: accountRole,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAccountUsername('');
        setAccountPassword('');
        setAccountRole('staff');
        // 重新獲取資料
        await mutate();
      } else {
        setLocalError(result.error?.message || result.error || '新增帳號失敗');
      }
    } catch (err) {
      console.error('新增帳號失敗:', err);
      setLocalError('新增帳號失敗');
    }
  };

  // 刪除帳號
  const handleDeleteAccount = async (id: string) => {
    try {
      const response = await apiFetch(`/api/admin/accounts/${id}/disable`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        // 重新獲取資料
        await mutate();
      } else {
        setLocalError(result.error?.message || '停用帳號失敗');
      }
    } catch (err) {
      console.error('停用帳號失敗:', err);
      setLocalError('停用帳號失敗');
    }
    setActiveAccountMenu(null);
  };

  // 編輯帳號
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setIsEditAccountModalOpen(true);
    setActiveAccountMenu(null);
  };

  // 儲存帳號
  const handleSaveAccount = async (accountData: { id: string; username: string; role: string; newPassword?: string }) => {
    try {
      const response = await apiFetch(`/api/admin/accounts/${accountData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountData.username,
          role: accountData.role,
          newPassword: accountData.newPassword || undefined,
        }),
      });
      const result = await response.json();

      if (result.success) {
        await mutate();
      } else {
        setLocalError(result.error?.message || '更新帳號失敗');
      }
    } catch (err) {
      console.error('更新帳號失敗:', err);
      setLocalError('更新帳號失敗');
    }
  };

  // 取得權限標籤
  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
  };

  // 載入中狀態
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* 錯誤訊息 */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg shadow-lg">
          {error}
          <button
            onClick={() => setLocalError(null)}
            className="ml-4 text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {/* 頂部標題列 */}
      <header className="bg-white px-6 pt-4">
        <h1 className="text-xl font-bold text-neutral-900 pb-4 border-b border-neutral-200">系統設定</h1>
      </header>

      {/* 主內容 */}
      <div className="p-6">
        {/* 分頁切換 */}
        <div className="mb-8">
          <div className="inline-flex bg-[#E7E7E7] rounded-lg px-[4px] py-[6.5px]">
            <button
              type="button"
              onClick={() => setActiveTab("accounts")}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "accounts"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              帳號權限管理
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("resources")}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "resources"
                  ? "bg-white text-primary shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              診療資源管理
            </button>
          </div>
        </div>

        {/* 診療資源管理內容 */}
        {activeTab === "resources" && (
          <div className="space-y-10">
            {/* 醫師資源管理 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                醫師資源管理
              </h2>

              {/* 新增醫師表單 */}
              <div className="flex items-end gap-4 mb-6">
                {/* 醫師名稱 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    醫師名稱
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="例：王醫師"
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 項目（多選） */}
                <div className="w-48 relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-neutral-500">項目</label>
                    <span className="text-sm text-primary font-medium">
                      {selectedTreatments.length}/{treatmentOptions.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTreatmentDropdown(!showTreatmentDropdown);
                      setShowDoctorMinutesDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">
                      {selectedTreatments.length > 0
                        ? `已選 ${selectedTreatments.length} 項`
                        : "全部項目"}
                    </span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showTreatmentDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {treatmentOptions.map((option) => {
                        const isSelected = selectedTreatments.includes(
                          option.value
                        );
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              toggleTreatmentSelection(option.value)
                            }
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-neutral-300"
                              }`}
                            >
                              {isSelected && (
                                <svg
                                  className="w-3 h-3 text-white"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <span
                              className={
                                isSelected
                                  ? "text-primary font-medium"
                                  : "text-neutral-700"
                              }
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 單一時段分鐘設定 */}
                <div className="w-40 relative">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    單一時段分鐘設定
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDoctorMinutesDropdown(!showDoctorMinutesDropdown);
                      setShowTreatmentDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">{doctorMinutes}</span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showDoctorMinutesDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {MINUTE_OPTIONS.map((minutes) => {
                        const isSelected = doctorMinutes === minutes;
                        return (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => {
                              setDoctorMinutes(minutes);
                              setShowDoctorMinutesDropdown(false);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "border-primary"
                                  : "border-neutral-300"
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
                              {minutes}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 新增按鈕 */}
                <button
                  type="button"
                  onClick={handleAddDoctor}
                  className="h-11 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  新增醫師資源
                </button>
              </div>

              {/* 醫師卡片列表 */}
              <div className="flex flex-wrap gap-4">
                {doctors.map((doctor) =>
                  editingDoctorId === doctor.id ? (
                    /* 編輯模式 */
                    <div
                      key={doctor.id}
                      className="bg-white border-2 border-primary rounded-xl px-4 py-3 min-w-[200px]"
                    >
                      {/* 名稱輸入 */}
                      <input
                        type="text"
                        value={editingDoctorName}
                        onChange={(e) => setEditingDoctorName(e.target.value)}
                        className="w-full h-9 px-2 mb-2 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm font-medium focus:outline-none focus:border-primary"
                        autoFocus
                      />

                      {/* 診療項目選擇 */}
                      <div className="relative mb-3">
                        <button
                          type="button"
                          onClick={() => setShowEditTreatmentDropdown(!showEditTreatmentDropdown)}
                          className="w-full h-9 px-2 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                        >
                          <span className="text-neutral-700 truncate">
                            {editingDoctorTreatments.length > 0
                              ? `已選 ${editingDoctorTreatments.length} 項`
                              : '選擇項目'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        </button>
                        {showEditTreatmentDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                            {treatmentOptions.map((option) => {
                              const isSelected = editingDoctorTreatments.includes(option.value);
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => toggleEditDoctorTreatment(option.value)}
                                  className="w-full px-2 py-1.5 flex items-center gap-2 text-sm hover:bg-neutral-50"
                                >
                                  <div
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                      isSelected ? 'border-primary bg-primary' : 'border-neutral-300'
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* 已選項目標籤 */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {editingDoctorTreatments.map((id) => {
                          const treatment = treatmentOptions.find(t => t.value === id);
                          return treatment ? (
                            <span key={id} className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {treatment.label}
                            </span>
                          ) : null;
                        })}
                      </div>

                      {/* 操作按鈕 */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={saveEditDoctor}
                          className="flex-1 h-8 bg-primary hover:bg-primary-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          儲存
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditDoctor}
                          className="flex-1 h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            cancelEditDoctor();
                            handleDeleteDoctor(doctor.id);
                          }}
                          className="h-8 px-2 hover:bg-neutral-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 顯示模式 */
                    <div
                      key={doctor.id}
                      className="bg-white border border-neutral-200 rounded-xl px-4 py-3 min-w-[140px] cursor-pointer hover:border-primary transition-colors"
                      onClick={() => startEditDoctor(doctor)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-900">
                          {doctor.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDoctor(doctor.id);
                          }}
                          className="p-1 hover:bg-neutral-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {doctor.treatments.length > 0 ? (
                          doctor.treatments.map((treatment, idx) => (
                            <span key={idx} className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                              {treatment}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-neutral-400">未設定診療項目</span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>

            {/* 新增診療項目 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                新增診療項目
              </h2>

              {/* 新增診療項目表單 */}
              <div className="flex items-end gap-4 mb-6">
                {/* 診科項目名稱 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    診科項目名稱
                  </label>
                  <input
                    type="text"
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    placeholder="例：初診、針灸、拔罐"
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 診科扣點設定 */}
                <div className="w-40 relative">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    診科扣點設定
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTreatmentMinutesDropdown(
                        !showTreatmentMinutesDropdown
                      );
                      setShowTreatmentDropdown(false);
                      setShowDoctorMinutesDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">{treatmentMinutes}</span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showTreatmentMinutesDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {MINUTE_OPTIONS.map((minutes) => {
                        const isSelected = treatmentMinutes === minutes;
                        return (
                          <button
                            key={minutes}
                            type="button"
                            onClick={() => {
                              setTreatmentMinutes(minutes);
                              setShowTreatmentMinutesDropdown(false);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "border-primary"
                                  : "border-neutral-300"
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
                              {minutes}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 新增按鈕 */}
                <button
                  type="button"
                  onClick={handleAddTreatment}
                  className="h-11 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  新增診科項目
                </button>
              </div>

              {/* 診療項目表格 */}
              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50">
                      <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">
                        診科項目
                      </th>
                      <th className="text-left text-sm font-medium text-neutral-500 px-6 py-4">
                        扣點設定
                      </th>
                      <th className="text-right text-sm font-medium text-neutral-500 px-6 py-4">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map((treatment) => (
                      <tr
                        key={treatment.id}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        <td className="px-6 py-4">
                          <span className="text-neutral-900">
                            {treatment.name}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 text-sm text-primary border border-primary rounded-full">
                            {treatment.minutes}分鐘
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditTreatment(treatment)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            編輯資料
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* 帳號權限管理內容 */}
        {activeTab === "accounts" && (
          <div className="space-y-10">
            {/* 新增帳號 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                新增帳號
              </h2>

              {/* 新增帳號表單 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 帳戶名稱 */}
                <div className="w-full">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    帳戶名稱
                  </label>
                  <input
                    type="text"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 密碼設定 */}
                <div className="w-full">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    密碼設定
                  </label>
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 權限設定 */}
                <div className="w-full relative">
                  <label className="text-sm text-neutral-500 mb-1 block">
                    權限設定
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">
                      {getRoleLabel(accountRole)}
                    </span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showRoleDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {ROLE_OPTIONS.map((option) => {
                        const isSelected = accountRole === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setAccountRole(option.value);
                              setShowRoleDropdown(false);
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? "border-primary"
                                  : "border-neutral-300"
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
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 建立按鈕 */}
                <div className="w-full flex items-end">
                  <button
                    type="button"
                    onClick={handleAddAccount}
                    className="w-full h-11 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
                  >
                    建立
                  </button>
                </div>
              </div>
            </section>

            {/* 用戶管理 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">
                用戶管理
              </h2>

              {/* 帳號卡片列表 */}
              <div className="grid grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 relative"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-neutral-900">
                          {account.username}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {getRoleLabel(account.role)}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveAccountMenu(
                              activeAccountMenu === account.id
                                ? null
                                : account.id
                            )
                          }
                          className="p-1 hover:bg-neutral-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-neutral-400" />
                        </button>
                        {activeAccountMenu === account.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 min-w-[80px] py-1">
                            <button
                              type="button"
                              onClick={() => handleEditAccount(account)}
                              className="w-full px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 text-left"
                            >
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(account.id)}
                              className="w-full px-4 py-2 text-sm text-error hover:bg-neutral-50 text-left"
                            >
                              刪除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* 編輯診療項目 Modal */}
      <EditTreatmentModal
        isOpen={isEditTreatmentModalOpen}
        onClose={() => {
          setIsEditTreatmentModalOpen(false);
          setEditingTreatment(null);
        }}
        onSave={handleSaveTreatment}
        onDelete={handleDeleteTreatment}
        initialData={editingTreatment}
      />

      {/* 刪除醫師確認 Modal */}
      <DeleteDoctorModal
        isOpen={isDeleteDoctorModalOpen}
        onClose={() => {
          setIsDeleteDoctorModalOpen(false);
          setDeletingDoctorId(null);
        }}
        onConfirm={handleConfirmDeleteDoctor}
        doctorName={doctors.find((d) => d.id === deletingDoctorId)?.name}
      />

      {/* 編輯帳號 Modal */}
      <EditAccountModal
        isOpen={isEditAccountModalOpen}
        onClose={() => {
          setIsEditAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        onDelete={handleDeleteAccount}
        initialData={editingAccount}
      />

      {/* 新增預約 Modal */}
      <AddAppointmentModal
        isOpen={isAddAppointmentModalOpen}
        onClose={() => setIsAddAppointmentModalOpen(false)}
        onConfirm={(data) => {
          console.log("新增預約:", data);
          // TODO: 實際新增預約邏輯
        }}
      />
    </div>
  );
}
