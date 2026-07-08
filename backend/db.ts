/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Product, Customer, Order, OrderItem, OrderWithDetails, OrderStatus, DashboardStats, ProductCompatibility } from '../src/types';

// Charger les variables d'environnement
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const normalizeWhatsAppNumber = (value: string) => {
  const parts = value.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return '213555123456';

  const normalizedParts = parts.map(trimmed => {
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) return '';
    return trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
  }).filter(Boolean);

  if (normalizedParts.length === 0) return '213555123456';
  return normalizedParts.join(',');
};

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auto_parts_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

class Database {
  // --- Products ---
  public async getProducts(): Promise<Product[]> {
    const [rows] = await pool.query('SELECT * FROM PRODUCTS');
    const products = rows as any[];
    
    // Fetch compatibilities for each product
    for (const p of products) {
      const [comps] = await pool.query('SELECT brand, car_model, year, motorisation FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?', [p.id]);
      p.compatibilities = (comps as ProductCompatibility[]).length > 0 ? comps : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
    }
    return products;
  }

  public async getProductById(id: number): Promise<Product | undefined> {
    const [rows] = await pool.query('SELECT * FROM PRODUCTS WHERE id = ?', [id]);
    const products = rows as any[];
    if (products.length === 0) return undefined;
    const p = products[0];
    
    const [comps] = await pool.query('SELECT brand, car_model, year, motorisation FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?', [id]);
    p.compatibilities = (comps as ProductCompatibility[]).length > 0 ? comps : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
    return p;
  }

  public async createProduct(item: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    const compatibilities = item.compatibilities && item.compatibilities.length > 0
      ? item.compatibilities
      : [{ brand: item.brand, car_model: item.car_model, year: item.year, motorisation: item.motorisation }];
    const firstComp = compatibilities[0];
    
    const brand = firstComp?.brand || item.brand;
    const car_model = firstComp?.car_model || item.car_model;
    const year = firstComp?.year || item.year;
    const motorisation = firstComp?.motorisation || item.motorisation || 'Toutes motorisations';
    const low_stock_threshold = item.low_stock_threshold !== undefined ? item.low_stock_threshold : 5;

    const [result] = await pool.query(
      'INSERT INTO PRODUCTS (name, reference, part_brand, brand, price, description, car_model, year, motorisation, category, low_stock_threshold, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [item.name, item.reference || null, item.part_brand || null, brand, item.price, item.description || '', car_model, year, motorisation, item.category || '0 Accessoires/Infodivert./divers', low_stock_threshold, item.stock, item.image_url || '']
    );
    const insertId = (result as any).insertId;

    for (const comp of compatibilities) {
      await pool.query(
        'INSERT INTO PRODUCT_COMPATIBILITIES (product_id, brand, car_model, year, motorisation) VALUES (?, ?, ?, ?, ?)',
        [insertId, comp.brand, comp.car_model, comp.year, comp.motorisation || 'Toutes motorisations']
      );
    }

    return this.getProductById(insertId) as Promise<Product>;
  }

  public async updateProduct(id: number, item: Partial<Product>): Promise<Product | undefined> {
    const existing = await this.getProductById(id);
    if (!existing) return undefined;

    const updatedCompatibilities = item.compatibilities !== undefined
      ? item.compatibilities
      : (existing.compatibilities || [{ brand: existing.brand, car_model: existing.car_model, year: existing.year, motorisation: existing.motorisation }]);
    
    const firstComp = updatedCompatibilities[0];
    
    const brand = firstComp?.brand || item.brand || existing.brand;
    const car_model = firstComp?.car_model || item.car_model || existing.car_model;
    const year = firstComp?.year || item.year || existing.year;
    const motorisation = firstComp?.motorisation || item.motorisation || existing.motorisation;
    const name = item.name || existing.name;
    const reference = item.reference !== undefined ? item.reference : existing.reference;
    const part_brand = item.part_brand !== undefined ? item.part_brand : existing.part_brand;
    const price = item.price !== undefined ? item.price : existing.price;
    const description = item.description !== undefined ? item.description : existing.description;
    const category = item.category || existing.category;
    const low_stock_threshold = item.low_stock_threshold !== undefined ? item.low_stock_threshold : existing.low_stock_threshold;
    const stock = item.stock !== undefined ? item.stock : existing.stock;
    const image_url = item.image_url || existing.image_url;

    await pool.query(
      'UPDATE PRODUCTS SET name=?, reference=?, part_brand=?, brand=?, price=?, description=?, car_model=?, year=?, motorisation=?, category=?, low_stock_threshold=?, stock=?, image_url=? WHERE id=?',
      [name, reference, part_brand, brand, price, description, car_model, year, motorisation, category, low_stock_threshold, stock, image_url, id]
    );

    if (item.compatibilities !== undefined) {
      await pool.query('DELETE FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?', [id]);
      for (const comp of item.compatibilities) {
        await pool.query(
          'INSERT INTO PRODUCT_COMPATIBILITIES (product_id, brand, car_model, year, motorisation) VALUES (?, ?, ?, ?, ?)',
          [id, comp.brand, comp.car_model, comp.year, comp.motorisation || 'Toutes motorisations']
        );
      }
    }

    return this.getProductById(id);
  }

  public async deleteProduct(id: number): Promise<boolean> {
    const [result] = await pool.query('DELETE FROM PRODUCTS WHERE id = ?', [id]);
    return (result as any).affectedRows > 0;
  }

  private getDefaultWhatsAppNumber(): string {
    return process.env.WHATSAPP_NUMBER || '213555123456';
  }

  public async getWhatsAppNumber(): Promise<string> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS APP_SETTINGS (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const [rows] = await pool.query('SELECT value FROM APP_SETTINGS WHERE key_name = ?', ['whatsapp_number']);
      const settings = rows as any[];
      if (settings.length > 0) {
        return normalizeWhatsAppNumber(settings[0].value || this.getDefaultWhatsAppNumber());
      }
    } catch (err) {
      console.error('Erreur lors de la lecture du numéro WhatsApp :', err);
    }
    return this.getDefaultWhatsAppNumber();
  }

  public async updateWhatsAppNumber(whatsappNumber: string): Promise<string> {
    const normalized = normalizeWhatsAppNumber(whatsappNumber || this.getDefaultWhatsAppNumber());
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS APP_SETTINGS (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(
        'INSERT INTO APP_SETTINGS (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['whatsapp_number', normalized]
      );
      return normalized;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du numéro WhatsApp :', err);
      return normalized;
    }
  }

  // --- Customers ---
  public async getCustomers(): Promise<Customer[]> {
    const [rows] = await pool.query('SELECT * FROM CUSTOMERS');
    return rows as Customer[];
  }

  public async findOrCreateCustomer(name: string, phone: string, email: string, address?: string): Promise<Customer> {
    const [rows] = await pool.query('SELECT * FROM CUSTOMERS WHERE email = ? OR phone = ?', [email, phone]);
    const customers = rows as Customer[];
    
    if (customers.length > 0) {
      const customer = customers[0];
      if (address && address !== customer.address) {
        await pool.query('UPDATE CUSTOMERS SET address = ? WHERE id = ?', [address, customer.id]);
        customer.address = address;
      }
      return customer;
    }

    const [result] = await pool.query('INSERT INTO CUSTOMERS (name, phone, email, address) VALUES (?, ?, ?, ?)', [name, phone, email, address || null]);
    const insertId = (result as any).insertId;
    return { id: insertId, name, phone, email, address };
  }

  // --- Orders ---
  public async getOrders(): Promise<Order[]> {
    const [rows] = await pool.query('SELECT * FROM ORDERS ORDER BY id DESC');
    return rows as Order[];
  }

  public async getOrdersWithDetails(): Promise<OrderWithDetails[]> {
    const [orders] = await pool.query('SELECT * FROM ORDERS ORDER BY id DESC') as any[];
    for (const order of orders) {
      await this.hydrateOrder(order);
    }
    return orders as OrderWithDetails[];
  }

  public async getOrderWithDetailsById(id: number): Promise<OrderWithDetails | undefined> {
    const [orders] = await pool.query('SELECT * FROM ORDERS WHERE id = ?', [id]) as any[];
    if (orders.length === 0) return undefined;
    const order = orders[0];
    await this.hydrateOrder(order);
    return order as OrderWithDetails;
  }

  private async hydrateOrder(order: any) {
    const [customers] = await pool.query('SELECT * FROM CUSTOMERS WHERE id = ?', [order.customer_id]) as any[];
    order.customer = customers.length > 0 ? customers[0] : { id: order.customer_id, name: "Inconnu", phone: "", email: "" };

    const [items] = await pool.query(`
      SELECT oi.*, COALESCE(p.name, 'Produit supprimé') as product_name, p.image_url as product_image_url
      FROM ORDER_ITEMS oi
      LEFT JOIN PRODUCTS p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]) as any[];
    order.items = items;
  }

  public async createOrder(customerData: { name: string; phone: string; email: string; address?: string }, itemsData: { product_id: number; quantity: number }[]): Promise<OrderWithDetails | { error: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let customerId;
      const [customers] = await connection.query('SELECT * FROM CUSTOMERS WHERE email = ? OR phone = ?', [customerData.email, customerData.phone]) as any[];
      if (customers.length > 0) {
        customerId = customers[0].id;
        if (customerData.address && customerData.address !== customers[0].address) {
          await connection.query('UPDATE CUSTOMERS SET address = ? WHERE id = ?', [customerData.address, customerId]);
        }
      } else {
        const [custResult] = await connection.query('INSERT INTO CUSTOMERS (name, phone, email, address) VALUES (?, ?, ?, ?)', [customerData.name, customerData.phone, customerData.email, customerData.address || null]);
        customerId = (custResult as any).insertId;
      }

      let total = 0;
      const validatedItems = [];
      for (const item of itemsData) {
        const [prods] = await connection.query('SELECT * FROM PRODUCTS WHERE id = ? FOR UPDATE', [item.product_id]) as any[];
        if (prods.length === 0) {
          await connection.rollback();
          return { error: `Le produit d'ID ${item.product_id} n'existe pas.` };
        }
        const prod = prods[0];
        if (prod.stock < item.quantity) {
          await connection.rollback();
          return { error: `Stock insuffisant pour le produit : ${prod.name} (Disponible: ${prod.stock}, Demandé: ${item.quantity})` };
        }
        total += parseFloat(prod.price) * item.quantity;
        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: prod.price
        });
      }

      const [orderResult] = await connection.query('INSERT INTO ORDERS (customer_id, total_price, status) VALUES (?, ?, ?)', [customerId, total, 'pending']);
      const orderId = (orderResult as any).insertId;

      for (const item of validatedItems) {
        await connection.query('INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.product_id, item.quantity, item.price]);
        await connection.query('UPDATE PRODUCTS SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
      }

      await connection.commit();
      return this.getOrderWithDetailsById(orderId) as Promise<OrderWithDetails>;
    } catch (err: any) {
      await connection.rollback();
      return { error: `Erreur base de données: ${err.message}` };
    } finally {
      connection.release();
    }
  }

  public async updateOrderStatus(orderId: number, status: OrderStatus): Promise<OrderWithDetails | undefined> {
    const existing = await this.getOrderWithDetailsById(orderId);
    if (!existing) return undefined;

    const oldStatus = existing.status;
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      await connection.query('UPDATE ORDERS SET status = ? WHERE id = ?', [status, orderId]);

      if (status === 'rejected' && oldStatus !== 'rejected') {
        const [items] = await connection.query('SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?', [orderId]) as any[];
        for (const item of items) {
          await connection.query('UPDATE PRODUCTS SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      } else if (oldStatus === 'rejected' && status !== 'rejected') {
        const [items] = await connection.query('SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?', [orderId]) as any[];
        for (const item of items) {
          await connection.query('UPDATE PRODUCTS SET stock = GREATEST(0, stock - ?) WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return this.getOrderWithDetailsById(orderId);
  }

  public async getDashboardStats(): Promise<DashboardStats> {
    const [orders] = await pool.query("SELECT * FROM ORDERS") as any[];
    const confirmedOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'delivered');
    const totalSales = confirmedOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total_price), 0);
    
    const [lowStock] = await pool.query('SELECT COUNT(*) as count FROM PRODUCTS WHERE stock <= low_stock_threshold') as any[];
    
    return {
      totalSales: Math.round(totalSales * 100) / 100,
      ordersCount: orders.length,
      pendingOrdersCount: orders.filter((o: any) => o.status === 'pending').length,
      lowStockItemsCount: lowStock[0].count
    };
  }
}

export const dbInstance = new Database();
