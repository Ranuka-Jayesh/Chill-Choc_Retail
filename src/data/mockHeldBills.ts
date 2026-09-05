import { HeldBill } from '@/types';
import { MOCK_PRODUCTS } from './mockProducts';
import { MOCK_SALESPERSONS } from './mockEmployees';

export const INITIAL_HELD_BILLS: HeldBill[] = [
  {
    id: 'hold-0018',
    holdCode: 'HOLD-0018',
    timestamp: '10:42 AM',
    itemsCount: 3,
    total: 2000,
    cashier: 'Nimal Perera',
    customer: {
      id: 'walkin-1',
      name: 'Walk-in Customer',
      phone: '',
      isWalkIn: true,
    },
    note: 'Customer stepped out to fetch wallet from vehicle',
    items: [
      {
        id: 'hold-item-1',
        product: MOCK_PRODUCTS[0], // KitKat Chunky 40g (Rs. 450)
        quantity: 2,
        unitPrice: 450,
        salesperson: MOCK_SALESPERSONS[0], // Amal
      },
      {
        id: 'hold-item-2',
        product: MOCK_PRODUCTS[4], // M&M's 45g (Rs. 550)
        quantity: 2,
        unitPrice: 550,
        salesperson: MOCK_SALESPERSONS[1], // Nadeesha
      },
    ],
  },
  {
    id: 'hold-0017',
    holdCode: 'HOLD-0017',
    timestamp: '09:55 AM',
    itemsCount: 2,
    total: 980,
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-kamal',
      name: 'Kamal Gunaratne',
      phone: '077 987 6543',
    },
    note: 'Verifying corporate discount eligibility',
    items: [
      {
        id: 'hold-item-3',
        product: MOCK_PRODUCTS[2], // Mars 51g (Rs. 480)
        quantity: 1,
        unitPrice: 480,
        salesperson: null,
      },
      {
        id: 'hold-item-4',
        product: MOCK_PRODUCTS[1], // Snickers 50g (Rs. 500)
        quantity: 1,
        unitPrice: 500,
        salesperson: MOCK_SALESPERSONS[2],
      },
    ],
  }
];
