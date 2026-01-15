/**
 * 管理後台登入頁面
 * 對應規格：第 4.1.1 節 登入
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertCircle } from 'lucide-react';

// 登入表單 Schema
const loginSchema = z.object({
  email: z.string().email('請輸入有效的 Email'),
  password: z.string().min(1, '請輸入密碼'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // 顯示完整錯誤訊息
        setError(result.error?.message || '登入失敗');
        return;
      }

      // 登入成功，導向 Dashboard
      router.push('/admin/dashboard');
    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 to-primary-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 區域 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <span className="text-3xl">🏥</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">中醫診所預約系統</h1>
          <p className="text-white/70">管理後台</p>
        </div>

        {/* 登入表單 */}
        <Card>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 錯誤訊息 */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">登入失敗</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Email 輸入 */}
              <Input
                {...register('email')}
                type="email"
                label="電子郵件"
                placeholder="admin@clinic.com"
                error={errors.email?.message}
                autoComplete="email"
              />

              {/* 密碼輸入 */}
              <Input
                {...register('password')}
                type="password"
                label="密碼"
                placeholder="請輸入密碼"
                error={errors.password?.message}
                autoComplete="current-password"
              />

              {/* 登入按鈕 */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isLoading}
              >
                登入
              </Button>
            </form>

            {/* 測試帳號提示 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">測試帳號：</p>
              <p className="text-xs text-gray-600">
                super@clinic.com / Admin123 (超級管理員)
              </p>
              <p className="text-xs text-gray-600">
                admin@clinic.com / Admin123 (一般管理員)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

