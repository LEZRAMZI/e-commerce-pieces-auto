/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductCompatibility {
  brand: string;
  car_model: string;
  year: number | string;
  motorisation?: string;
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  price: number;
  description: string;
  car_model: string;
  year: number | string;
  stock: number;
  image_url: string;
  created_at: string;
  compatibilities: ProductCompatibility[];
  motorisation?: string;
  category?: string;
  low_stock_threshold?: number;
}

export const PRODUCT_CATEGORIES = [
  "1 Moteur",
  "2 Carburant, echap. refroidis.",
  "3 Boite de vitesses",
  "4 Essieu avant, Direction",
  "5 Essieu arriere",
  "6 Roues, Freins",
  "7 Outil de levage",
  "8 Carrosserie",
  "9 Systeme electrique",
  "0 Accessoires/Infodivert./divers"
];

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'rejected' | 'delivered';

export interface Order {
  id: number;
  customer_id: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  product_name?: string; // Hydrated for display convenience
  product_image_url?: string;
}

// Full Order structure including hydrated customer and items details for the administrator panel
export interface OrderWithDetails extends Order {
  customer: Customer;
  items: OrderItem[];
}

export interface DashboardStats {
  totalSales: number;
  ordersCount: number;
  pendingOrdersCount: number;
  lowStockItemsCount: number;
}
