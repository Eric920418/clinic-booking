/**
 * 管理後台 Dashboard
 * 對應規格：第 4.2 節 Dashboard
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CalendarCheck,
  Users,
  Clock,
  AlertTriangle,
  LogOut,
  Calendar,
  UserCheck,
  CheckCircle,
  XCircle,
  UserX,
} from 'lucide-react';
import { type DashboardSummary, type WeeklyStats, type AdminUser } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 取得當前用戶
        const userRes = await fetch('/api/admin/auth/me');
        if (!userRes.ok) {
          router.push('/admin/login');
          return;
        }
        const userData = await userRes.json();
        setUser(userData.data);

        // 取得 Dashboard 資料
        const [summaryRes, weeklyRes] = await Promise.all([
          fetch('/api/admin/dashboard/summary'),
          fetch('/api/admin/dashboard/weekly'),
        ]);

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setSummary(summaryData.data);
        }

        if (weeklyRes.ok) {
          const weeklyData = await weeklyRes.json();
          setWeeklyStats(weeklyData.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5a4e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏥</span>
              <h1 className="text-xl font-semibold text-gray-900">中醫診所預約系統</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <span className="text-xs px-2 py-1 bg-[#2d5a4e]/10 text-[#2d5a4e] rounded-full">
                {user?.role === 'super_admin' ? '超級管理員' : '管理員'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 h-12">
            <a href="/admin/dashboard" className="flex items-center text-sm font-medium text-[#2d5a4e] border-b-2 border-[#2d5a4e]">
              Dashboard
            </a>
            <a href="/admin/appointments" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
              預約管理
            </a>
            <a href="/admin/schedules" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
              班表管理
            </a>
            <a href="/admin/patients" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
              病患管理
            </a>
            {user?.role === 'super_admin' && (
              <a href="/admin/settings" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
                系統設定
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

        {/* 今日預約統計 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">今日總預約</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.todayTotal || 0}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <CalendarCheck className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">值班醫師</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.doctorsOnDuty || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">可預約時段</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.availableSlots || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">今日取消</p>
                  <p className="text-3xl font-bold text-gray-900">{summary?.todayCancelled || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 預約狀態細項 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>今日預約狀態</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">已預約</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">{summary?.todayBooked || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-900">已報到</span>
                  </div>
                  <span className="text-xl font-bold text-yellow-600">{summary?.todayCheckedIn || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">已完成</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{summary?.todayCompleted || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserX className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">未報到</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{summary?.todayNoShow || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-900">已取消</span>
                  </div>
                  <span className="text-xl font-bold text-gray-600">{summary?.todayCancelled || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 週流量統計 */}
          <Card>
            <CardHeader>
              <CardTitle>過去 7 天預約趨勢</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {weeklyStats.map((stat, index) => {
                  const maxCount = Math.max(...weeklyStats.map((s) => s.count), 1);
                  const height = (stat.count / maxCount) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs font-medium text-gray-600">{stat.count}</span>
                      <div
                        className="w-full bg-[#2d5a4e] rounded-t-md transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <span className="text-xs text-gray-500">
                        {new Date(stat.date).toLocaleDateString('zh-TW', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 快速操作 */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => router.push('/admin/appointments')}>
                <CalendarCheck className="w-4 h-4 mr-2" />
                查看今日預約
              </Button>
              <Button variant="secondary" onClick={() => router.push('/admin/schedules')}>
                <Clock className="w-4 h-4 mr-2" />
                管理班表
              </Button>
              <Button variant="secondary" onClick={() => router.push('/admin/patients')}>
                <Users className="w-4 h-4 mr-2" />
                病患管理
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

