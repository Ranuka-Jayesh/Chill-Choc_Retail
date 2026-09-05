import { Salesperson } from '@/types';

export const CURRENT_CASHIER = {
  id: 'emp-cashier-01',
  name: 'Nimal Perera',
  code: 'EMP-0042',
  avatarInitials: 'NP',
  outlet: 'Outlet 02 • Colombo Branch',
  register: 'POS-01',
  shiftStatus: 'OPEN' as const,
  shiftSince: '09:12 AM',
};

export const MOCK_SALESPERSONS: Salesperson[] = [
  {
    id: 'sp-1',
    name: 'Amal Perera',
    code: 'TM-001',
    avatarInitials: 'AM',
  },
  {
    id: 'sp-2',
    name: 'Nadeesha Silva',
    code: 'TM-002',
    avatarInitials: 'NS',
  },
  {
    id: 'sp-3',
    name: 'Kasun Fernando',
    code: 'TM-003',
    avatarInitials: 'KF',
  },
  {
    id: 'sp-4',
    name: 'Tharushi Fernando',
    code: 'TM-004',
    avatarInitials: 'TF',
  },
  {
    id: 'sp-5',
    name: 'Dilan Perera',
    code: 'TM-005',
    avatarInitials: 'DP',
  },
];
