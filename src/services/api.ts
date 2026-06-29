/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Customer, OrderWithDetails, OrderStatus, DashboardStats, Order } from '../types';

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const cacheHelper = {
  getProducts: async (filters?: { brand?: string; model?: string; year?: string; q?: string }): Promise<Product[]> => {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.brand) params.append('brand', filters.brand);
      if (filters.model) params.append('model', filters.model);
      if (filters.year) params.append('year', filters.year);
      if (filters.q) params.append('q', filters.q);
    }
    const res = await fetch(`${API_BASE}/products?${params.toString()}`);
    if (!res.ok) throw new Error('Impossible de charger les pièces.');
    return res.json();
  },

  getProductById: async (id: number): Promise<Product> => {
    const res = await fetch(`${API_BASE}/products/${id}`);
    if (!res.ok) throw new Error('Impossible de charger le produit.');
    return res.json();
  },

  createProduct: async (productData: Omit<Product, 'id' | 'created_at'>): Promise<Product> => {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erreur lors de la création du produit.');
    }
    return res.json();
  },

  updateProduct: async (id: number, productData: Partial<Product>): Promise<Product> => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(productData),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erreur lors de la mise à jour.');
    }
    return res.json();
  },

  deleteProduct: async (id: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erreur lors de la suppression.');
    }
  },

  createOrder: async (orderPayload: {
    customer: { name: string; phone: string; email: string; address?: string };
    items: { product_id: number; quantity: number }[];
  }): Promise<{ message: string; order: OrderWithDetails }> => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erreur lors de la commande.');
    }
    return res.json();
  },

  getWhatsAppNumber: async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/settings/whatsapp-number`);
    if (!res.ok) throw new Error('Impossible de charger le numéro WhatsApp.');
    const data = await res.json();
    return data.whatsappNumber;
  },

  updateWhatsAppNumber: async (whatsappNumber: string): Promise<string> => {
    const res = await fetch(`${API_BASE}/settings/whatsapp-number`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ whatsappNumber }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erreur lors de la mise à jour du numéro WhatsApp.');
    }
    const data = await res.json();
    return data.whatsappNumber;
  },

  getOrders: async (): Promise<OrderWithDetails[]> => {
    const res = await fetch(`${API_BASE}/orders`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Impossible de charger les commandes.');
    return res.json();
  },

  getOrderById: async (id: number): Promise<OrderWithDetails> => {
    const res = await fetch(`${API_BASE}/orders/${id}`);
    if (!res.ok) throw new Error('Impossible de trouver la commande.');
    return res.json();
  },

  updateOrderStatus: async (id: number, status: OrderStatus): Promise<OrderWithDetails> => {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Erreur de changement de statut.');
    return res.json();
  },

  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch(`${API_BASE}/customers`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Impossible de récupérer les clients.');
    return res.json();
  },

  getAdminStats: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Impossible de charger les statistiques.');
    return res.json();
  },

  login: async (email: string, password: string): Promise<{ token: string; admin: { email: string; name: string } }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Identifiants administrateur incorrects.');
    }
    return res.json();
  },
};
