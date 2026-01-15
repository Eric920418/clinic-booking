/**
 * 刪除醫師確認 Modal
 * 用於系統設定頁刪除醫師時的確認對話框
 */
'use client';

import { X } from 'lucide-react';

interface DeleteDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  doctorName?: string;
}

export default function DeleteDoctorModal({
  isOpen,
  onClose,
  onConfirm,
  doctorName,
}: DeleteDoctorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-[471px] mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-base font-bold text-error">
            確定要永久刪除此醫師嗎？
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-neutral-600" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onClose}
            className="h-[43px] px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-base rounded-xl shadow-sm transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 h-10 bg-error hover:bg-error-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}
