/**
 * LIFF Layout
 * 包含驗證檢查的統一 Layout
 */
import { type ReactNode } from 'react';
import { Viewport } from 'next';
import { LiffAuthProvider } from '@/contexts/LiffAuthContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LiffLayout({ children }: { children: ReactNode }) {
  return (
    <LiffAuthProvider>
      <div className="min-h-screen min-h-[100dvh]">
        {children}
      </div>
    </LiffAuthProvider>
  );
}
