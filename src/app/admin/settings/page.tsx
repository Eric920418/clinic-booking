/**
 * 系統設定頁面
 * 包含帳號權限管理和診療資源管理
 */
'use client';

import { useState } from 'react';
import { Trash2, Pencil, ChevronDown, MoreVertical } from 'lucide-react';
import EditTreatmentModal from '@/components/admin/EditTreatmentModal';
import DeleteDoctorModal from '@/components/admin/DeleteDoctorModal';
import EditAccountModal from '@/components/admin/EditAccountModal';
import AddAppointmentModal from '@/components/admin/AddAppointmentModal';

// 分頁類型
type TabType = 'accounts' | 'resources';

// 模擬醫師資料
const MOCK_DOCTORS = [
  { id: '1', name: '林醫師', treatments: ['針灸', '針灸', '針灸'], minutesPerSlot: 30 },
  { id: '2', name: '王醫師', treatments: ['針灸', '針灸', '針灸'], minutesPerSlot: 30 },
  { id: '3', name: '陳醫師', treatments: ['針灸', '針灸', '針灸'], minutesPerSlot: 30 },
  { id: '4', name: '鄭醫師', treatments: ['針灸', '針灸', '針灸'], minutesPerSlot: 30 },
  { id: '5', name: '簡醫師', treatments: ['針灸', '針灸', '針灸'], minutesPerSlot: 30 },
];

// 模擬診療項目資料
const MOCK_TREATMENTS = [
  { id: '1', name: '初診', minutes: 10 },
  { id: '2', name: '內科', minutes: 5 },
  { id: '3', name: '針灸', minutes: 5 },
];

// 項目選項
const TREATMENT_OPTIONS = [
  { value: 'first_visit', label: '初診' },
  { value: 'internal', label: '內科' },
  { value: 'acupuncture', label: '針灸' },
];

// 分鐘選項
const MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30];

// 權限選項
const ROLE_OPTIONS = [
  { value: 'admin', label: '管理者' },
  { value: 'editor', label: '編輯者' },
  { value: 'viewer', label: '檢視者' },
];

// 模擬帳號資料
const MOCK_ACCOUNTS = [
  { id: '1', username: 'twxin01', role: 'admin' },
  { id: '2', username: 'twxin01', role: 'editor' },
  { id: '3', username: 'twxin01', role: 'viewer' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('resources');

  // 醫師表單狀態
  const [doctorName, setDoctorName] = useState('');
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);
  const [doctorMinutes, setDoctorMinutes] = useState(30);
  const [doctors, setDoctors] = useState(MOCK_DOCTORS);

  // 診療項目表單狀態
  const [treatmentName, setTreatmentName] = useState('');
  const [treatmentMinutes, setTreatmentMinutes] = useState(5);
  const [treatments, setTreatments] = useState(MOCK_TREATMENTS);

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

  // 帳號管理狀態
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountRole, setAccountRole] = useState('viewer');
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
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
  const handleAddDoctor = () => {
    if (!doctorName.trim()) return;
    const newDoctor = {
      id: Date.now().toString(),
      name: doctorName,
      treatments: selectedTreatments.map(
        (t) => TREATMENT_OPTIONS.find((opt) => opt.value === t)?.label || t
      ),
      minutesPerSlot: doctorMinutes,
    };
    setDoctors([...doctors, newDoctor]);
    setDoctorName('');
    setSelectedTreatments([]);
  };

  // 開啟刪除醫師確認 Modal
  const handleDeleteDoctor = (id: string) => {
    setDeletingDoctorId(id);
    setIsDeleteDoctorModalOpen(true);
  };

  // 確認刪除醫師
  const handleConfirmDeleteDoctor = () => {
    if (deletingDoctorId) {
      setDoctors(doctors.filter((d) => d.id !== deletingDoctorId));
    }
    setIsDeleteDoctorModalOpen(false);
    setDeletingDoctorId(null);
  };

  // 新增診療項目
  const handleAddTreatment = () => {
    if (!treatmentName.trim()) return;
    const newTreatment = {
      id: Date.now().toString(),
      name: treatmentName,
      minutes: treatmentMinutes,
    };
    setTreatments([...treatments, newTreatment]);
    setTreatmentName('');
  };

  // 編輯診療項目
  const handleEditTreatment = (treatment: typeof MOCK_TREATMENTS[0]) => {
    setEditingTreatment(treatment);
    setIsEditTreatmentModalOpen(true);
  };

  // 儲存診療項目
  const handleSaveTreatment = (data: { id: string; name: string; minutes: number }) => {
    setTreatments((prev) =>
      prev.map((t) => (t.id === data.id ? { ...t, name: data.name, minutes: data.minutes } : t))
    );
  };

  // 刪除診療項目
  const handleDeleteTreatment = (id: string) => {
    setTreatments((prev) => prev.filter((t) => t.id !== id));
  };

  // 切換診療項目選擇
  const toggleTreatmentSelection = (value: string) => {
    setSelectedTreatments((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  // 新增帳號
  const handleAddAccount = () => {
    if (!accountUsername.trim() || !accountPassword.trim()) return;
    const newAccount = {
      id: Date.now().toString(),
      username: accountUsername,
      role: accountRole,
    };
    setAccounts([...accounts, newAccount]);
    setAccountUsername('');
    setAccountPassword('');
    setAccountRole('viewer');
  };

  // 刪除帳號
  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter((a) => a.id !== id));
    setActiveAccountMenu(null);
  };

  // 編輯帳號
  const handleEditAccount = (account: typeof MOCK_ACCOUNTS[0]) => {
    setEditingAccount(account);
    setIsEditAccountModalOpen(true);
    setActiveAccountMenu(null);
  };

  // 儲存帳號
  const handleSaveAccount = (data: { id: string; username: string; role: string; newPassword?: string }) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === data.id ? { ...a, username: data.username, role: data.role } : a))
    );
  };

  // 取得權限標籤
  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
  };

  return (
    <div className="min-h-screen">
      {/* 頂部標題列 */}
      <header className="bg-white border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">系統設定</h1>
        <button
          type="button"
          onClick={() => setIsAddAppointmentModalOpen(true)}
          className="h-10 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
        >
          新增預約
        </button>
      </header>

      {/* 主內容 */}
      <div className="p-8">
        {/* 分頁切換 */}
        <div className="mb-8">
          <div className="inline-flex bg-neutral-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'accounts'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              帳號權限管理
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'resources'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              診療資源管理
            </button>
          </div>
        </div>

        {/* 診療資源管理內容 */}
        {activeTab === 'resources' && (
          <div className="space-y-10">
            {/* 醫師資源管理 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">醫師資源管理</h2>

              {/* 新增醫師表單 */}
              <div className="flex items-end gap-4 mb-6">
                {/* 醫師名稱 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">醫師名稱</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="例：王醫師"
                    className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 項目（多選） */}
                <div className="w-48 relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-neutral-500">項目</label>
                    <span className="text-sm text-primary font-medium">
                      {selectedTreatments.length}/{TREATMENT_OPTIONS.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTreatmentDropdown(!showTreatmentDropdown);
                      setShowDoctorMinutesDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">
                      {selectedTreatments.length > 0
                        ? `已選 ${selectedTreatments.length} 項`
                        : '全部項目'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showTreatmentDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {TREATMENT_OPTIONS.map((option) => {
                        const isSelected = selectedTreatments.includes(option.value);
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => toggleTreatmentSelection(option.value)}
                            className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'border-primary bg-primary' : 'border-neutral-300'
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
                                isSelected ? 'text-primary font-medium' : 'text-neutral-700'
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
                  <label className="text-sm text-neutral-500 mb-1 block">單一時段分鐘設定</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDoctorMinutesDropdown(!showDoctorMinutesDropdown);
                      setShowTreatmentDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
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
                                isSelected ? 'border-primary' : 'border-neutral-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <span
                              className={
                                isSelected ? 'text-primary font-medium' : 'text-neutral-700'
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
                {doctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 min-w-[140px]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-neutral-900">{doctor.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoctor(doctor.id)}
                        className="p-1 hover:bg-neutral-100 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {doctor.treatments.map((treatment, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-neutral-500"
                        >
                          {treatment}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 新增診療項目 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">新增診療項目</h2>

              {/* 新增診療項目表單 */}
              <div className="flex items-end gap-4 mb-6">
                {/* 診科項目名稱 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">診科項目名稱</label>
                  <input
                    type="text"
                    value={treatmentName}
                    onChange={(e) => setTreatmentName(e.target.value)}
                    placeholder="例：初診、針灸、拔罐"
                    className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 診科扣點設定 */}
                <div className="w-40 relative">
                  <label className="text-sm text-neutral-500 mb-1 block">診科扣點設定</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTreatmentMinutesDropdown(!showTreatmentMinutesDropdown);
                      setShowTreatmentDropdown(false);
                      setShowDoctorMinutesDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
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
                                isSelected ? 'border-primary' : 'border-neutral-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <span
                              className={
                                isSelected ? 'text-primary font-medium' : 'text-neutral-700'
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
                          <span className="text-neutral-900">{treatment.name}</span>
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
        {activeTab === 'accounts' && (
          <div className="space-y-10">
            {/* 新增帳號 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">新增帳號</h2>

              {/* 新增帳號表單 */}
              <div className="flex items-end gap-4">
                {/* 帳戶名稱 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">帳戶名稱</label>
                  <input
                    type="text"
                    value={accountUsername}
                    onChange={(e) => setAccountUsername(e.target.value)}
                    className="w-full h-11 px-3 bg-neutral-100 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 密碼設定 */}
                <div className="w-56">
                  <label className="text-sm text-neutral-500 mb-1 block">密碼設定</label>
                  <input
                    type="password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                    className="w-full h-11 px-3 bg-neutral-100 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                {/* 權限設定 */}
                <div className="w-40 relative">
                  <label className="text-sm text-neutral-500 mb-1 block">權限設定</label>
                  <button
                    type="button"
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    className="w-full h-11 px-3 bg-neutral-100 border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className="text-neutral-700">{getRoleLabel(accountRole)}</span>
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
                                isSelected ? 'border-primary' : 'border-neutral-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                              )}
                            </div>
                            <span
                              className={
                                isSelected ? 'text-primary font-medium' : 'text-neutral-700'
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
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="flex-1 h-11 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  建立
                </button>
              </div>
            </section>

            {/* 用戶管理 */}
            <section>
              <h2 className="text-base font-bold text-neutral-900 mb-4">用戶管理</h2>

              {/* 帳號卡片列表 */}
              <div className="flex flex-wrap gap-4">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="bg-white border border-neutral-200 rounded-xl px-4 py-3 min-w-[160px] relative"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-neutral-900">{account.username}</div>
                        <div className="text-sm text-neutral-500">{getRoleLabel(account.role)}</div>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveAccountMenu(
                              activeAccountMenu === account.id ? null : account.id
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
          console.log('新增預約:', data);
          // TODO: 實際新增預約邏輯
        }}
      />
    </div>
  );
}
