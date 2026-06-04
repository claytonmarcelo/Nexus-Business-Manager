export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  active?: boolean;
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
