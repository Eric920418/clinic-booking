/**
 * 編輯醫師 Modal
 * 用於系統設定頁編輯醫師資訊（姓名、診療項目）
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';

interface TreatmentOption {
  value: string;
  label: string;
}

interface DoctorData {
  id: string;
  name: string;
  treatmentIds: string[];
}

interface EditDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DoctorData) => void;
  onDelete: (id: string) => void;
  initialData: DoctorData | null;
  treatmentOptions: TreatmentOption[];
}

export default function EditDoctorModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  treatmentOptions,
}: EditDoctorModalProps) {
  const [formData, setFormData] = useState<DoctorData>({
    id: '',
    name: '',
    treatmentIds: [],
  });
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 初始化表單資料
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setShowDeleteConfirm(false);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!formData.name.trim()) return;
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    onDelete(formData.id);
    onClose();
  };

  const toggleTreatmentSelection = (value: string) => {
    setFormData(prev => ({
      ...prev,
      treatmentIds: prev.treatmentIds.includes(value)
        ? prev.treatmentIds.filter(id => id !== value)
        : [...prev.treatmentIds, value],
    }));
  };

  const getSelectedTreatmentNames = () => {
    return formData.treatmentIds
      .map(id => treatmentOptions.find(t => t.value === id)?.label)
      .filter(Boolean)
      .join('、');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-[452px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-base font-bold text-neutral-900">編輯醫師</h2>
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
          {/* 醫師名稱 */}
          <div>
            <label className="text-sm font-bold text-neutral-500 mb-2 block">醫師名稱</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例：王醫師"
              className="w-full h-12 px-3 bg-neutral-100 border border-neutral-400 rounded-lg text-base focus:outline-none focus:border-primary"
            />
          </div>

          {/* 診療項目（多選） */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-neutral-500">診療項目</label>
              <span className="text-sm text-primary font-medium">
                {formData.treatmentIds.length}/{treatmentOptions.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowTreatmentDropdown(!showTreatmentDropdown)}
              className="w-full h-12 px-3 bg-neutral-100 border border-neutral-400 rounded-lg text-base text-left flex items-center justify-between focus:outline-none focus:border-primary"
            >
              <span className="text-neutral-700 truncate">
                {formData.treatmentIds.length > 0
                  ? getSelectedTreatmentNames() || `已選 ${formData.treatmentIds.length} 項`
                  : '選擇診療項目'}
              </span>
              <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            </button>
            {showTreatmentDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {treatmentOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-neutral-500">無可用診療項目</div>
                ) : (
                  treatmentOptions.map((option) => {
                    const isSelected = formData.treatmentIds.includes(option.value);
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
                          className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })
                )}
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
                <span className="text-base font-bold text-error">確定要停用此醫師嗎？</span>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                停用後該醫師的所有未來預約將被取消，並通知相關病患。
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 h-10 bg-error hover:bg-error-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
                >
                  確認停用
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
              <Trash2 className="w-6 h-6" />
              <span className="text-base">停用此醫師</span>
            </button>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end gap-4">
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
              disabled={!formData.name.trim()}
              className="h-[43px] px-6 bg-primary hover:bg-primary-600 text-white font-bold text-base rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              儲存變更
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
