/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { dbInstance } from './backend/db';
import { handleLogin, requireAdmin, AuthenticatedRequest } from './backend/auth';
import fs from 'fs';

// --------------------------------------------------------
// PRODUCTION SAFETY CHECKS
// --------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
  const weakSecrets = ['pieces-auto-expert-secret-key-2026', 'secret', 'changeme', ''];
  if (!process.env.JWT_SECRET || weakSecrets.includes(process.env.JWT_SECRET)) {
    console.error('[ERREUR CRITIQUE] JWT_SECRET manquant ou trop faible en production. Veuillez définir une valeur forte via les variables d\'environnement.');
    process.exit(1);
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'admin123') {
    console.error('[ERREUR CRITIQUE] ADMIN_PASSWORD manquant ou trop faible en production. Veuillez définir un mot de passe fort via les variables d\'environnement.');
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
    console.warn('[ATTENTION] GEMINI_API_KEY non configurée ou encore sur la valeur placeholder.');
  }
}

const normalizeWhatsAppNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  return trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
};

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '8080', 10);
  const isProduction = process.env.NODE_ENV === 'production';

  // --------------------------------------------------------
  // MIDDLEWARES GLOBAUX
  // --------------------------------------------------------

  // ✅ Configuration CORS corrigée pour Railway
  const allowedOrigins = isProduction
    ? [
        process.env.APP_URL,
        'https://e-commerce-pieces-auto-production.up.railway.app',
        'https://*.up.railway.app'
      ].filter(Boolean) as string[]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'https://*.up.railway.app'];

  app.use(cors({
    origin: (origin, callback) => {
      // Autoriser les requêtes sans origine (appels serveur-à-serveur, curl, etc.)
      if (!origin) return callback(null, true);
      
      // En production, autoriser les origines spécifiques
      if (isProduction) {
        // Vérifier si l'origine est dans la liste autorisée
        const isAllowed = allowedOrigins.some(allowed => {
          // Support des wildcards comme *.up.railway.app
          if (allowed && allowed.includes('*')) {
            const pattern = allowed.replace(/\*/g, '.*');
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
        console.warn(`[CORS] Origine bloquée: ${origin}`);
        return callback(new Error(`CORS bloqué pour l'origine : ${origin}`));
      }
      
      // En développement, tout autoriser
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Middleware pour parser le JSON
  app.use(express.json());

  // --------------------------------------------------------
  // RATE LIMITING
  // --------------------------------------------------------

  // Limiteur strict sur le login (anti-brute force)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 tentatives max par 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' },
  });

  // Limiteur général sur toute l'API (anti-spam)
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,             // 120 requêtes par minute par IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Trop de requêtes. Veuillez patienter.' },
  });

  app.use('/api/', apiLimiter);

  // --------------------------------------------------------
  // API ENDPOINTS
  // --------------------------------------------------------

  // Health check (utile pour les plateformes cloud : Railway, Fly.io, etc.)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public/Secure Auth
  app.post('/api/auth/login', loginLimiter, handleLogin);

  // --- SETTINGS ---
  app.get('/api/settings/whatsapp-number', async (req, res) => {
    try {
      const whatsappNumber = await dbInstance.getWhatsAppNumber();
      res.json({ whatsappNumber });
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la récupération du numéro WhatsApp.", details: err.message });
    }
  });

  app.put('/api/settings/whatsapp-number', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { whatsappNumber } = req.body;
      if (typeof whatsappNumber !== 'string' || whatsappNumber.trim().length === 0) {
        return res.status(400).json({ error: 'Le numéro WhatsApp est requis.' });
      }

      const normalized = normalizeWhatsAppNumber(whatsappNumber);
      if (!normalized) {
        return res.status(400).json({ error: 'Le numéro WhatsApp est invalide.' });
      }

      const savedNumber = await dbInstance.updateWhatsAppNumber(normalized);
      res.json({ whatsappNumber: savedNumber });
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la mise à jour du numéro WhatsApp.", details: err.message });
    }
  });

  // --- PRODUCTS ---
  // GET all products with filtering + pagination options
  app.get('/api/products', async (req, res) => {
    try {
      const { brand, model, year, q, category, page, limit } = req.query;
      let products = await dbInstance.getProducts();

      // Case-insensitive filtering
      if (brand) {
        products = products.filter(p => p.brand.toLowerCase() === (brand as string).toLowerCase());
      }
      if (model) {
        products = products.filter(p => p.car_model.toLowerCase() === (model as string).toLowerCase());
      }
      if (category) {
        products = products.filter(p => p.category === (category as string));
      }
      if (year) {
        const targetStr = (year as string).trim();
        products = products.filter(p => {
          const comps = p.compatibilities && p.compatibilities.length > 0
            ? p.compatibilities
            : [{ brand: p.brand, car_model: p.car_model, year: p.year }];
          return comps.some(c => {
            const compStr = c.year?.toString().trim();
            if (!compStr) return false;
            if (compStr === targetStr) return true;
            if (compStr.includes('-')) {
              const parts = compStr.split('-');
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
        const term = (q as string).toLowerCase();
        products = products.filter(p => 
          p.name.toLowerCase().includes(term) || 
          p.description.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term) ||
          p.car_model.toLowerCase().includes(term)
        );
      }

      // Pagination (optionnelle — si `page` et `limit` ne sont pas fournis, retourne tout)
      const totalCount = products.length;
      if (page !== undefined && limit !== undefined) {
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        products = products.slice(offset, offset + limitNum);
        return res.json({
          data: products,
          pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum),
          },
        });
      }

      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la récupération des produits.", details: err.message });
    }
  });

  // GET a single product
  app.get('/api/products/:id', async (req, res) => {
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
    } catch (err: any) {
      res.status(500).json({ error: "Erreur serveur.", details: err.message });
    }
  });

  // POST create a product (Admin only)
  app.post('/api/products', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, brand, price, description, car_model, year, stock, image_url, compatibilities, motorisation, category, low_stock_threshold } = req.body;
 
      // Basic validation
      if (!name || price === undefined || stock === undefined) {
        return res.status(400).json({ error: "Données de produit incomplètes." });
      }
 
      const parseYearValue = (val: any): string | number => {
        if (!val) return 2020;
        const sVal = val.toString().trim();
        if (sVal.includes('-')) {
          return sVal;
        }
        const num = parseInt(sVal, 10);
        return isNaN(num) ? 2020 : num;
      };
 
      const parsedBrand = brand || (compatibilities && compatibilities[0]?.brand) || "Générique";
      const parsedModel = car_model || (compatibilities && compatibilities[0]?.car_model) || "Tous modèles";
      const parsedYear = parseYearValue(year !== undefined ? year : (compatibilities && compatibilities[0]?.year));
      const parsedMotorisation = motorisation || (compatibilities && compatibilities[0]?.motorisation) || "Toutes motorisations";
 
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
        low_stock_threshold: low_stock_threshold !== undefined ? parseInt(low_stock_threshold, 10) : 5
      });

      res.status(201).json(newProduct);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la création du produit.", details: err.message });
    }
  });

  // PUT update a product (Admin only)
  app.put('/api/products/:id', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de produit invalide." });
      }

      const updated = await dbInstance.updateProduct(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Produit non trouvé pour la mise à jour." });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la mise à jour du produit.", details: err.message });
    }
  });

  // DELETE a product (Admin only)
  app.delete('/api/products/:id', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de produit invalide." });
      }

      const success = await dbInstance.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ error: "Produit non trouvé ou déjà supprimé." });
      }

      res.json({ message: "Produit supprimé avec succès." });
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de la suppression.", details: err.message });
    }
  });

  // --- ORDERS ---
  // POST customer orders checkout (Public client checkout)
  app.post('/api/orders', async (req, res) => {
    try {
      const { customer, items } = req.body;

      if (!customer || !customer.name || !customer.phone || !customer.email) {
        return res.status(400).json({ error: "Informations de contact du client manquantes ou incomplètes (Nom, téléphone gsm et e-mail requis)." });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Le panier est vide. Impossible de valider la commande." });
      }

      // Format items properly
      const formattedItems = items.map((item: any) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10)
      })).filter((item: any) => !isNaN(item.product_id) && !isNaN(item.quantity) && item.quantity > 0);

      if (formattedItems.length === 0) {
        return res.status(400).json({ error: "Éléments du panier invalides." });
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

      if ('error' in result) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({
        message: "Commande enregistrée avec succès. Elle est en attente de traitement.",
        order: result
      });
    } catch (err: any) {
      res.status(500).json({ error: "Erreur lors de l'enregistrement de la commande.", details: err.message });
    }
  });

  // GET all orders with optional pagination (Admin only)
  app.get('/api/orders', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const { page, limit } = req.query;
      let orders = await dbInstance.getOrdersWithDetails();

      const totalCount = orders.length;
      if (page !== undefined && limit !== undefined) {
        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
        const offset = (pageNum - 1) * limitNum;
        orders = orders.slice(offset, offset + limitNum);
        return res.json({
          data: orders,
          pagination: {
            total: totalCount,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalCount / limitNum),
          },
        });
      }

      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur de récupération des commandes.", details: err.message });
    }
  });

  // GET single order details (Admin only or public lookup if correct ID)
  app.get('/api/orders/:id', async (req, res) => {
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
    } catch (err: any) {
      res.status(500).json({ error: "Serveur erreur.", details: err.message });
    }
  });

  // PUT update order status (Admin only)
  app.put('/api/orders/:id', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "ID de commande invalide." });
      }

      const { status } = req.body;
      if (!status || !['pending', 'confirmed', 'rejected', 'delivered'].includes(status)) {
        return res.status(400).json({ error: "Statut de commande requis et invalide." });
      }

      const updated = await dbInstance.updateOrderStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: "Commande introuvable pour la mise à jour." });
      }

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur de mise à jour de la commande.", details: err.message });
    }
  });

  // --- CUSTOMERS ---
  // POST find or create customer (Admin or public helper)
  app.post('/api/customers', async (req, res) => {
    try {
      const { name, phone, email, address } = req.body;
      if (!name || !phone || !email) {
        return res.status(400).json({ error: "Nom, téléphone et email sont obligatoires." });
      }
      const customer = await dbInstance.findOrCreateCustomer(name, phone, email, address);
      res.status(201).json(customer);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur.", details: err.message });
    }
  });

  // GET all customers (Admin only)
  app.get('/api/customers', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const customers = await dbInstance.getCustomers();
      res.json(customers);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur.", details: err.message });
    }
  });

  // --- DASHBOARD ADMIN STATISTICS ---
  // GET admin dashboard stats (Admin only)
  app.get('/api/admin/stats', requireAdmin as any, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await dbInstance.getDashboardStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: "Erreur d'agrégation des statistiques.", details: err.message });
    }
  });

  // --------------------------------------------------------
  // INTEGRATION DE VITE / FRONTEND SERVING
  // --------------------------------------------------------
  if (!isProduction) {
    // Mode développement : utiliser Vite
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // ✅ CORRECTION : Mode production - servir les fichiers statiques
    const distPath = path.join(__dirname, 'dist');
    console.log(`[INFO] Servant les fichiers statiques depuis: ${distPath}`);
    console.log(`[INFO] Dossier dist existe? ${fs.existsSync(distPath)}`);
    
    if (fs.existsSync(distPath)) {
      // Servir les fichiers statiques du dossier dist
      app.use(express.static(distPath));
      
      // Servir spécifiquement le dossier assets
      app.use('/assets', express.static(path.join(distPath, 'assets')));
      
      // ✅ SPA Fallback - DOIT être après toutes les routes API
      app.get('*', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        console.log(`[INFO] SPA Fallback: ${req.path} -> ${indexPath}`);
        res.sendFile(indexPath);
      });
    } else {
      console.error(`[ERREUR] Le dossier dist n'existe pas à ${distPath}`);
      app.get('*', (req, res) => {
        res.status(500).send('Erreur: Le dossier dist n\'existe pas. Veuillez construire l\'application avec "npm run build".');
      });
    }
  }

  // Démarrer le serveur
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OK] Serveur e-commerce connecté sur le port ${PORT} (mode: ${isProduction ? 'production' : 'développement'})`);
    console.log(`[INFO] URL: ${process.env.APP_URL || `http://localhost:${PORT}`}`);
  });
}

startServer();