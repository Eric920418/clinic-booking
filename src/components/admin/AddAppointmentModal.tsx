/**
 * 新增預約 Modal
 * 用於管理後台手動新增預約
 */
'use client';

import { useState, useEffect } from 'react';
import { X, Search, ChevronDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AddAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AppointmentData) => void;
}

interface AppointmentData {
  patientId: string;
  patientName: string;
  doctorId: string;
  date: string;
  treatmentType: string;
  time: string;
}

interface Patient {
  id: string;
  name: string;
  birthDate: string;
  idNumber: string;
  phone: string;
}

interface Doctor {
  id: string;
  name: string;
}

interface TreatmentType {
  value: string;
  label: string;
}

interface TimeSlot {
  id: string;
  time: string;
  remainingMinutes: number;
}

type IdentityTab = 'search' | 'create';

export default function AddAppointmentModal({
  isOpen,
  onClose,
  onConfirm,
}: AddAppointmentModalProps) {
  // 步驟一：確認身份
  const [identityTab, setIdentityTab] = useState<IdentityTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  // 步驟二：預約時段
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [selectedTreatment, setSelectedTreatment] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // 下拉選單狀態
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);

  // 資料狀態
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  // 載入醫師和診療項目資料
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [doctorsRes, treatmentsRes] = await Promise.all([
          fetch('/api/liff/doctors'),
          fetch('/api/liff/treatment-types'),
        ]);

        if (doctorsRes.ok) {
          const doctorsData = await doctorsRes.json();
          if (doctorsData.success && doctorsData.data) {
            setDoctors(doctorsData.data.map((d: { id: string; name: string }) => ({
              id: d.id,
              name: d.name,
            })));
          }
        }

        if (treatmentsRes.ok) {
          const treatmentsData = await treatmentsRes.json();
          if (treatmentsData.success && treatmentsData.data) {
            setTreatmentTypes(treatmentsData.data.map((t: { id: string; name: string }) => ({
              value: t.id,
              label: t.name,
            })));
          }
        }
      } catch (err) {
        console.error('載入資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // 載入時段資料（當選擇醫師和日期後）
  useEffect(() => {
    if (!selectedDoctor || !appointmentDate) {
      setTimeSlots([]);
      return;
    }

    const fetchTimeSlots = async () => {
      try {
        // 將民國年轉換為西元年
        const dateMatch = appointmentDate.match(/(\d{2,3})\/(\d{2})\/(\d{2,3})/);
        let dateStr = appointmentDate;
        if (dateMatch) {
          const year = parseInt(dateMatch[1]) + 1911;
          const month = dateMatch[2];
          const day = dateMatch[3];
          dateStr = `${year}-${month}-${day}`;
        }

        const response = await fetch(
          `/api/liff/time-slots?doctorId=${selectedDoctor}&date=${dateStr}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setTimeSlots(result.data.map((slot: { id: string; startTime: string; remainingMinutes: number }) => ({
              id: slot.id,
              time: slot.startTime,
              remainingMinutes: slot.remainingMinutes,
            })));
          }
        }
      } catch (err) {
        console.error('載入時段失敗:', err);
      }
    };

    fetchTimeSlots();
  }, [selectedDoctor, appointmentDate]);

  // 搜尋病患 - 從預約資料取得病患清單
  useEffect(() => {
    if (!isOpen) return;

    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/admin/appointments');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // 從預約資料中提取不重複的病患
            const patientMap = new Map<string, Patient>();
            result.data.forEach((appt: { patient: { id: string; name: string; birthDate?: string; nationalId?: string; phone?: string } }) => {
              if (appt.patient && !patientMap.has(appt.patient.id)) {
                patientMap.set(appt.patient.id, {
                  id: appt.patient.id,
                  name: appt.patient.name,
                  birthDate: appt.patient.birthDate ? format(new Date(appt.patient.birthDate), 'yyyy/MM/dd') : '',
                  idNumber: appt.patient.nationalId || '',
                  phone: appt.patient.phone || '',
                });
              }
            });
            setPatients(Array.from(patientMap.values()));
          }
        }
      } catch (err) {
        console.error('載入病患資料失敗:', err);
      }
    };

    fetchPatients();
  }, [isOpen]);

  if (!isOpen) return null;

  // 篩選病患
  const filteredPatients = searchQuery
    ? patients.filter(
        (p) =>
          p.name.includes(searchQuery) ||
          p.idNumber.includes(searchQuery) ||
          p.phone.includes(searchQuery)
      )
    : patients;

  // 確認預約
  const handleConfirm = () => {
    if (!selectedPatient || !selectedDoctor || !appointmentDate || !selectedTreatment || !selectedTime) {
      return;
    }
    onConfirm({
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      doctorId: selectedDoctor,
      date: appointmentDate,
      treatmentType: selectedTreatment,
      time: selectedTime,
    });
    onClose();
  };

  // 取得醫師名稱
  const getDoctorName = (id: string) => {
    return doctors.find((d) => d.id === id)?.name || '';
  };

  // 檢查是否可以確認預約
  const canConfirm = selectedPatient && selectedDoctor && appointmentDate && selectedTreatment && selectedTime;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-[900px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-neutral-200">
          <h2 className="text-lg font-bold text-neutral-900">新增預約</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-neutral-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* 步驟一：確認身份 */}
            <div>
              <h3 className="text-base font-bold text-neutral-900 mb-4">步驟一：確認身份</h3>

              {/* Tab 切換 */}
              <div className="flex mb-4">
                <button
                  type="button"
                  onClick={() => setIdentityTab('search')}
                  className={`flex-1 py-2 text-sm font-medium border rounded-l-lg transition-colors ${
                    identityTab === 'search'
                      ? 'text-primary border-neutral-300 bg-white'
                      : 'text-neutral-600 border-neutral-300 bg-neutral-100'
                  }`}
                >
                  搜尋
                </button>
                <button
                  type="button"
                  onClick={() => setIdentityTab('create')}
                  className={`flex-1 py-2 text-sm font-medium border-t border-b border-r rounded-r-lg transition-colors ${
                    identityTab === 'create'
                      ? 'text-primary border-neutral-300 bg-white'
                      : 'text-neutral-600 border-neutral-300 bg-neutral-100'
                  }`}
                >
                  建立
                </button>
              </div>

              {identityTab === 'search' && (
                <>
                  {/* 搜尋框 */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="輸入驗證碼"
                      className="w-full h-11 pl-10 pr-4 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* 病患列表 */}
                  <div className="space-y-3 max-h-[320px] overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => setSelectedPatient(patient)}
                        className={`w-full p-4 border rounded-lg text-left transition-colors ${
                          selectedPatient?.id === patient.id
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-medium text-neutral-900">{patient.name}</span>
                          <div className="text-right text-sm text-neutral-500 space-y-0.5">
                            <div>{patient.birthDate}</div>
                            <div>{patient.idNumber}</div>
                            <div>{patient.phone}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {identityTab === 'create' && (
                <div className="text-center py-12 text-neutral-500">
                  建立新病患功能開發中...
                </div>
              )}
            </div>

            {/* 步驟二：預約時段 */}
            <div>
              <h3 className="text-base font-bold text-neutral-900 mb-4">步驟二：預約時段</h3>

              <div className="space-y-4">
                {/* 指定醫師 & 預約日期 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 指定醫師 */}
                  <div className="relative">
                    <label className="text-sm text-neutral-500 mb-1 block">指定醫師</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDoctorDropdown(!showDoctorDropdown);
                        setShowTimeDropdown(false);
                      }}
                      className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                    >
                      <span className={selectedDoctor ? 'text-neutral-900' : 'text-neutral-400'}>
                        {selectedDoctor ? getDoctorName(selectedDoctor) : '選擇醫師'}
                      </span>
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    </button>
                    {showDoctorDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                        {doctors.map((doctor) => (
                          <button
                            key={doctor.id}
                            type="button"
                            onClick={() => {
                              setSelectedDoctor(doctor.id);
                              setShowDoctorDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-sm text-left hover:bg-neutral-50"
                          >
                            {doctor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 預約日期 */}
                  <div>
                    <label className="text-sm text-neutral-500 mb-1 block">預約日期</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        placeholder="07/01/115"
                        className="w-full h-11 px-3 pr-10 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm focus:outline-none focus:border-primary"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    </div>
                  </div>
                </div>

                {/* 看診項目 */}
                <div>
                  <label className="text-sm text-neutral-500 mb-2 block">看診項目</label>
                  <div className="flex gap-3 flex-wrap">
                    {treatmentTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setSelectedTreatment(type.value)}
                        className={`flex-1 h-10 px-4 border rounded-lg text-sm font-medium transition-colors ${
                          selectedTreatment === type.value
                            ? 'border-primary bg-primary text-white'
                            : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 看診時間 */}
                <div className="relative">
                  <label className="text-sm text-neutral-500 mb-1 block">看診時間</label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTimeDropdown(!showTimeDropdown);
                      setShowDoctorDropdown(false);
                    }}
                    className="w-full h-11 px-3 bg-[#F5F5F5] border border-[#888888] rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:border-primary"
                  >
                    <span className={selectedTime ? 'text-neutral-900' : 'text-neutral-400'}>
                      {selectedTime || '選擇時間'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-neutral-400" />
                  </button>
                  {showTimeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                      {timeSlots.length > 0 ? (
                        timeSlots.map((slot) => (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setShowTimeDropdown(false);
                            }}
                            disabled={slot.remainingMinutes <= 0}
                            className={`w-full px-3 py-2 text-sm text-left hover:bg-neutral-50 ${
                              slot.remainingMinutes <= 0 ? 'text-neutral-300 cursor-not-allowed' : ''
                            }`}
                          >
                            {slot.time} {slot.remainingMinutes <= 0 && '(額滿)'}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-neutral-400">
                          {selectedDoctor && appointmentDate ? '無可用時段' : '請先選擇醫師和日期'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={onClose}
            className="h-[43px] px-6 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-sm rounded-xl transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`h-[43px] px-6 font-medium text-sm rounded-xl transition-colors ${
              canConfirm
                ? 'bg-primary hover:bg-primary-600 text-white'
                : 'bg-primary/50 text-white cursor-not-allowed'
            }`}
          >
            確認預約
          </button>
        </div>
      </div>
    </div>
  );
}
