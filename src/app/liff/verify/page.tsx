/**
 * 驗證碼頁面
 * 對應規格：spec/features/真人驗證.feature
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AlertCircle, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function VerifyPage() {
  const router = useRouter();
  const [lineUserId, setLineUserId] = useState<string>('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(300); // 5 分鐘
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // 取得 LINE User ID
    const userId = localStorage.getItem('lineUserId') || localStorage.getItem('mockLineUserId');
    if (!userId) {
      router.push('/liff');
      return;
    }
    setLineUserId(userId);

    // 自動發送驗證碼
    sendVerificationCode(userId);
  }, [router]);

  // 倒數計時
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 過期倒數
  useEffect(() => {
    if (expiresIn > 0) {
      const timer = setTimeout(() => setExpiresIn(expiresIn - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiresIn]);

  const sendVerificationCode = async (userId: string) => {
    setSending(true);
    setError(null);

    try {
      const response = await apiFetch('/api/liff/verify/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || '發送驗證碼失敗');
        return;
      }

      // 設定重新發送倒數 60 秒
      setCountdown(60);
      // 重設過期時間 5 分鐘
      setExpiresIn(300);
      // 重設嘗試次數
      setRemainingAttempts(5);

    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setSending(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    // 只允許數字
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // 自動跳到下一格
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // 自動驗證當填滿 6 碼時
    if (value && index === 5 && newCode.every(c => c)) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // 退格鍵回到上一格
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeStr: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/liff/verify/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId, code: codeStr }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error?.message || '驗證失敗');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        
        // 更新剩餘嘗試次數
        if (result.error?.message?.includes('剩餘')) {
          const match = result.error.message.match(/剩餘 (\d) 次/);
          if (match) {
            setRemainingAttempts(parseInt(match[1]));
          }
        }
        return;
      }

      // 驗證成功
      localStorage.setItem('verified', 'true');
      
      // 判斷是新病患還是回診
      if (result.data.isNewPatient) {
        router.push('/liff/profile');
      } else {
        // 儲存病患資料
        localStorage.setItem('patientData', JSON.stringify(result.data.patient));
        router.push('/liff/booking/date');
      }

    } catch {
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="liff-container flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4">
        <button
          className="flex items-center text-white/80 hover:text-white"
          onClick={() => router.push('/liff')}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          返回
        </button>
      </div>

      {/* Main Card */}
      <div className="liff-card flex flex-col p-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">驗證身份</h1>
          <p className="text-gray-500 mb-8">
            驗證碼已發送至您的 LINE，請在下方輸入
          </p>

          {/* 驗證碼有效期倒數 */}
          <div className="flex items-center justify-center gap-2 mb-6 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">
              驗證碼有效時間：
              <span className={expiresIn < 60 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                {formatTime(expiresIn)}
              </span>
            </span>
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-600">{error}</p>
                {remainingAttempts > 0 && remainingAttempts < 5 && (
                  <p className="text-xs text-red-500 mt-1">
                    剩餘 {remainingAttempts} 次嘗試機會
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 驗證碼輸入框 */}
          <div className="flex justify-center gap-3 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                disabled={loading}
              />
            ))}
          </div>

          {/* 重新發送按鈕 */}
          <div className="text-center">
            <button
              onClick={() => sendVerificationCode(lineUserId)}
              disabled={countdown > 0 || sending}
              className="inline-flex items-center text-sm text-primary-500 font-medium disabled:text-gray-400"
            >
              {sending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {countdown > 0 ? `重新發送 (${countdown}s)` : '重新發送驗證碼'}
            </button>
          </div>
        </div>

        {/* 驗證按鈕 */}
        <Button
          className="w-full mt-8"
          size="lg"
          onClick={() => verifyCode(code.join(''))}
          loading={loading}
          disabled={code.some(c => !c)}
        >
          驗證
        </Button>
      </div>
    </div>
  );
}

