export interface User {
  id: number;
  username: string;
  role: 'admin' | 'penagih';
  name: string;
}

export interface Packet {
  id: number;
  name: string;
  price: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  address: string;
  phone: string;
  packet: string;
  created_at: string;
  is_paid?: boolean | number;
  last_payment_date?: string | null;
  paid_months?: string | null;
}

export interface Transaction {
  id: number;
  user_id: number;
  customer_id?: number | null;
  type: 'pemasukan' | 'pengeluaran';
  category: string;
  amount: number;
  description: string;
  status: 'pending' | 'deposited' | 'confirmed';
  billing_period?: string;
  transaction_date: string;
  created_at: string;
  collector_name?: string;
  customer_name?: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingAmount?: number;
}
