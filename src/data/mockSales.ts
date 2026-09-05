import { CompletedSale } from '@/types';
import { MOCK_PRODUCTS } from './mockProducts';
import { MOCK_SALESPERSONS } from './mockEmployees';

export const INITIAL_SALES: CompletedSale[] = [
  {
    id: 'sale-001829',
    invoiceNumber: 'INV-001829',
    timestamp: '10:32 AM',
    date: 'Today',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-walkin',
      name: 'Walk-in Customer',
      phone: '077 123 4567',
      isWalkIn: true,
    },
    items: [
      {
        id: 'item-1',
        product: MOCK_PRODUCTS[0], // KitKat Chunky 40g (Rs. 450)
        quantity: 2,
        unitPrice: 450,
        salesperson: MOCK_SALESPERSONS[0], // Amal Perera
      },
      {
        id: 'item-2',
        product: MOCK_PRODUCTS[1], // Snickers 50g (Rs. 500)
        quantity: 1,
        unitPrice: 500,
        salesperson: MOCK_SALESPERSONS[1], // Nadeesha
      },
      {
        id: 'item-3',
        product: MOCK_PRODUCTS[3], // Toblerone 100g (Rs. 1,200)
        quantity: 2,
        unitPrice: 1200,
        salesperson: MOCK_SALESPERSONS[0],
      },
      {
        id: 'item-4',
        product: MOCK_PRODUCTS[4], // M&M's 45g (Rs. 550)
        quantity: 1,
        unitPrice: 550,
        salesperson: null,
      }
    ],
    subtotal: 4350,
    discountTotal: 500,
    tax: 0,
    total: 3850,
    tenders: [
      { method: 'cash', amount: 2000 },
      { method: 'card', amount: 1850, reference: 'VISA-9941' },
    ],
    change: 0,
    status: 'Completed',
  },
  {
    id: 'sale-001828',
    invoiceNumber: 'INV-001828',
    timestamp: '10:15 AM',
    date: 'Today',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-2',
      name: 'Shanika Fernando',
      phone: '071 882 3910',
    },
    items: [
      {
        id: 'item-21',
        product: MOCK_PRODUCTS[1], // Snickers 50g (Rs. 500)
        quantity: 2,
        unitPrice: 500,
        salesperson: MOCK_SALESPERSONS[2], // Kasun
      }
    ],
    subtotal: 1000,
    discountTotal: 0,
    tax: 0,
    total: 1000,
    tenders: [
      { method: 'cash', amount: 1000 },
    ],
    change: 0,
    status: 'Completed',
  },
  {
    id: 'sale-001827',
    invoiceNumber: 'INV-001827',
    timestamp: '09:48 AM',
    date: 'Today',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-walkin',
      name: 'Walk-in Customer',
      phone: '',
      isWalkIn: true,
    },
    items: [
      {
        id: 'item-31',
        product: MOCK_PRODUCTS[6], // Ferrero Rocher Box (Rs. 1,350)
        quantity: 2,
        unitPrice: 1350,
        salesperson: MOCK_SALESPERSONS[3],
      },
      {
        id: 'item-32',
        product: MOCK_PRODUCTS[8], // Milka (Rs. 900)
        quantity: 2,
        unitPrice: 900,
        salesperson: MOCK_SALESPERSONS[3],
      },
      {
        id: 'item-33',
        product: MOCK_PRODUCTS[9], // Cadbury (Rs. 850)
        quantity: 1,
        unitPrice: 850,
        salesperson: null,
      }
    ],
    subtotal: 5350,
    discountTotal: 0,
    tax: 0,
    total: 5350,
    tenders: [
      { method: 'card', amount: 5350, reference: 'VISA-5120' },
    ],
    change: 0,
    status: 'Completed',
  },
  {
    id: 'sale-001826',
    invoiceNumber: 'INV-001826',
    timestamp: '09:15 AM',
    date: 'Today',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-kasun',
      name: 'Kasun Jayawardena',
      phone: '075 442 1109',
    },
    items: [
      {
        id: 'item-41',
        product: MOCK_PRODUCTS[2], // Mars 51g
        quantity: 3,
        unitPrice: 480,
        salesperson: MOCK_SALESPERSONS[1],
      },
      {
        id: 'item-42',
        product: MOCK_PRODUCTS[0], // KitKat
        quantity: 2,
        unitPrice: 450,
        salesperson: MOCK_SALESPERSONS[0],
      }
    ],
    subtotal: 2340,
    discountTotal: 0,
    tax: 0,
    total: 2340,
    tenders: [
      { method: 'cash', amount: 2340 },
    ],
    change: 0,
    status: 'Returned',
  },
  {
    id: 'sale-001825',
    invoiceNumber: 'INV-001825',
    timestamp: '02:15 PM',
    date: '2026-09-03',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-walkin',
      name: 'Walk-in Customer',
      phone: '',
      isWalkIn: true,
    },
    items: [
      {
        id: 'item-51',
        product: MOCK_PRODUCTS[5], // Lindt Excellence 85%
        quantity: 1,
        unitPrice: 1550,
        salesperson: null,
      }
    ],
    subtotal: 1550,
    discountTotal: 0,
    tax: 0,
    total: 1550,
    tenders: [
      { method: 'card', amount: 1550, reference: 'MASTER-2011' },
    ],
    change: 0,
    status: 'Completed',
  },
  {
    id: 'sale-001824',
    invoiceNumber: 'INV-001824',
    timestamp: '03:10 PM',
    date: 'Yesterday',
    cashier: 'Nimal Perera',
    customer: {
      id: 'cust-kamal',
      name: 'Kamal Silva',
      phone: '071 334 9912',
    },
    items: [
      {
        id: 'item-61',
        product: MOCK_PRODUCTS[1],
        quantity: 2,
        unitPrice: 500,
        salesperson: null,
      }
    ],
    subtotal: 1000,
    discountTotal: 0,
    tax: 0,
    total: 1000,
    tenders: [
      { method: 'cash', amount: 1000 },
    ],
    change: 0,
    status: 'Returned',
  }
];
