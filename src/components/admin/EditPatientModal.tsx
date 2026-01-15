/**
 * 編輯患者資料 Modal
 * 用於在 Dashboard 編輯預約患者資訊
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Info, ChevronDown, Calendar, AlertTriangle } from 'lucide-react';

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

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PatientData) => void;
  onDelete: (id: string) => void;
  initialData: PatientData | null;
}

// 醫師選項
const DOCTOR_OPTIONS = [
  { id: '1', name: '王醫師' },
  { id: '2', name: '李醫師' },
  { id: '3', name: '陳醫師' },
  { id: '4', name: '林醫師' },
  { id: '5', name: '張醫師' },
];

// 預約項目選項
const TREATMENT_OPTIONS = [
  { value: 'first_visit', label: '初診' },
  { value: 'internal', label: '內科' },
  { value: 'acupuncture', label: '針灸' },
];

export default function EditPatientModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
}: EditPatientModalProps) {
  const [formData, setFormData] = useState<PatientData>({
    id: '',
    name: '',
    phone: '',
    idNumber: '',
    birthDate: '',
    doctorId: '1',
    treatmentType: 'internal',
    note: '',
  });
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showTreatmentDropdown, setShowTreatmentDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 初始化表單資料
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof PatientData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
  const selectedTreatment = TREATMENT_OPTIONS.find(
    (opt) => opt.value === formData.treatmentType
  );

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
          {/* 姓名 & 聯絡方式 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">姓名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full h-11 px-3 bg-neutral-100 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">聯絡方式</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* 身分證字號 & 出生日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">身分證字號</label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value.toUpperCase())}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-500 mb-1 block">出生日期</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  placeholder="000-00-00"
                  className="w-full h-11 px-3 pr-10 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:border-primary"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* 預約醫師 & 預約項目 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm text-neutral-500 mb-1 block">預約醫師</label>
              <button
                type="button"
                onClick={() => {
                  setShowDoctorDropdown(!showDoctorDropdown);
                  setShowTreatmentDropdown(false);
                }}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
              >
                <span>{selectedDoctor?.name || '請選擇'}</span>
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              </button>
              {showDoctorDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {DOCTOR_OPTIONS.map((doctor) => {
                    const isSelected = formData.doctorId === doctor.id;
                    return (
                      <button
                        key={doctor.id}
                        type="button"
                        onClick={() => {
                          handleInputChange('doctorId', doctor.id);
                          setShowDoctorDropdown(false);
                        }}
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
                onClick={() => {
                  setShowTreatmentDropdown(!showTreatmentDropdown);
                  setShowDoctorDropdown(false);
                }}
                className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
              >
                <span>{selectedTreatment?.label || '請選擇'}</span>
                <ChevronDown className="w-5 h-5 text-neutral-400" />
              </button>
              {showTreatmentDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                  {TREATMENT_OPTIONS.map((option) => {
                    const isSelected = formData.treatmentType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          handleInputChange('treatmentType', option.value);
                          setShowTreatmentDropdown(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-neutral-50"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-primary' : 'border-neutral-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                        <span className={isSelected ? 'text-primary font-medium' : 'text-neutral-700'}>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
        <div className="p-5 border-t border-neutral-100">
          {/* 刪除確認區塊 */}
          {showDeleteConfirm ? (
            <div className="mb-4 p-4 border-2 border-error rounded-xl">
              <div className="flex items-center gap-2 text-error mb-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">確定要永久刪除此資料嗎？</span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 h-10 bg-error hover:bg-error-700 text-white font-medium text-sm rounded-full transition-colors"
                >
                  確認刪除
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-sm rounded-full border border-neutral-300 transition-colors"
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
              className="flex items-center gap-2 text-error hover:text-error-700 text-sm font-medium mb-4 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              刪除此筆資料
            </button>
          )}

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
    </div>
  );
}
