/**
 * 管理後台 Layout
 * 左側邊欄 + 主內容區
 */
'use client';

import { type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Users,
  Settings,
  Plus,
  LogOut,
} from 'lucide-react';
import AddAppointmentModal from '@/components/admin/AddAppointmentModal';
import { AddAppointmentProvider, useAddAppointment } from '@/contexts/AddAppointmentContext';

// 導航項目
const NAV_ITEMS = [
  { href: '/admin/dashboard', label: '數據概覽', icon: LayoutDashboard },
  { href: '/admin/appointments', label: '預約排程', icon: Clock },
  { href: '/admin/schedules', label: '診次排班', icon: CalendarDays },
  { href: '/admin/patients', label: '患者資料', icon: Users },
  { href: '/admin/settings', label: '系統設定', icon: Settings },
];

// SWR fetcher for auth
const authFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.success ? json.data : null;
};

// 內部 Layout 組件（需要使用 Context）
function AdminLayoutInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, openModal, closeModal } = useAddAppointment();

  // 使用 SWR 緩存用戶資料，避免每次都重新請求
  const { data: user } = useSWR<{ name: string } | null>(
    '/api/admin/auth/me',
    authFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60 秒內不重複請求
    }
  );

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleNewAppointment = () => {
    openModal();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* 左側邊欄 */}
      <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">欣</span>
            <span className="text-lg font-semibold text-neutral-900">欣百漢中醫</span>
          </div>
        </div>

        {/* 導航選單 */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-primary bg-primary/5 border-l-4 border-primary'
                    : 'text-neutral-600 hover:bg-neutral-50 border-l-4 border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 底部區域 */}
        <div className="p-4 border-t border-neutral-100">
          {/* 新增預約按鈕 */}
          <button
            type="button"
            onClick={handleNewAppointment}
            className="w-full h-10 bg-primary hover:bg-primary-600 text-white font-medium text-sm rounded-lg flex items-center justify-center gap-2 transition-colors mb-4"
          >
            <Plus className="w-4 h-4" />
            新增預約
          </button>

          {/* 用戶資訊 */}
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="font-medium text-neutral-900 text-sm">
              {user?.name || 'Admin User'}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 text-sm mt-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              登出系統
            </button>
          </div>
        </div>
      </aside>

      {/* 主內容區 */}
      <main className="flex-1 ml-60">
        {children}
      </main>

      {/* 新增預約 Modal */}
      <AddAppointmentModal
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={(data) => {
          console.log('新增預約:', data);
          // TODO: 實際新增預約邏輯
        }}
      />
    </div>
  );
}

// 主 Layout 組件（包含 Provider 和登入頁面判斷）
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // 登入頁面不顯示 sidebar，也不需要 Provider
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <AddAppointmentProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AddAppointmentProvider>
  );
}
