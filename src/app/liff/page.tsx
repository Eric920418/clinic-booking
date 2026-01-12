/**
 * LIFF 入口頁面 - 真人驗證
 * 簡單的 CAPTCHA 驗證，防止機器人
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

// 產生隨機 4 位數驗證碼
function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function LiffEntryPage() {
  const router = useRouter();
  const [displayCode, setDisplayCode] = useState(() => generateCode());
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
            <div className="bg-neutral-100 rounded-xl px-4 py-4 flex items-center justify-between mb-6">
              <span className="text-2xl font-bold text-neutral-900 tracking-[0.5em] pl-2">
                {displayCode}
              </span>
              <button
                type="button"
                onClick={handleShuffle}
                className="p-2 text-neutral-600 hover:text-neutral-800 transition-colors"
                aria-label="刷新驗證碼"
              >
                <RefreshCw className="w-6 h-6" />
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
                  className={`w-full h-12 px-4 bg-neutral-100 rounded-xl border text-base placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-[#008ADA]/20 transition-all ${
                    error
                      ? 'border-error text-error'
                      : 'border-neutral-400 text-neutral-900 focus:border-[#008ADA]'
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
                className="w-full h-12 bg-[#008ADA] hover:bg-[#0076A5] disabled:bg-neutral-300 text-white font-bold text-base rounded-xl shadow-[0px_6px_29px_0px_rgba(0,0,0,0.1),0px_4px_8px_0px_rgba(0,0,0,0.05),0px_2px_8px_0px_rgba(0,0,0,0.05)] transition-all disabled:shadow-none"
              >
                {isLoading ? '驗證中...' : '驗證並繼續'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
