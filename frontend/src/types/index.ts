export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active?: boolean;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
  created_by: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string | null;
  price: number;
  quantity: number;
  image: string | null;
  created_by: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface StockMovement {
  id: number;
  product_id: number;
  type: 'in' | 'out';
  quantity: number;
  description: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
  product_name: string;
}

export interface Supplier {
  id: number;
  company_name: string;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  supplier_id: number | null;
  total_value: number;
  status: 'pending' | 'received' | 'cancelled';
  notes: string | null;
  created_at: string;
  supplier_name: string | null;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
}

export interface Sale {
  id: number;
  client_id: number | null;
  total_value: number;
  notes: string | null;
  created_at: string;
  client_name: string | null;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
}

export interface Transaction {
  id: number;
  type: 'revenue' | 'expense';
  category: string;
  description: string;
  value: number;
  transaction_date: string;
  created_at: string;
}

export interface CashFlow {
  total_revenue: number;
  total_expense: number;
  balance: number;
}

export interface Appointment {
  id: number;
  title: string;
  description: string | null;
  appointment_date: string;
  appointment_time: string | null;
  client_id: number | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  client_name: string | null;
}

export interface DashboardData {
  stats: {
    total_clients: number;
    total_products: number;
    total_suppliers: number;
    total_sales: number;
    total_purchases: number;
    stock_value: number;
    total_revenue: number;
    total_expense: number;
    balance: number;
    low_stock_count: number;
  };
  charts: {
    revenueByMonth: { label: string; value: number }[];
    expenseByMonth: { label: string; value: number }[];
    salesByMonth: { label: string; value: number }[];
    productsByCategory: { label: string; value: number }[];
  };
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  company_id: number;
  type: string;
  title: string;
  message: string | null;
  icon: string | null;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  company_id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  errorCode?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
