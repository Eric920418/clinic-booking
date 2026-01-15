/**
 * 編輯預約資料 Modal
 * 用於在預約排程頁編輯預約資訊
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Info, ChevronDown, Calendar } from 'lucide-react';

interface AppointmentData {
  id: string;
  date: string;
  time: string;
  doctorId: string;
  treatmentType: string;
  status: string;
  note: string;
}

interface EditAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AppointmentData) => void;
  onDelete: (id: string) => void;
  initialData: AppointmentData | null;
}

// 時間選項
const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

// 醫師選項
const DOCTOR_OPTIONS = [
  { id: '1', name: '王醫師' },
  { id: '2', name: '李醫師' },
  { id: '3', name: '陳醫師' },
  { id: '4', name: '林醫師' },
  { id: '5', name: '張醫師' },
];

// 項目選項
const TREATMENT_OPTIONS = [
  { value: 'first_visit', label: '初診' },
  { value: 'internal', label: '內科' },
  { value: 'acupuncture', label: '針灸' },
];

// 狀態選項
const STATUS_OPTIONS = [
  { value: 'booked', label: '已預約' },
  { value: 'checked_in', label: '已報到' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'no_show', label: '未報到' },
];

export default function EditAppointmentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: EditAppointmentModalProps) {
  const [formData, setFormData] = useState<AppointmentData>({
    id: '',
    date: '',
    time: '10:00',
    doctorId: '1',
    treatmentType: 'internal',
    status: 'booked',
    note: '',
  });

  // 下拉選單狀態
  const [openDropdown, setOpenDropdown] = useState<'time' | 'doctor' | 'treatment' | 'status' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 初始化表單資料
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof AppointmentData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setOpenDropdown(null);
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const handleDelete = () => {
    onDelete(formData.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const selectedDoctor = DOCTOR_OPTIONS.find((d) => d.id === formData.doctorId);
  const selectedTreatment = TREATMENT_OPTIONS.find((t) => t.value === formData.treatmentType);
  const selectedStatus = STATUS_OPTIONS.find((s) => s.value === formData.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">編輯患者資料</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* 預約日期 & 看診時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">預約日期</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  placeholder="000-00-00"
                  className="w-full h-11 px-3 pr-10 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>
            <div className="relative">
              <label className="text-sm text-neutral-500 mb-1 block">看診時間</label>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
              >
                <span>{formData.time}</span>
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              </button>
              {openDropdown === 'time' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {TIME_OPTIONS.map((time) => {
                    const isSelected = formData.time === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleInputChange('time', time)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{time}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 預約醫師 & 預約項目 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm text-neutral-500 mb-1 block">預約醫師</label>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'doctor' ? null : 'doctor')}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
              >
                <span>{selectedDoctor?.name || '請選擇'}</span>
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              </button>
              {openDropdown === 'doctor' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {DOCTOR_OPTIONS.map((doctor) => {
                    const isSelected = formData.doctorId === doctor.id;
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => handleInputChange('doctorId', doctor.id)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{doctor.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="text-sm text-neutral-500 mb-1 block">預約項目</label>
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'treatment' ? null : 'treatment')}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
              >
                <span>{selectedTreatment?.label || '請選擇'}</span>
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              </button>
              {openDropdown === 'treatment' && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {TREATMENT_OPTIONS.map((treatment) => {
                    const isSelected = formData.treatmentType === treatment.value;
                    return (
                      <button
                        key={treatment.value}
                        type="button"
                        onClick={() => handleInputChange('treatmentType', treatment.value)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{treatment.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 預約狀態 */}
          <div className="relative">
            <label className="text-sm text-neutral-500 mb-1 block">預約狀態</label>
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
            >
              <span>{selectedStatus?.label || '請選擇'}</span>
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            </button>
            {openDropdown === 'status' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                {STATUS_OPTIONS.map((status) => {
                  const isSelected = formData.status === status.value;
                  return (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleInputChange('status', status.value)}
                      className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-primary' : 'border-neutral-300'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{status.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 備註 */}
          <div>
            <label className="text-sm text-neutral-500 mb-1 block">備註</label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              rows={4}
              className="w-full px-3 py-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-100">
          {/* 刪除按鈕 */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-error hover:text-error-700 text-sm font-medium mb-4 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            刪除此筆資料
          </button>

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end gap-3 mb-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-sm rounded-lg border border-neutral-300 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-10 px-5 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg transition-colors"
            >
              儲存變更
            </button>
          </div>

          {/* 提示訊息 */}
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Info className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm text-primary">修改狀態後，系統將自動同步。</span>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              確定要刪除嗎？
            </h3>
            <p className="text-sm text-neutral-500 mb-6">
              刪除後將無法復原此筆預約資料。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-sm rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 h-10 bg-error hover:bg-error-700 text-white font-medium text-sm rounded-lg transition-colors"
              >
                確定刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
