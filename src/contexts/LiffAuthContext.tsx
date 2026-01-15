/**
 * LIFF Auth Context
 * 管理 LIFF 驗證狀態和用戶資料緩存
 */
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import liff from '@line/liff';

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || '';

// 用戶資料介面
export interface UserProfile {
  name: string;
  phone: string;
  idNumber: string;
  birthDate: string;
}

// LINE 用戶資料介面
export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

// Context 狀態介面
interface LiffAuthState {
  // 狀態
  isLiffReady: boolean;
  isLoggedIn: boolean;
  isCaptchaVerified: boolean;
  isLoading: boolean;
  error: string | null;

  // 用戶資料
  lineProfile: LineProfile | null;
  userProfile: UserProfile | null;

  // 方法
  login: () => Promise<void>;
  logout: () => void;
  setCaptchaVerified: (verified: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
  clearError: () => void;
}

const LiffAuthContext = createContext<LiffAuthState | null>(null);

// localStorage keys
const STORAGE_KEYS = {
  LINE_USER_ID: 'lineUserId',
  LINE_DISPLAY_NAME: 'lineDisplayName',
  LINE_PICTURE_URL: 'linePictureUrl',
  USER_PROFILE: 'liffUserProfile',
  CAPTCHA_VERIFIED: 'captchaVerified',
} as const;

// 不需要驗證的頁面
const PUBLIC_PATHS = ['/liff'];

export function LiffAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isLiffReady, setIsLiffReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);

  // 從 localStorage 載入緩存的資料
  const loadCachedData = useCallback(() => {
    try {
      // 載入 LINE profile
      const userId = localStorage.getItem(STORAGE_KEYS.LINE_USER_ID);
      const displayName = localStorage.getItem(STORAGE_KEYS.LINE_DISPLAY_NAME);
      const pictureUrl = localStorage.getItem(STORAGE_KEYS.LINE_PICTURE_URL);

      if (userId && displayName) {
        setLineProfile({
          userId,
          displayName,
          pictureUrl: pictureUrl || undefined,
        });
      }

      // 載入用戶資料
      const cachedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (cachedProfile) {
        setUserProfileState(JSON.parse(cachedProfile));
      }

      // 載入 CAPTCHA 驗證狀態（使用 sessionStorage，每次開新頁面需重新驗證）
      const captchaVerified = sessionStorage.getItem(STORAGE_KEYS.CAPTCHA_VERIFIED);
      setIsCaptchaVerified(captchaVerified === 'true');
    } catch (err) {
      console.error('載入緩存資料失敗:', err);
    }
  }, []);

  // 初始化 LIFF
  useEffect(() => {
    const initLiff = async () => {
      try {
        if (!LIFF_ID) {
          setError('LIFF ID 未設定');
          setIsLoading(false);
          return;
        }

        await liff.init({ liffId: LIFF_ID });
        setIsLiffReady(true);

        // 檢查是否已登入
        if (liff.isLoggedIn()) {
          setIsLoggedIn(true);

          // 獲取 LINE profile
          const profile = await liff.getProfile();
          const lineData: LineProfile = {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          };
          setLineProfile(lineData);

          // 保存到 localStorage
          localStorage.setItem(STORAGE_KEYS.LINE_USER_ID, profile.userId);
          localStorage.setItem(STORAGE_KEYS.LINE_DISPLAY_NAME, profile.displayName);
          if (profile.pictureUrl) {
            localStorage.setItem(STORAGE_KEYS.LINE_PICTURE_URL, profile.pictureUrl);
          }

          // LINE 登入視為已通過驗證
          sessionStorage.setItem(STORAGE_KEYS.CAPTCHA_VERIFIED, 'true');
          setIsCaptchaVerified(true);
        }

        // 載入緩存資料
        loadCachedData();
      } catch (err) {
        console.error('LIFF 初始化失敗:', err);
        setError(err instanceof Error ? err.message : 'LIFF 初始化失敗');
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, [loadCachedData]);

  // 驗證檢查：非公開頁面需要驗證
  useEffect(() => {
    if (isLoading) return;

    const isPublicPath = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname === path + '/'
    );

    // 如果不是公開頁面，且未驗證（未登入 LINE 且未通過 CAPTCHA）
    if (!isPublicPath && !isLoggedIn && !isCaptchaVerified) {
      router.replace('/liff');
    }
  }, [isLoading, isLoggedIn, isCaptchaVerified, pathname, router]);

  // LINE 登入
  const login = useCallback(async () => {
    if (!isLiffReady) {
      setError('LIFF 尚未準備完成');
      return;
    }

    try {
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href });
      }
    } catch (err) {
      console.error('LINE 登入失敗:', err);
      setError(err instanceof Error ? err.message : 'LINE 登入失敗');
    }
  }, [isLiffReady]);

  // 登出
  const logout = useCallback(() => {
    // 清除 localStorage
    localStorage.removeItem(STORAGE_KEYS.LINE_USER_ID);
    localStorage.removeItem(STORAGE_KEYS.LINE_DISPLAY_NAME);
    localStorage.removeItem(STORAGE_KEYS.LINE_PICTURE_URL);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);

    // 清除 sessionStorage
    sessionStorage.removeItem(STORAGE_KEYS.CAPTCHA_VERIFIED);

    // 重置狀態
    setLineProfile(null);
    setUserProfileState(null);
    setIsLoggedIn(false);
    setIsCaptchaVerified(false);

    // LIFF 登出
    if (liff.isLoggedIn()) {
      liff.logout();
    }

    router.replace('/liff');
  }, [router]);

  // 設定 CAPTCHA 驗證狀態
  const setCaptchaVerified = useCallback((verified: boolean) => {
    setIsCaptchaVerified(verified);
    if (verified) {
      sessionStorage.setItem(STORAGE_KEYS.CAPTCHA_VERIFIED, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.CAPTCHA_VERIFIED);
    }
  }, []);

  // 設定用戶資料（會自動緩存到 localStorage）
  const setUserProfile = useCallback((profile: UserProfile) => {
    setUserProfileState(profile);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
  }, []);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: LiffAuthState = {
    isLiffReady,
    isLoggedIn,
    isCaptchaVerified,
    isLoading,
    error,
    lineProfile,
    userProfile,
    login,
    logout,
    setCaptchaVerified,
    setUserProfile,
    clearError,
  };

  return (
    <LiffAuthContext.Provider value={value}>
      {children}
    </LiffAuthContext.Provider>
  );
}

// Hook
export function useLiffAuth() {
  const context = useContext(LiffAuthContext);
  if (!context) {
    throw new Error('useLiffAuth must be used within LiffAuthProvider');
  }
  return context;
}
