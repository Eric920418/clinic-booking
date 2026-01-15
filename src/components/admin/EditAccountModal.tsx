/**
 * 編輯帳號 Modal
 * 用於系統設定頁編輯帳號資訊
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';

interface AccountData {
  id: string;
  username: string;
  role: string;
}

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AccountData & { newPassword?: string }) => void;
  onDelete: (id: string) => void;
  initialData: AccountData | null;
}

// 權限選項
const ROLE_OPTIONS = [
  { value: 'admin', label: '管理者' },
  { value: 'editor', label: '編輯者' },
  { value: 'viewer', label: '檢視者' },
];

export default function EditAccountModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: EditAccountModalProps) {
  const [formData, setFormData] = useState<AccountData>({
    id: '',
    username: '',
    role: 'viewer',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 初始化表單資料
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setNewPassword('');
      setConfirmPassword('');
      setShowDeleteConfirm(false);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    // 如果有輸入新密碼，檢查確認密碼是否一致
    if (newPassword && newPassword !== confirmPassword) {
      alert('密碼確認不一致');
      return;
    }
    onSave({
      ...formData,
      ...(newPassword ? { newPassword } : {}),
    });
    onClose();
  };

  const handleDelete = () => {
    onDelete(formData.id);
    onClose();
  };

  const getRoleLabel = (role: string) => {
    return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-[452px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-base font-bold text-neutral-900">編輯帳號</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-neutral-600" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* 帳號 & 密碼 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 帳號 */}
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">帳號</label>
              <input
                type="text"
                value={formData.username}
                readOnly
                className="w-full h-12 px-3 bg-neutral-100 border border-neutral-200 rounded-lg text-base text-neutral-700"
              />
            </div>

            {/* 密碼（顯示用） */}
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">密碼</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value="••••••"
                  readOnly
                  className="w-full h-12 px-3 pr-10 bg-neutral-100 border border-neutral-200 rounded-lg text-base text-neutral-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 變更密碼 & 變更確認 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 變更密碼 */}
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">變更密碼</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-12 px-3 pr-10 bg-white border border-neutral-300 rounded-lg text-base focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 變更確認 */}
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">變更確認</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 px-3 pr-10 bg-white border border-neutral-300 rounded-lg text-base focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 備註 */}
          <p className="text-sm text-neutral-400">若不變更請留白</p>

          {/* 權限設定 */}
          <div className="relative">
            <label className="text-sm text-neutral-500 mb-1 block">權限設定</label>
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="w-full h-12 px-3 bg-white border border-neutral-300 rounded-lg text-base text-left flex items-center justify-between focus:outline-none focus:border-primary"
            >
              <span className="text-neutral-900">{getRoleLabel(formData.role)}</span>
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            </button>
            {showRoleDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                {ROLE_OPTIONS.map((option) => {
                  const isSelected = formData.role === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, role: option.value });
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
                        className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-neutral-200" />

        {/* Footer */}
        <div className="p-6 space-y-6">
          {/* 刪除確認區塊 */}
          {showDeleteConfirm ? (
            <div className="p-4 bg-error/5 rounded-lg ring-2 ring-error/60">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-error" />
                <span className="text-base font-bold text-error">確定要永久刪除此帳號嗎？</span>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 h-10 bg-error hover:bg-error-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                >
                  確認刪除
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-sm rounded-xl shadow-sm transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            /* 刪除按鈕 */
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-error hover:text-error-700 font-bold transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-sm">刪除此帳號</span>
            </button>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end gap-5">
            <button
              type="button"
              onClick={onClose}
              className="h-[43px] px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-bold text-base rounded-xl shadow-sm transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-[43px] px-6 bg-primary hover:bg-primary-600 text-white font-bold text-base rounded-xl shadow-sm transition-colors"
            >
              儲存變更
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
