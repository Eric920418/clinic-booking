/**
 * Supabase Realtime 預約訂閱 Hook
 * 當 appointments 表有變更時，自動觸發回調
 */
'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
};

interface UseRealtimeAppointmentsOptions {
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  onChange?: (payload: RealtimePayload) => void;
}

/**
 * 訂閱預約表的實時變更
 * @param options - 回調函數選項
 */
export function useRealtimeAppointments(options: UseRealtimeAppointmentsOptions = {}) {
  const { onInsert, onUpdate, onDelete, onChange } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // 訂閱 appointments 表的所有變更
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload) => {
          const realtimePayload: RealtimePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          };

          // 觸發通用回調
          onChange?.(realtimePayload);

          // 觸發特定事件回調
          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(realtimePayload);
              break;
            case 'UPDATE':
              onUpdate?.(realtimePayload);
              break;
            case 'DELETE':
              onDelete?.(realtimePayload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] 已訂閱預約變更');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] 訂閱失敗');
        }
      });

    channelRef.current = channel;

    // 清理訂閱
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onChange, onInsert, onUpdate, onDelete]);

  return channelRef.current;
}

/**
 * 訂閱時段表的實時變更（用於前台顯示可預約時段）
 */
export function useRealtimeTimeSlots(options: UseRealtimeAppointmentsOptions = {}) {
  const { onInsert, onUpdate, onDelete, onChange } = options;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('timeslots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_slots',
        },
        (payload) => {
          const realtimePayload: RealtimePayload = {
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          };

          onChange?.(realtimePayload);

          switch (payload.eventType) {
            case 'INSERT':
              onInsert?.(realtimePayload);
              break;
            case 'UPDATE':
              onUpdate?.(realtimePayload);
              break;
            case 'DELETE':
              onDelete?.(realtimePayload);
              break;
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] 已訂閱時段變更');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onChange, onInsert, onUpdate, onDelete]);

  return channelRef.current;
}
