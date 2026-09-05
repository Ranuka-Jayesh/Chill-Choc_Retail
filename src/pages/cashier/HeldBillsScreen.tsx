import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeldBillsModal } from '@/components/modals/HeldBillsModal';
import { CashierHeader } from '@/components/pos/CashierHeader';

export const HeldBillsScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col select-none font-sans">
      <CashierHeader onOpenHeldBills={() => {}} />
      <HeldBillsModal
        isOpen={true}
        onClose={() => navigate('/cashier/pos')}
      />
    </div>
  );
};
