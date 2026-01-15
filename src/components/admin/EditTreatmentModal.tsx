/**
 * 編輯診療項目 Modal
 * 用於系統設定頁編輯診療項目資訊
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';

interface TreatmentData {
  id: string;
  name: string;
  minutes: number;
}

interface EditTreatmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TreatmentData) => void;
  onDelete: (id: string) => void;
  initialData: TreatmentData | null;
}

// 分鐘選項
const MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30];

export default function EditTreatmentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: EditTreatmentModalProps) {
  const [formData, setFormData] = useState<TreatmentData>({
    id: '',
    name: '',
    minutes: 5,
  });
  const [showMinutesDropdown, setShowMinutesDropdown] = useState(false);
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
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    onDelete(formData.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-[452px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2 className="text-base font-bold text-neutral-900">診療項目設定</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-neutral-600" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-2">
          {/* 項目名稱 */}
          <div>
            <label className="text-sm font-bold text-neutral-500 mb-2 block">項目名稱</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-12 px-3 bg-neutral-100 border border-neutral-400 rounded-lg text-base focus:outline-none focus:border-primary"
            />
          </div>

          {/* 扣點設定 */}
          <div className="relative">
            <label className="text-sm font-bold text-neutral-500 mb-2 block">扣點設定</label>
            <button
              type="button"
              onClick={() => setShowMinutesDropdown(!showMinutesDropdown)}
              className="w-full h-12 px-3 bg-neutral-100 border border-neutral-400 rounded-lg text-base text-left flex items-center justify-between focus:outline-none focus:border-primary"
            >
              <span className="text-neutral-900">{formData.minutes}</span>
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
            {showMinutesDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {MINUTE_OPTIONS.map((minutes) => {
                  const isSelected = formData.minutes === minutes;
                  return (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, minutes });
                        setShowMinutesDropdown(false);
                      }}
                      className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span
                        className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}
                      >
                        {minutes}
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
                <span className="text-base font-bold text-error">確定要永久刪除此項目嗎？</span>
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
              <Trash2 className="w-6 h-6" />
              <span className="text-base">刪除此項目</span>
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
