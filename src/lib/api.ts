/**
 * API 工具和 SWR hooks
 * 統一管理資料獲取和快取
 */
import useSWR, { SWRConfiguration } from 'swr';

// 通用 fetcher
export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('API 請求失敗');
    throw error;
  }
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'API 錯誤');
  }
  return json.data;
};

// SWR 預設配置
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5秒內重複請求會被合併
  errorRetryCount: 2,
};

// ==================== 類型定義 ====================

export interface Doctor {
  id: string;
  name: string;
  isActive?: boolean;
}

export interface TreatmentType {
  id: string;
  name: string;
  durationMinutes: number;
  isActive?: boolean;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  remainingMinutes: number;
  totalMinutes: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  patientPhone?: string;
  doctor: string;
  doctorId: string;
  treatmentType: string;
  treatmentTypeId: string;
  appointmentDate: string;
  startTime: string;
  status: string;
  notes?: string;
}

export interface DashboardSummary {
  todayBooked: number;
  todayCompleted: number;
  todayCancelled: number;
  todayNoShow: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  doctors: Doctor[];
  appointments: Appointment[];
}

// ==================== Hooks ====================

/**
 * 取得醫師列表
 */
export function useDoctors(config?: SWRConfiguration) {
  return useSWR<Doctor[]>(
    '/api/liff/doctors',
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * 取得診療項目列表
 */
export function useTreatmentTypes(config?: SWRConfiguration) {
  return useSWR<TreatmentType[]>(
    '/api/liff/treatment-types',
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * 取得 Dashboard 資料（合併 API）
 */
export function useDashboard(doctorId?: string, config?: SWRConfiguration) {
  const params = new URLSearchParams();
  if (doctorId) params.append('doctorId', doctorId);

  return useSWR<DashboardData>(
    `/api/admin/dashboard?${params}`,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * 取得預約列表
 */
export function useAppointments(
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    doctorId?: string;
    status?: string;
  },
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.doctorId) params.append('doctorId', filters.doctorId);
  if (filters?.status) params.append('status', filters.status);

  return useSWR<{ items: Appointment[]; total: number }>(
    `/api/admin/appointments?${params}`,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * 取得時段列表
 */
export function useTimeSlots(
  filters?: {
    doctorId?: string;
    date?: string;
    treatmentTypeId?: string;
  },
  config?: SWRConfiguration
) {
  const params = new URLSearchParams();
  if (filters?.doctorId) params.append('doctorId', filters.doctorId);
  if (filters?.date) params.append('date', filters.date);
  if (filters?.treatmentTypeId) params.append('treatmentTypeId', filters.treatmentTypeId);

  const key = filters?.doctorId && filters?.date
    ? `/api/liff/time-slots?${params}`
    : null; // 沒有必要參數時不請求

  return useSWR<TimeSlot[]>(
    key,
    fetcher,
    { ...defaultConfig, ...config }
  );
}

/**
 * 取得系統設定資料（醫師、診療項目、帳號）
 */
export function useSettings(config?: SWRConfiguration) {
  return useSWR<{
    doctors: Doctor[];
    treatmentTypes: TreatmentType[];
    accounts: Array<{ id: string; email: string; name: string; role: string; isActive: boolean }>;
  }>(
    '/api/admin/settings',
    fetcher,
    { ...defaultConfig, ...config }
  );
}
