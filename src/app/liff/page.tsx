/**
 * LIFF 入口頁面 - 真人驗證
 * 簡單的 CAPTCHA 驗證，防止機器人
 */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle } from 'lucide-react';
import liff from '@line/liff';

// 產生隨機 4 位數驗證碼
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

export default function LiffEntryPage() {
  const router = useRouter();
  const [displayCode, setDisplayCode] = useState(() => generateCode());
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLineLoading, setIsLineLoading] = useState(false);

  // 初始化 LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        if (!LIFF_ID) {
          setLiffError('LIFF ID 未設定');
          return;
        }

        await liff.init({ liffId: LIFF_ID });
        setIsLiffReady(true);

        // 如果用戶已經登入，自動獲取資料並跳轉
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          localStorage.setItem('lineUserId', profile.userId);
          localStorage.setItem('lineDisplayName', profile.displayName);
          if (profile.pictureUrl) {
            localStorage.setItem('linePictureUrl', profile.pictureUrl);
          }
          sessionStorage.setItem('captchaVerified', 'true');
          router.push('/liff/profile');
        }
      } catch (err) {
        console.error('LIFF 初始化失敗:', err);
        setLiffError(err instanceof Error ? err.message : 'LIFF 初始化失敗');
      }
    };

    initLiff();
  }, [router]);

  // 刷新驗證碼
  const handleShuffle = useCallback(() => {
    setDisplayCode(generateCode());
    setInputCode('');
    setError(null);
  }, []);

  // 處理輸入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setInputCode(value);
    setError(null);
  };

  // 驗證並繼續
  const handleVerify = async () => {
    if (inputCode.length !== 4) {
      setError('請輸入 4 位數驗證碼');
      return;
    }

    if (inputCode !== displayCode) {
      setError('驗證碼錯誤，請重新輸入');
      setInputCode('');
      return;
    }

    setIsLoading(true);

    // 驗證通過，標記已驗證
    sessionStorage.setItem('captchaVerified', 'true');

    // 跳轉到基本資料頁
    router.push('/liff/profile');
  };

  // LINE 快速登入
  const handleLineLogin = async () => {
    if (!isLiffReady) {
      setLiffError('LIFF 尚未準備完成，請稍後再試');
      return;
    }

    setIsLineLoading(true);
    setLiffError(null);

    try {
      if (!liff.isLoggedIn()) {
        // 導向 LINE 登入頁面
        liff.login({ redirectUri: window.location.href });
      } else {
        // 已登入，獲取用戶資料
        const profile = await liff.getProfile();
        localStorage.setItem('lineUserId', profile.userId);
        localStorage.setItem('lineDisplayName', profile.displayName);
        if (profile.pictureUrl) {
          localStorage.setItem('linePictureUrl', profile.pictureUrl);
        }
        sessionStorage.setItem('captchaVerified', 'true');
        router.push('/liff/profile');
      }
    } catch (err) {
      console.error('LINE 登入失敗:', err);
      setLiffError(err instanceof Error ? err.message : 'LINE 登入失敗');
      setIsLineLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-white flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-[80px] pb-8">
        {/* Title Section */}
        <div className="px-4 text-center mb-12">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">
            安全驗證
          </h1>
          <p className="text-base text-neutral-500">
            請輸入下方顯示的4位數驗證碼
          </p>
        </div>

        {/* Content Card */}
        <div className="px-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] p-4 pt-8 pb-8">
            {/* 驗證碼顯示區 */}
            <div className="bg-white rounded-xl border border-neutral-300 px-4 py-4 flex items-center justify-between mb-4">
              <span className="text-2xl font-bold text-neutral-900 tracking-[0.3em] pl-2">
                {displayCode}
              </span>
              <button
                type="button"
                onClick={handleShuffle}
                className="p-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                aria-label="刷新驗證碼"
              >
                <Shuffle className="w-5 h-5" />
              </button>
            </div>

            {/* 輸入區 */}
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="輸入驗證碼"
                  value={inputCode}
                  onChange={handleInputChange}
                  className={`w-full h-12 px-4 bg-white rounded-xl border text-base placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 transition-all ${
                    error
                      ? 'border-error text-error'
                      : 'border-neutral-300 text-neutral-900 focus:border-neutral-400'
                  }`}
                  maxLength={4}
                />
                {error && (
                  <p className="mt-2 text-sm text-error">{error}</p>
                )}
              </div>

              {/* 驗證按鈕 */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={isLoading || inputCode.length !== 4}
                className="w-full h-12 bg-neutral-800 hover:bg-neutral-900 disabled:bg-neutral-300 text-white font-bold text-base rounded-xl transition-colors"
              >
                {isLoading ? '驗證中...' : '驗證並繼續'}
              </button>
            </div>
          </div>

          {/* 分隔線 */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-neutral-200" />
            <span className="text-sm text-neutral-400">使用快速登入</span>
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          {/* LIFF 錯誤顯示 */}
          {liffError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{liffError}</p>
            </div>
          )}

          {/* LINE 快速登入按鈕 */}
          <button
            type="button"
            onClick={handleLineLogin}
            disabled={!isLiffReady || isLineLoading}
            className="w-full h-12 bg-[#06C755] hover:bg-[#05B54C] disabled:bg-[#06C755]/50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            {isLineLoading ? '登入中...' : isLiffReady ? 'LINE 快速登入' : 'LIFF 載入中...'}
          </button>

          {/* 底部提示 */}
          <p className="text-center text-sm text-neutral-400 mt-4">
            登入後，預約3小時前將有自動提醒功能
          </p>
        </div>
      </main>
    </div>
  );
}
