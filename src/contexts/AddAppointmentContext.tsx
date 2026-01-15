/**
 * AddAppointment Modal Context
 * 用於全局管理新增預約 Modal 的開關狀態
 */
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface AddAppointmentContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const AddAppointmentContext = createContext<AddAppointmentContextType | null>(null);

export function AddAppointmentProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <AddAppointmentContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </AddAppointmentContext.Provider>
  );
}

export function useAddAppointment() {
  const context = useContext(AddAppointmentContext);
  if (!context) {
    throw new Error('useAddAppointment must be used within AddAppointmentProvider');
  }
  return context;
}
