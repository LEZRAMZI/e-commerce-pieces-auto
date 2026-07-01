var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
var import_vite = require("vite");

// backend/db.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
import_dotenv.default.config({ path: ".env.local", override: true });
var normalizeWhatsAppNumber = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "213555123456";
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "213555123456";
  return trimmed.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
};
var pool = import_promise.default.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "auto_parts_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
var Database = class {
  // --- Products ---
  async getProducts() {
    const [rows] = await pool.query("SELECT * FROM PRODUCTS");
    const products = rows;
    for (const p of products) {
      const [comps] = await pool.query("SELECT brand, car_model, year, motorisation FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?", [p.id]);
      p.compatibilities = comps.length > 0 ? comps : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
    }
    return products;
  }
  async getProductById(id) {
    const [rows] = await pool.query("SELECT * FROM PRODUCTS WHERE id = ?", [id]);
    const products = rows;
    if (products.length === 0) return void 0;
    const p = products[0];
    const [comps] = await pool.query("SELECT brand, car_model, year, motorisation FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?", [id]);
    p.compatibilities = comps.length > 0 ? comps : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
    return p;
  }
  async createProduct(item) {
    const compatibilities = item.compatibilities && item.compatibilities.length > 0 ? item.compatibilities : [{ brand: item.brand, car_model: item.car_model, year: item.year, motorisation: item.motorisation }];
    const firstComp = compatibilities[0];
    const brand = firstComp?.brand || item.brand;
    const car_model = firstComp?.car_model || item.car_model;
    const year = firstComp?.year || item.year;
    const motorisation = firstComp?.motorisation || item.motorisation || "Toutes motorisations";
    const low_stock_threshold = item.low_stock_threshold !== void 0 ? item.low_stock_threshold : 5;
    const [result] = await pool.query(
      "INSERT INTO PRODUCTS (name, brand, price, description, car_model, year, motorisation, category, low_stock_threshold, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [item.name, brand, item.price, item.description || "", car_model, year, motorisation, item.category || "0 Accessoires/Infodivert./divers", low_stock_threshold, item.stock, item.image_url || ""]
    );
    const insertId = result.insertId;
    for (const comp of compatibilities) {
      await pool.query(
        "INSERT INTO PRODUCT_COMPATIBILITIES (product_id, brand, car_model, year, motorisation) VALUES (?, ?, ?, ?, ?)",
        [insertId, comp.brand, comp.car_model, comp.year, comp.motorisation || "Toutes motorisations"]
      );
    }
    return this.getProductById(insertId);
  }
  async updateProduct(id, item) {
    const existing = await this.getProductById(id);
    if (!existing) return void 0;
    const updatedCompatibilities = item.compatibilities !== void 0 ? item.compatibilities : existing.compatibilities || [{ brand: existing.brand, car_model: existing.car_model, year: existing.year, motorisation: existing.motorisation }];
    const firstComp = updatedCompatibilities[0];
    const brand = firstComp?.brand || item.brand || existing.brand;
    const car_model = firstComp?.car_model || item.car_model || existing.car_model;
    const year = firstComp?.year || item.year || existing.year;
    const motorisation = firstComp?.motorisation || item.motorisation || existing.motorisation;
    const name = item.name || existing.name;
    const price = item.price !== void 0 ? item.price : existing.price;
    const description = item.description !== void 0 ? item.description : existing.description;
    const category = item.category || existing.category;
    const low_stock_threshold = item.low_stock_threshold !== void 0 ? item.low_stock_threshold : existing.low_stock_threshold;
    const stock = item.stock !== void 0 ? item.stock : existing.stock;
    const image_url = item.image_url || existing.image_url;
    await pool.query(
      "UPDATE PRODUCTS SET name=?, brand=?, price=?, description=?, car_model=?, year=?, motorisation=?, category=?, low_stock_threshold=?, stock=?, image_url=? WHERE id=?",
      [name, brand, price, description, car_model, year, motorisation, category, low_stock_threshold, stock, image_url, id]
    );
    if (item.compatibilities !== void 0) {
      await pool.query("DELETE FROM PRODUCT_COMPATIBILITIES WHERE product_id = ?", [id]);
      for (const comp of item.compatibilities) {
        await pool.query(
          "INSERT INTO PRODUCT_COMPATIBILITIES (product_id, brand, car_model, year, motorisation) VALUES (?, ?, ?, ?, ?)",
          [id, comp.brand, comp.car_model, comp.year, comp.motorisation || "Toutes motorisations"]
        );
      }
    }
    return this.getProductById(id);
  }
  async deleteProduct(id) {
    const [result] = await pool.query("DELETE FROM PRODUCTS WHERE id = ?", [id]);
    return result.affectedRows > 0;
  }
  getDefaultWhatsAppNumber() {
    return process.env.WHATSAPP_NUMBER || "213555123456";
  }
  async getWhatsAppNumber() {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS APP_SETTINGS (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const [rows] = await pool.query("SELECT value FROM APP_SETTINGS WHERE key_name = ?", ["whatsapp_number"]);
      const settings = rows;
      if (settings.length > 0) {
        return normalizeWhatsAppNumber(settings[0].value || this.getDefaultWhatsAppNumber());
      }
    } catch (err) {
      console.error("Erreur lors de la lecture du num\xE9ro WhatsApp :", err);
    }
    return this.getDefaultWhatsAppNumber();
  }
  async updateWhatsAppNumber(whatsappNumber) {
    const normalized = normalizeWhatsAppNumber(whatsappNumber || this.getDefaultWhatsAppNumber());
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS APP_SETTINGS (
          key_name VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(
        "INSERT INTO APP_SETTINGS (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
        ["whatsapp_number", normalized]
      );
      return normalized;
    } catch (err) {
      console.error("Erreur lors de la mise \xE0 jour du num\xE9ro WhatsApp :", err);
      return normalized;
    }
  }
  // --- Customers ---
  async getCustomers() {
    const [rows] = await pool.query("SELECT * FROM CUSTOMERS");
    return rows;
  }
  async findOrCreateCustomer(name, phone, email, address) {
    const [rows] = await pool.query("SELECT * FROM CUSTOMERS WHERE email = ? OR phone = ?", [email, phone]);
    const customers = rows;
    if (customers.length > 0) {
      const customer = customers[0];
      if (address && address !== customer.address) {
        await pool.query("UPDATE CUSTOMERS SET address = ? WHERE id = ?", [address, customer.id]);
        customer.address = address;
      }
      return customer;
    }
    const [result] = await pool.query("INSERT INTO CUSTOMERS (name, phone, email, address) VALUES (?, ?, ?, ?)", [name, phone, email, address || null]);
    const insertId = result.insertId;
    return { id: insertId, name, phone, email, address };
  }
  // --- Orders ---
  async getOrders() {
    const [rows] = await pool.query("SELECT * FROM ORDERS ORDER BY id DESC");
    return rows;
  }
  async getOrdersWithDetails() {
    const [orders] = await pool.query("SELECT * FROM ORDERS ORDER BY id DESC");
    for (const order of orders) {
      await this.hydrateOrder(order);
    }
    return orders;
  }
  async getOrderWithDetailsById(id) {
    const [orders] = await pool.query("SELECT * FROM ORDERS WHERE id = ?", [id]);
    if (orders.length === 0) return void 0;
    const order = orders[0];
    await this.hydrateOrder(order);
    return order;
  }
  async hydrateOrder(order) {
    const [customers] = await pool.query("SELECT * FROM CUSTOMERS WHERE id = ?", [order.customer_id]);
    order.customer = customers.length > 0 ? customers[0] : { id: order.customer_id, name: "Inconnu", phone: "", email: "" };
    const [items] = await pool.query(`
      SELECT oi.*, COALESCE(p.name, 'Produit supprim\xE9') as product_name, p.image_url as product_image_url
      FROM ORDER_ITEMS oi
      LEFT JOIN PRODUCTS p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [order.id]);
    order.items = items;
  }
  async createOrder(customerData, itemsData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let customerId;
      const [customers] = await connection.query("SELECT * FROM CUSTOMERS WHERE email = ? OR phone = ?", [customerData.email, customerData.phone]);
      if (customers.length > 0) {
        customerId = customers[0].id;
        if (customerData.address && customerData.address !== customers[0].address) {
          await connection.query("UPDATE CUSTOMERS SET address = ? WHERE id = ?", [customerData.address, customerId]);
        }
      } else {
        const [custResult] = await connection.query("INSERT INTO CUSTOMERS (name, phone, email, address) VALUES (?, ?, ?, ?)", [customerData.name, customerData.phone, customerData.email, customerData.address || null]);
        customerId = custResult.insertId;
      }
      let total = 0;
      const validatedItems = [];
      for (const item of itemsData) {
        const [prods] = await connection.query("SELECT * FROM PRODUCTS WHERE id = ? FOR UPDATE", [item.product_id]);
        if (prods.length === 0) {
          await connection.rollback();
          return { error: `Le produit d'ID ${item.product_id} n'existe pas.` };
        }
        const prod = prods[0];
        if (prod.stock < item.quantity) {
          await connection.rollback();
          return { error: `Stock insuffisant pour le produit : ${prod.name} (Disponible: ${prod.stock}, Demand\xE9: ${item.quantity})` };
        }
        total += parseFloat(prod.price) * item.quantity;
        validatedItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: prod.price
        });
      }
      const [orderResult] = await connection.query("INSERT INTO ORDERS (customer_id, total_price, status) VALUES (?, ?, ?)", [customerId, total, "pending"]);
      const orderId = orderResult.insertId;
      for (const item of validatedItems) {
        await connection.query("INSERT INTO ORDER_ITEMS (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)", [orderId, item.product_id, item.quantity, item.price]);
        await connection.query("UPDATE PRODUCTS SET stock = stock - ? WHERE id = ?", [item.quantity, item.product_id]);
      }
      await connection.commit();
      return this.getOrderWithDetailsById(orderId);
    } catch (err) {
      await connection.rollback();
      return { error: `Erreur base de donn\xE9es: ${err.message}` };
    } finally {
      connection.release();
    }
  }
  async updateOrderStatus(orderId, status) {
    const existing = await this.getOrderWithDetailsById(orderId);
    if (!existing) return void 0;
    const oldStatus = existing.status;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("UPDATE ORDERS SET status = ? WHERE id = ?", [status, orderId]);
      if (status === "rejected" && oldStatus !== "rejected") {
        const [items] = await connection.query("SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?", [orderId]);
        for (const item of items) {
          await connection.query("UPDATE PRODUCTS SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }
      } else if (oldStatus === "rejected" && status !== "rejected") {
        const [items] = await connection.query("SELECT product_id, quantity FROM ORDER_ITEMS WHERE order_id = ?", [orderId]);
        for (const item of items) {
          await connection.query("UPDATE PRODUCTS SET stock = GREATEST(0, stock - ?) WHERE id = ?", [item.quantity, item.product_id]);
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
  async getDashboardStats() {
    const [orders] = await pool.query("SELECT * FROM ORDERS");
    const confirmedOrders = orders.filter((o) => o.status === "confirmed" || o.status === "delivered");
    const totalSales = confirmedOrders.reduce((sum, o) => sum + parseFloat(o.total_price), 0);
    const [lowStock] = await pool.query("SELECT COUNT(*) as count FROM PRODUCTS WHERE stock <= low_stock_threshold");
    return {
      totalSales: Math.round(totalSales * 100) / 100,
      ordersCount: orders.length,
      pendingOrdersCount: orders.filter((o) => o.status === "pending").length,
      lowStockItemsCount: lowStock[0].count
    };
  }
};
var dbInstance = new Database();

// backend/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcrypt = __toESM(require("bcrypt"), 1);
var JWT_SECRET = process.env.JWT_SECRET || "pieces-auto-expert-secret-key-2026";
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@piecesauto.com";
var ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";
var ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
function signToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authentification requise. En-t\xEAte Authorization manquant." });
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Format du jeton invalide (doit \xEAtre 'Bearer <token>')." });
  }
  const token = parts[1];
  try {
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Session expir\xE9e ou jeton d'authentification invalide." });
  }
}
async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Veuillez fournir un e-mail et un mot de passe." });
  }
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(401).json({ error: "Identifiants ou mot de passe incorrects." });
  }
  let passwordValid = false;
  if (ADMIN_PASSWORD_HASH) {
    passwordValid = await import_bcrypt.default.compare(password, ADMIN_PASSWORD_HASH);
  } else {
    passwordValid = password === ADMIN_PASSWORD;
  }
  if (!passwordValid) {
    return res.status(401).json({ error: "Identifiants ou mot de passe incorrects." });
  }
  const token = signToken({ email: ADMIN_EMAIL, role: "admin" });
  return res.json({
    token,
    admin: {
      email: ADMIN_EMAIL,
      name: "Administrateur Pi\xE8ces Auto"
    }
  });
}

// server.ts
var import_fs = __toESM(require("fs"), 1);
if (process.env.NODE_ENV === "production") {
  const weakSecrets = ["pieces-auto-expert-secret-key-2026", "secret", "changeme", ""];
  if (!process.env.JWT_SECRET || weakSecrets.includes(process.env.JWT_SECRET)) {
    console.error("[ERREUR CRITIQUE] JWT_SECRET manquant ou trop faible en production. Veuillez d\xE9finir une valeur forte via les variables d'environnement.");
    process.exit(1);
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "admin123") {
    console.error("[ERREUR CRITIQUE] ADMIN_PASSWORD manquant ou trop faible en production. Veuillez d\xE9finir un mot de passe fort via les variables d'environnement.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    console.warn("[ATTENTION] GEMINI_API_KEY non configur\xE9e ou encore sur la valeur placeholder.");
  }
}
var normalizeWhatsAppNumber2 = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return trimmed.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
};
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = parseInt(process.env.PORT || "8080", 10);
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = isProduction ? [
    process.env.APP_URL,
    "https://e-commerce-pieces-auto-production.up.railway.app",
    "https://*.up.railway.app"
  ].filter(Boolean) : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "https://*.up.railway.app"];
  app.use((0, import_cors.default)({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (isProduction) {
        const isAllowed = allowedOrigins.some((allowed) => {
          if (allowed && allowed.includes("*")) {
            const pattern = allowed.replace(/\*/g, ".*");
            try {
              return new RegExp(`^${pattern}$`).test(origin);
            } catch {
              return false;
            }
          }
          return allowed === origin;
        });
        if (isAllowed) {
          return callback(null, true);
        }
        console.warn(`[CORS] Origine bloqu\xE9e: ${origin}`);
        return callback(new Error(`CORS bloqu\xE9 pour l'origine : ${origin}`));
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use(import_express.default.json());
  const loginLimiter = (0, import_express_rate_limit.default)({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 10,
    // 10 tentatives max par 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de tentatives de connexion. Veuillez r\xE9essayer dans 15 minutes." }
  });
  const apiLimiter = (0, import_express_rate_limit.default)({
    windowMs: 60 * 1e3,
    // 1 minute
    max: 120,
    // 120 requêtes par minute par IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requ\xEAtes. Veuillez patienter." }
  });
  app.use("/api/", apiLimiter);
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/auth/login", loginLimiter, handleLogin);
  app.get("/api/settings/whatsapp-number", async (req, res) => {
    try {
      const whatsappNumber = await dbInstance.getWhatsAppNumber();
      res.json({ whatsappNumber });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration du num\xE9ro WhatsApp.", details: err.message });
    }
  });
  app.put("/api/settings/whatsapp-number", requireAdmin, async (req, res) => {
    try {
      const { whatsappNumber } = req.body;
      if (typeof whatsappNumber !== "string" || whatsappNumber.trim().length === 0) {
        return res.status(400).json({ error: "Le num\xE9ro WhatsApp est requis." });
      }
      const normalized = normalizeWhatsAppNumber2(whatsappNumber);
      if (!normalized) {
        return res.status(400).json({ error: "Le num\xE9ro WhatsApp est invalide." });
      }
      const savedNumber = await dbInstance.updateWhatsAppNumber(normalized);
      res.json({ whatsappNumber: savedNumber });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du num\xE9ro WhatsApp.", details: err.message });
    }
  });
  app.get("/api/products", async (req, res) => {
    try {
      const { brand, model, year, q, category, page, limit } = req.query;
      let products = await dbInstance.getProducts();
      if (brand) {
        products = products.filter((p) => p.brand.toLowerCase() === brand.toLowerCase());
      }
      if (model) {
        products = products.filter((p) => p.car_model.toLowerCase() === model.toLowerCase());
      }
      if (category) {
        products = products.filter((p) => p.category === category);
      }
      if (year) {
        const targetStr = year.trim();
        products = products.filter((p) => {
          const comps = p.compatibilities && p.compatibilities.length > 0 ? p.compatibilities : [{ brand: p.brand, car_model: p.car_model, year: p.year }];
          return comps.some((c) => {
            const compStr = c.year?.toString().trim();
            if (!compStr) return false;
            if (compStr === targetStr) return true;
            if (compStr.includes("-")) {
              const parts = compStr.split("-");
              if (parts.length === 2) {
                const start = parseInt(parts[0].trim(), 10);
                const end = parseInt(parts[1].trim(), 10);
                const target = parseInt(targetStr, 10);
                if (!isNaN(start) && !isNaN(end) && !isNaN(target)) {
                  return target >= start && target <= end;
                }
              }
            }
            return false;
          });
        });
      }
      if (q) {
        const term = q.toLowerCase();
        products = products.filter(
          (p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term) || p.brand.toLowerCase().includes(term) || p.car_model.toLowerCase().includes(term)
        );
      }
      const totalCount = products.length;
      if (page !== void 0 && limit !== void 0) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        products = products.slice(offset, offset + limitNum);
        return res.json({
          data: products,
          pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        });
      }
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la r\xE9cup\xE9ration des produits.", details: err.message });
    }
  });
  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de produit invalide." });
      }
      const product = await dbInstance.getProductById(id);
      if (!product) {
        return res.status(404).json({ error: "Produit introuvable." });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: "Erreur serveur.", details: err.message });
    }
  });
  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const { name, brand, price, description, car_model, year, stock, image_url, compatibilities, motorisation, category, low_stock_threshold } = req.body;
      if (!name || price === void 0 || stock === void 0) {
        return res.status(400).json({ error: "Donn\xE9es de produit incompl\xE8tes." });
      }
      const parseYearValue = (val) => {
        if (!val) return 2020;
        const sVal = val.toString().trim();
        if (sVal.includes("-")) {
          return sVal;
        }
        const num = parseInt(sVal, 10);
        return isNaN(num) ? 2020 : num;
      };
      const parsedBrand = brand || compatibilities && compatibilities[0]?.brand || "G\xE9n\xE9rique";
      const parsedModel = car_model || compatibilities && compatibilities[0]?.car_model || "Tous mod\xE8les";
      const parsedYear = parseYearValue(year !== void 0 ? year : compatibilities && compatibilities[0]?.year);
      const parsedMotorisation = motorisation || compatibilities && compatibilities[0]?.motorisation || "Toutes motorisations";
      const newProduct = await dbInstance.createProduct({
        name,
        brand: parsedBrand,
        price: parseFloat(price),
        description: description || "",
        car_model: parsedModel,
        year: parsedYear,
        motorisation: parsedMotorisation,
        stock: parseInt(stock, 10),
        image_url: image_url || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=600&auto=format&fit=crop",
        compatibilities: compatibilities || [{ brand: parsedBrand, car_model: parsedModel, year: parsedYear, motorisation: parsedMotorisation }],
        category: category || "0 Accessoires/Infodivert./divers",
        low_stock_threshold: low_stock_threshold !== void 0 ? parseInt(low_stock_threshold, 10) : 5
      });
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la cr\xE9ation du produit.", details: err.message });
    }
  });
  app.put("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de produit invalide." });
      }
      const updated = await dbInstance.updateProduct(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Produit non trouv\xE9 pour la mise \xE0 jour." });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la mise \xE0 jour du produit.", details: err.message });
    }
  });
  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de produit invalide." });
      }
      const success = await dbInstance.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ error: "Produit non trouv\xE9 ou d\xE9j\xE0 supprim\xE9." });
      }
      res.json({ message: "Produit supprim\xE9 avec succ\xE8s." });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la suppression.", details: err.message });
    }
  });
  app.post("/api/orders", async (req, res) => {
    try {
      const { customer, items } = req.body;
      if (!customer || !customer.name || !customer.phone || !customer.email) {
        return res.status(400).json({ error: "Informations de contact du client manquantes ou incompl\xE8tes (Nom, t\xE9l\xE9phone gsm et e-mail requis)." });
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Le panier est vide. Impossible de valider la commande." });
      }
      const formattedItems = items.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10)
      })).filter((item) => !isNaN(item.product_id) && !isNaN(item.quantity) && item.quantity > 0);
      if (formattedItems.length === 0) {
        return res.status(400).json({ error: "\xC9l\xE9ments du panier invalides." });
      }
      const result = await dbInstance.createOrder(
        {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address
        },
        formattedItems
      );
      if ("error" in result) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json({
        message: "Commande enregistr\xE9e avec succ\xE8s. Elle est en attente de traitement.",
        order: result
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'enregistrement de la commande.", details: err.message });
    }
  });
  app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
      const { page, limit } = req.query;
      let orders = await dbInstance.getOrdersWithDetails();
      const totalCount = orders.length;
      if (page !== void 0 && limit !== void 0) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        orders = orders.slice(offset, offset + limitNum);
        return res.json({
          data: orders,
          pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum)
          }
        });
      }
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: "Erreur de r\xE9cup\xE9ration des commandes.", details: err.message });
    }
  });
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de commande invalide." });
      }
      const order = await dbInstance.getOrderWithDetailsById(id);
      if (!order) {
        return res.status(404).json({ error: "Commande introuvable." });
      }
      res.json(order);
    } catch (err) {
      res.status(500).json({ error: "Serveur erreur.", details: err.message });
    }
  });
  app.put("/api/orders/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de commande invalide." });
      }
      const { status } = req.body;
      if (!status || !["pending", "confirmed", "rejected", "delivered"].includes(status)) {
        return res.status(400).json({ error: "Statut de commande requis et invalide." });
      }
      const updated = await dbInstance.updateOrderStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: "Commande introuvable pour la mise \xE0 jour." });
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: "Erreur de mise \xE0 jour de la commande.", details: err.message });
    }
  });
  app.post("/api/customers", async (req, res) => {
    try {
      const { name, phone, email, address } = req.body;
      if (!name || !phone || !email) {
        return res.status(400).json({ error: "Nom, t\xE9l\xE9phone et email sont obligatoires." });
      }
      const customer = await dbInstance.findOrCreateCustomer(name, phone, email, address);
      res.status(201).json(customer);
    } catch (err) {
      res.status(500).json({ error: "Erreur.", details: err.message });
    }
  });
  app.get("/api/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await dbInstance.getCustomers();
      res.json(customers);
    } catch (err) {
      res.status(500).json({ error: "Erreur.", details: err.message });
    }
  });
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await dbInstance.getDashboardStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: "Erreur d'agr\xE9gation des statistiques.", details: err.message });
    }
  });
  if (!isProduction) {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log(`[INFO] process.cwd(): ${process.cwd()}`);
    console.log(`[INFO] __dirname: ${__dirname}`);
    try {
      console.log(`[INFO] Contenu de ${process.cwd()}: ${import_fs.default.readdirSync(process.cwd()).join(", ")}`);
    } catch (err) {
      console.warn(`[WARN] Impossible de lire le contenu de ${process.cwd()}`);
    }
    const possiblePaths = [
      import_path.default.join(process.cwd(), "dist"),
      import_path.default.join(__dirname, "dist"),
      import_path.default.join(process.cwd(), "..", "dist"),
      import_path.default.join(__dirname, "..", "dist")
    ];
    let distPath = null;
    for (const p of possiblePaths) {
      try {
        if (import_fs.default.existsSync(p)) {
          distPath = p;
          console.log(`[INFO] \u2705 Dossier dist trouv\xE9 \xE0: ${p}`);
          break;
        }
      } catch (err) {
      }
    }
    if (distPath) {
      try {
        console.log(`[INFO] Contenu de dist: ${import_fs.default.readdirSync(distPath).join(", ")}`);
        console.log(`[INFO] Contenu de dist/assets: ${import_fs.default.readdirSync(import_path.default.join(distPath, "assets")).join(", ")}`);
      } catch (err) {
        console.warn(`[WARN] Impossible de lire le contenu de dist`);
      }
      app.use(import_express.default.static(distPath));
      app.use("/assets", import_express.default.static(import_path.default.join(distPath, "assets")));
      app.get("*", (req, res) => {
        const indexPath = import_path.default.join(distPath, "index.html");
        console.log(`[INFO] SPA Fallback: ${req.path} -> ${indexPath}`);
        res.sendFile(indexPath);
      });
    } else {
      console.error(`[ERREUR] \u274C Dossier dist non trouv\xE9. Chemins test\xE9s: ${possiblePaths.join(", ")}`);
      app.get("*", (req, res) => {
        let content = "";
        try {
          content = import_fs.default.readdirSync(process.cwd()).join(", ");
        } catch (err) {
          content = "Impossible de lire le contenu";
        }
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>Erreur - Dossier dist non trouv\xE9</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
                h1 { color: #dc3545; }
                .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e9ecef; }
                code { background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                .path { background: #fff; padding: 10px; border-radius: 4px; border: 1px solid #dee2e6; font-family: monospace; }
              </style>
            </head>
            <body>
              <h1>\u26A0\uFE0F Erreur de configuration</h1>
              <p>Le dossier <code>dist</code> n'a pas \xE9t\xE9 trouv\xE9 sur le serveur.</p>
              
              <div class="card">
                <h3>\u{1F4C1} Informations de d\xE9bogage</h3>
                <p><strong>process.cwd():</strong></p>
                <div class="path">${process.cwd()}</div>
                <p><strong>__dirname:</strong></p>
                <div class="path">${__dirname}</div>
                <p><strong>Contenu de process.cwd():</strong></p>
                <div class="path">${content}</div>
                <p><strong>Chemins test\xE9s:</strong></p>
                <div class="path">${possiblePaths.join("<br>")}</div>
              </div>
              
              <div class="card">
                <h3>\u{1F527} Solutions possibles</h3>
                <ul>
                  <li>V\xE9rifiez que <code>npm run build</code> a \xE9t\xE9 ex\xE9cut\xE9</li>
                  <li>V\xE9rifiez que le dossier <code>dist</code> est pouss\xE9 sur GitHub</li>
                  <li>V\xE9rifiez la configuration de <code>nixpacks.toml</code></li>
                </ul>
              </div>
            </body>
          </html>
        `);
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] \u{1F680} Serveur e-commerce connect\xE9 sur le port ${PORT} (mode: ${isProduction ? "production" : "d\xE9veloppement"})`);
    console.log(`[INFO] \u{1F310} URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
