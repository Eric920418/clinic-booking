/**
 * LIFF Layout
 */
import { type ReactNode } from 'react';
import { Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LiffLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh]">
      {children}
    </div>
  );
}

