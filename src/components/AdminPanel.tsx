/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Customer, OrderWithDetails, OrderStatus, DashboardStats, PRODUCT_CATEGORIES } from '../types';
import { cacheHelper } from '../services/api';
import { 
  ShieldCheck, Lock, Mail, Loader, TrendingUp, ShoppingCart, 
  FileCheck, AlertTriangle, ListFilter, Users, Box, PlusCircle, 
  Trash2, RefreshCw, Eye, Edit2, X, Check, CheckSquare, Wrench, Search
} from 'lucide-react';

const normalizeWhatsAppNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return '';

  return trimmed.startsWith('+') ? `+${digitsOnly}` : digitsOnly;
};

interface AdminPanelProps {
  onLoginStateChange: (loggedIn: boolean) => void;
  productsList: Product[];
  onRefreshProducts: () => void;
}

export default function AdminPanel({ onLoginStateChange, productsList, onRefreshProducts }: AdminPanelProps) {
  // Session credentials
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Panel View tabs: 'orders' | 'products' | 'customers'
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'customers'>('orders');

  // Search states for each section
  const [searchOrders, setSearchOrders] = useState('');
  const [searchProducts, setSearchProducts] = useState('');
  const [searchCustomers, setSearchCustomers] = useState('');
  const [filterAdminCategory, setFilterAdminCategory] = useState('');

  // Relational aggregates
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Detailed modal triggers
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // Form coordinates to create/edit products
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pCarModel, setPCarModel] = useState('');
  const [pYear, setPYear] = useState('');
  const [pMotorisation, setPMotorisation] = useState('');
  const [pStock, setPStock] = useState('');
  const [pThreshold, setPThreshold] = useState('5');
  const [pImageUrl, setPImageUrl] = useState('');
  const [pCategory, setPCategory] = useState(PRODUCT_CATEGORIES[0]);
  const [extraComps, setExtraComps] = useState<{ brand: string; car_model: string; year: string | number; motorisation?: string }[]>([]);
  const [newCompBrand, setNewCompBrand] = useState('');
  const [newCompModel, setNewCompModel] = useState('');
  const [newCompYear, setNewCompYear] = useState('');
  const [newCompMotorisation, setNewCompMotorisation] = useState('');
  const [prodError, setProdError] = useState<string | null>(null);

  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappNumberError, setWhatsappNumberError] = useState('');
  const [whatsappNumberSaving, setWhatsappNumberSaving] = useState(false);
  const [whatsappNumberSuccess, setWhatsappNumberSuccess] = useState('');

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token]);

  const loadAdminData = async () => {
    try {
      setLoadingAction(true);
      const [fetchedStats, fetchedOrders, fetchedCustomers, fetchedWhatsAppNumber] = await Promise.all([
        cacheHelper.getAdminStats(),
        cacheHelper.getOrders(),
        cacheHelper.getCustomers(),
        cacheHelper.getWhatsAppNumber()
      ]);
      setStats(fetchedStats);
      setOrders(fetchedOrders);
      setCustomers(fetchedCustomers);
      setWhatsappNumber(normalizeWhatsAppNumber(fetchedWhatsAppNumber));
    } catch (err: any) {
      console.error(err);
      if (err.message.includes('expirée') || err.message.includes('authentification')) {
        handleLogout();
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setLoginErrorMsg("Tous les champs sont requis.");
      return;
    }
    setLoadingAction(true);
    setLoginErrorMsg(null);
    try {
      const response = await cacheHelper.login(email, password);
      localStorage.setItem('admin_token', response.token);
      setToken(response.token);
      onLoginStateChange(true);
    } catch (err: any) {
      setLoginErrorMsg(err.message || "Identifiants invalides.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    onLoginStateChange(false);
  };

  const handleWhatsAppNumberSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedValue = normalizeWhatsAppNumber(whatsappNumber);
    if (!normalizedValue) {
      setWhatsappNumberError('Le numéro WhatsApp ne peut pas être vide.');
      return;
    }

    try {
      setWhatsappNumberSaving(true);
      setWhatsappNumberError(null);
      setWhatsappNumberSuccess(null);
      const savedNumber = await cacheHelper.updateWhatsAppNumber(normalizedValue);
      setWhatsappNumber(savedNumber);
      setWhatsappNumberSuccess(`Numéro WhatsApp enregistré : ${savedNumber}`);
    } catch (err: any) {
      setWhatsappNumberError(err.message || 'Impossible d’enregistrer le numéro WhatsApp.');
    } finally {
      setWhatsappNumberSaving(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    try {
      const updated = await cacheHelper.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      // Refresh statistics and items stocks
      loadAdminData();
      onRefreshProducts();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      console.error("Erreur de modification du statut : ", err.message);
    }
  };

  const openAddProductModal = () => {
    setEditingProduct(null);
    setPName('');
    setPBrand('');
    setPPrice('');
    setPDescription('');
    setPCarModel('');
    setPYear('');
    setPMotorisation('');
    setPStock('');
    setPThreshold('5');
    setPImageUrl('');
    setPCategory(PRODUCT_CATEGORIES[0]);
    setExtraComps([]);
    setNewCompBrand('');
    setNewCompModel('');
    setNewCompYear('');
    setNewCompMotorisation('');
    setProdError(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPBrand(prod.brand);
    setPPrice(prod.price.toString());
    setPDescription(prod.description);
    setPCarModel(prod.car_model);
    setPYear(prod.year.toString());
    setPStock(prod.stock.toString());
    setPThreshold(prod.low_stock_threshold !== undefined ? prod.low_stock_threshold.toString() : '5');
    setPImageUrl(prod.image_url);
    setPCategory(prod.category || PRODUCT_CATEGORIES[0]);
    const comps: { brand: string; car_model: string; year: string | number; motorisation?: string }[] =
      prod.compatibilities && prod.compatibilities.length > 0
        ? prod.compatibilities
        : [{ brand: prod.brand, car_model: prod.car_model, year: prod.year, motorisation: prod.motorisation }];
    setPMotorisation(prod.motorisation || comps[0]?.motorisation || '');
    setExtraComps(comps.slice(1));
    setProdError(null);
    setIsProductModalOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    const prod = productsList.find(p => p.id === id);
    if (prod) {
      setProductToDelete(prod);
      setDeleteErrorMsg(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      setLoadingAction(true);
      await cacheHelper.deleteProduct(productToDelete.id);
      loadAdminData();
      onRefreshProducts();
      setProductToDelete(null);
    } catch (err: any) {
      setDeleteErrorMsg("Erreur lors de la suppression ou pièce liée à une commande : " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pBrand || !pPrice || !pCarModel || !pYear || !pStock) {
      setProdError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }

    const isValidYearSingle = (y: number) => !isNaN(y) && y >= 1900 && y <= 2030;
    const isValidYearOrRange = (val: string) => {
      const v = val.trim();
      if (v.includes('-')) {
        const parts = v.split('-');
        if (parts.length === 2) {
          const start = parseInt(parts[0].trim(), 10);
          const end = parseInt(parts[1].trim(), 10);
          return isValidYearSingle(start) && isValidYearSingle(end) && start <= end;
        }
        return false;
      }
      return isValidYearSingle(parseInt(v, 10));
    };

    if (!isValidYearOrRange(pYear)) {
      setProdError("L'année de modèle principale ou la plage d'années (ex: 2018 ou 2013-2018) est invalide (entre 1900 et 2030).");
      return;
    }

    const finalYear = pYear.trim().includes('-') ? pYear.trim() : parseInt(pYear.trim(), 10);

    const payload = {
      name: pName,
      brand: pBrand,
      price: parseFloat(pPrice),
      description: pDescription,
      car_model: pCarModel,
      year: finalYear,
      motorisation: pMotorisation || "Toutes motorisations",
      stock: parseInt(pStock, 10),
      low_stock_threshold: parseInt(pThreshold, 10),
      image_url: pImageUrl || "https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=600&auto=format&fit=crop",
      compatibilities: [
        { brand: pBrand, car_model: pCarModel, year: finalYear, motorisation: pMotorisation || "Toutes motorisations" },
        ...extraComps
      ],
      category: pCategory
    };

    if (isNaN(payload.price) || payload.price < 0) {
      setProdError("Le prix doit être un nombre positif.");
      return;
    }
    if (isNaN(payload.stock) || payload.stock < 0) {
      setProdError("La quantité de stock disponible doit être un nombre positif.");
      return;
    }
    if (isNaN(payload.low_stock_threshold as number) || (payload.low_stock_threshold as number) < 0) {
      setProdError("Le seuil d'alerte doit être un nombre positif.");
      return;
    }

    try {
      if (editingProduct) {
        await cacheHelper.updateProduct(editingProduct.id, payload);
      } else {
        await cacheHelper.createProduct(payload);
      }
      setIsProductModalOpen(false);
      loadAdminData();
      onRefreshProducts();
    } catch (err: any) {
      setProdError(err.message || "Erreur de sauvegarde de l'outil.");
    }
  };

  // --- Sub-View: Login Form Panel (Not Logged In) ---
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6 lg:py-24">
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-xl">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Espace Administrateur</h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Saisissez vos identifiants pour administrer les ventes, pièces et stocks.
            </p>
          </div>

          <form id="admin-login-form" onSubmit={handleLoginSubmit} className="space-y-5">
            {loginErrorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-150 p-4 text-xs text-red-850 font-semibold animate-fade-in">
                {loginErrorMsg}
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Identifiant E-mail
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  placeholder="admin@piecesauto.com"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Mot de passe de sécurité
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="admin-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={loadingAction}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white transition active:scale-95 cursor-pointer disabled:bg-slate-300"
            >
              {loadingAction ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Connexion au portail...</span>
                </>
              ) : (
                <span>Se connecter</span>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
              Identifiants par défaut : admin@piecesauto.com / admin123
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Admin Dashboard (Logged In) ---
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Top Welcome Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-slate-150 border-slate-100 gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl flex items-center gap-2.5">
            <ShieldCheck className="h-7 w-7 text-emerald-500" />
            Console Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pilotez les commandes clients, mettez à jour votre inventaire de pièces et gérez vos clients.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            id={`refresh-admin-data`}
            onClick={loadAdminData}
            disabled={loadingAction}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loadingAction ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            id="admin-logout-top-btn"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-red-250 bg-red-50 py-2 px-3.5 text-xs font-bold text-red-700 hover:bg-red-100 transition active:scale-95"
          >
            Fermer la session
          </button>
        </div>
      </div>

      {/* Bento Statistics Counts display */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          
          {/* Card 1: Sales */}
          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-450 font-bold text-slate-400 uppercase tracking-wider">Chiffre d'Affaires</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{stats.totalSales.toLocaleString('fr-FR')} DA</h3>
            </div>
          </div>

          {/* Card 2: Orders Count */}
          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-450 font-bold text-slate-400 uppercase tracking-wider">Toutes Commandes</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{stats.ordersCount}</h3>
            </div>
          </div>

          {/* Card 3: Pending */}
          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl animate-pulse">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-450 font-bold text-slate-400 uppercase tracking-wider">En attente (Pending)</p>
              <h3 className="text-xl font-black text-slate-900 mt-1 text-blue-600">{stats.pendingOrdersCount}</h3>
            </div>
          </div>

          {/* Card 4: Low Stocks */}
          <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-450 font-bold text-slate-400 uppercase tracking-wider">Stocks Critiques</p>
              <h3 className="text-xl font-black text-slate-900 mt-1 text-red-600">{stats.lowStockItemsCount}</h3>
            </div>
          </div>

        </div>
      )}

      {/* WhatsApp destination settings */}
      <div className="mb-8 rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Destination WhatsApp</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">Numéro de réception des commandes</h3>
            <p className="mt-1 text-sm text-slate-600">
              Les nouveaux messages de commande seront envoyés vers : <span className="font-mono font-semibold text-slate-900">{whatsappNumber}</span>
            </p>
          </div>

          <form onSubmit={handleWhatsAppNumberSave} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => {
                setWhatsappNumber(e.target.value);
                setWhatsappNumberError(null);
                setWhatsappNumberSuccess(null);
              }}
              placeholder="Ex. 213555123456"
              inputMode="tel"
              autoComplete="tel"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 sm:min-w-[240px]"
            />
            <button
              type="submit"
              disabled={whatsappNumberSaving}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {whatsappNumberSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </div>

        {whatsappNumberError && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {whatsappNumberError}
          </div>
        )}

        {whatsappNumberSuccess && (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {whatsappNumberSuccess}
          </div>
        )}
      </div>

      {/* Tabs Selector Navigation bar */}
      <div className="flex border-b border-slate-200/80 mb-6 gap-6">
        <button
          id="tab-orders"
          onClick={() => setActiveTab('orders')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListFilter className="h-4 w-4" />
          <span>Gestion des Commandes{orders.length > 0 ? ` (${orders.length})` : ''}</span>
        </button>

        <button
          id="tab-products"
          onClick={() => setActiveTab('products')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="h-4 w-4" />
          <span>Catalogue Pièces ({productsList.length})</span>
        </button>

        <button
          id="tab-customers"
          onClick={() => setActiveTab('customers')}
          className={`pb-4 px-2 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'customers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Registre Clients ({customers.length})</span>
        </button>
      </div>

      {loadingAction && (
        <div className="flex justify-center items-center py-10">
          <Loader className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* --- SUBVIEW 1: ORDERS TAB --- */}
      {!loadingAction && activeTab === 'orders' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Search Bar for Orders */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Rechercher par numéro de commande, client, téléphone..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchOrders}
              onChange={(e) => setSearchOrders(e.target.value)}
            />
          </div>

          {orders.length === 0 ? (
            <div className="text-center rounded-2xl border border-dashed border-slate-200 p-12 bg-white">
              <ShoppingCart className="mx-auto h-12 w-12 text-slate-350" />
              <h3 className="mt-4 text-sm font-bold text-slate-800">Aucune commande enregistrée</h3>
              <p className="mt-1 text-slate-500 text-xs">Le registre des commandes est actuellement vierge.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white">
              <table id="orders-table" className="min-w-full divide-y divide-slate-100 text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-4 sm:px-6">N° Commande</th>
                    <th className="py-4 px-4">Client</th>
                    <th className="py-4 px-4">Date d'enregistrement</th>
                    <th className="py-4 px-4">Montant total</th>
                    <th className="py-4 px-4">Statut actuel</th>
                    <th className="py-4 px-4 text-right sm:pr-6">Actions / Détail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-705">
                  {orders.filter(o => {
                    const searchTerm = searchOrders.toLowerCase();
                    return o.id.toString().includes(searchTerm) || 
                           o.customer.name.toLowerCase().includes(searchTerm) || 
                           o.customer.phone.includes(searchTerm);
                  }).map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 sm:px-6 font-bold text-slate-900">N° {o.id}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{o.customer.name}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-1">{o.customer.phone}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {new Date(o.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-4 px-4 font-black text-slate-900">{o.total_price.toLocaleString('fr-FR')} DA</td>
                      <td className="py-4 px-4">
                        {o.status === 'pending' && (
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700 uppercase tracking-widest text-[9px]">
                            En attente
                          </span>
                        )}
                        {o.status === 'confirmed' && (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 uppercase tracking-widest text-[9px]">
                            Confirmé
                          </span>
                        )}
                        {o.status === 'rejected' && (
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 uppercase tracking-widest text-[9px]">
                            Refusé
                          </span>
                        )}
                        {o.status === 'delivered' && (
                          <span className="inline-flex rounded-full bg-slate-150 bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 uppercase tracking-widest text-[9px]">
                            Livré
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 sm:pr-6 text-right space-x-1.5">
                        <button
                          id={`show-order-details-${o.id}`}
                          onClick={() => setSelectedOrder(o)}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100 font-bold py-1.5 px-3 text-xs text-slate-700 transition"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Détails</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- SUBVIEW 2: PRODUCTS CATALOGUE --- */}
      {!loadingAction && activeTab === 'products' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Search Bar + Category Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Rechercher par nom, référence, marque, modèle..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-red-400 focus:border-transparent"
                value={searchProducts}
                onChange={(e) => setSearchProducts(e.target.value)}
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-slate-400 shrink-0" />
              <select
                id="admin-category-filter"
                value={filterAdminCategory}
                onChange={(e) => setFilterAdminCategory(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-red-400 focus:border-transparent cursor-pointer"
              >
                <option value="">Toutes les catégories</option>
                {PRODUCT_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {filterAdminCategory && (
                <button
                  onClick={() => setFilterAdminCategory('')}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition"
                  title="Effacer le filtre"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Active filter badge */}
          {filterAdminCategory && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-700">
                <ListFilter className="h-3 w-3" />
                Catégorie : {filterAdminCategory}
                <button onClick={() => setFilterAdminCategory('')} className="ml-1 hover:text-red-900">&times;</button>
              </span>
            </div>
          )}

          <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Inventaire des pièces détachées automobiles
              {filterAdminCategory && (
                <span className="ml-2 text-red-600 normal-case font-normal text-xs">— {filterAdminCategory}</span>
              )}
            </h3>
            
            <button
               id="add-new-product-btn"
               onClick={openAddProductModal}
               className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 py-2 px-4 text-xs font-bold text-white shadow-sm transition active:scale-95"
             >
              <PlusCircle className="h-4 w-4" />
              <span>Ajouter une pièce</span>
            </button>
          </div>

          {/* ── Vue MOBILE : cards empilées ── */}
          <div className="block md:hidden space-y-3">
            {productsList.filter(p => {
              const searchTerm = searchProducts.toLowerCase();
              const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                p.brand.toLowerCase().includes(searchTerm) ||
                p.car_model.toLowerCase().includes(searchTerm) ||
                p.description.toLowerCase().includes(searchTerm);
              const matchesCategory = !filterAdminCategory || p.category === filterAdminCategory;
              return matchesSearch && matchesCategory;
            }).map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3 shadow-sm">
                <img src={p.image_url} alt={p.name} referrerPolicy="no-referrer" className="h-16 w-20 object-cover rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 text-sm truncate">{p.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">#{p.id}</span>
                    {p.category && (
                      <span className="bg-red-50 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">{p.category}</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-black text-slate-900">{p.price.toLocaleString('fr-FR')} DA</div>
                  <div className="mt-1">
                    {p.stock <= 0 ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full"><AlertTriangle className="h-2.5 w-2.5" />Rupture</span>
                    ) : p.stock <= (p.low_stock_threshold ?? 5) ? (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Critique ({p.stock})</span>
                    ) : (
                      <span className="inline-flex rounded-lg bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {p.stock} unités
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      id={`edit-prod-mobile-${p.id}`}
                      onClick={() => openEditProductModal(p)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold py-1.5 text-xs text-slate-700 transition"
                    >
                      <Edit2 className="h-3 w-3" />Éditer
                    </button>
                    <button
                      id={`delete-prod-mobile-${p.id}`}
                      onClick={() => handleDeleteProduct(p.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 font-bold py-1.5 text-xs text-red-700 transition"
                    >
                      <Trash2 className="h-3 w-3" />Supprimer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Vue DESKTOP/TABLETTE : tableau ── */}
          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-100 bg-white">
            <table id="products-inventory-table" className="min-w-full divide-y divide-slate-100 text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4 sm:px-6">Visuel</th>
                  <th className="py-4 px-4">Référence pièce</th>
                  <th className="py-4 px-4">Compatibilité</th>
                  <th className="py-4 px-4">Prix</th>
                  <th className="py-4 px-4">Stock</th>
                  <th className="py-4 px-4 text-right sm:pr-6">Opérations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {productsList.filter(p => {
                  const searchTerm = searchProducts.toLowerCase();
                  const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
                    p.brand.toLowerCase().includes(searchTerm) ||
                    p.car_model.toLowerCase().includes(searchTerm) ||
                    p.description.toLowerCase().includes(searchTerm);
                  const matchesCategory = !filterAdminCategory || p.category === filterAdminCategory;
                  return matchesSearch && matchesCategory;
                }).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <img src={p.image_url} alt={p.name} referrerPolicy="no-referrer" className="h-9 w-12 object-cover rounded-lg" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 leading-tight max-w-[200px] truncate">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-400">#{p.id}</span>
                        {p.category && (
                          <span className="bg-red-50 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{p.category}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {(() => {
                        const comps = p.compatibilities && p.compatibilities.length > 0
                          ? p.compatibilities
                          : [{ brand: p.brand, car_model: p.car_model, year: p.year }];
                        const main = comps[0];
                        const extra = comps.length - 1;
                        const labelStr = comps.map(c => `${c.brand} ${c.car_model} (${c.year})`).join(', ');
                        return (
                          <span 
                            className="font-semibold text-slate-700 cursor-help underline decoration-dotted decoration-slate-300 text-xs"
                            title={`Compatible avec : ${labelStr}`}
                          >
                            {main.brand} {main.car_model} ({main.year}){extra > 0 ? ` (+${extra})` : ''}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-4 font-black text-slate-900 whitespace-nowrap">
                      {p.price.toLocaleString('fr-FR')} DA
                    </td>
                    <td className="py-4 px-4">
                      {p.stock <= 0 ? (
                        <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                          <AlertTriangle className="h-3 w-3" />Rupture
                        </span>
                      ) : p.stock <= (p.low_stock_threshold ?? 5) ? (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                          Critique ({p.stock})
                        </span>
                      ) : (
                        <span className="inline-flex rounded-lg bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          {p.stock} unités
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 sm:pr-6 text-right whitespace-nowrap space-x-2">
                      <button
                        id={`edit-prod-${p.id}`}
                        onClick={() => openEditProductModal(p)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold py-1.5 px-3 text-xs text-slate-700 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Éditer</span>
                      </button>
                      <button
                        id={`delete-prod-${p.id}`}
                        onClick={() => handleDeleteProduct(p.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-50 hover:bg-red-100 font-bold py-1.5 px-3 text-xs text-red-700 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Supprimer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUBVIEW 3: CUSTOMERS DIRECTORY --- */}
      {!loadingAction && activeTab === 'customers' && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Search Bar for Customers */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, email, adresse..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchCustomers}
              onChange={(e) => setSearchCustomers(e.target.value)}
            />
          </div>

          {customers.length === 0 ? (
            <div className="text-center rounded-2xl border border-dashed border-slate-200 p-12 bg-white">
              <Users className="mx-auto h-12 w-12 text-slate-350" />
              <h3 className="mt-4 text-sm font-bold text-slate-800">Aucun client enregistré</h3>
              <p className="mt-1 text-slate-500 text-xs">Le registre des clients est actuellement vide.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white">
              <table id="customers-log-table" className="min-w-full divide-y divide-slate-100 text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 px-4 sm:px-6">Identifiant unique</th>
                    <th className="py-4 px-4">Date & Nom Client</th>
                    <th className="py-4 px-4">Téléphone</th>
                    <th className="py-4 px-4">E-mail de contact</th>
                    <th className="py-4 px-4">Adresse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {customers.filter(c => {
                    const searchTerm = searchCustomers.toLowerCase();
                    return c.name.toLowerCase().includes(searchTerm) ||
                           c.phone.includes(searchTerm) ||
                           c.email.toLowerCase().includes(searchTerm) ||
                           (c.address && c.address.toLowerCase().includes(searchTerm));
                  }).map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-4 sm:px-6 text-slate-400 font-mono font-bold">#US-{c.id}</td>
                      <td className="py-4 px-4 font-bold text-slate-800">{c.name}</td>
                      <td className="py-4 px-4 font-bold text-slate-900">{c.phone}</td>
                      <td className="py-4 px-4 font-mono text-slate-650">{c.email}</td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {c.address ? c.address : "Non fournie / Retrait boutique"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: ORDER DETAIL HUB (With status changing triggers) --- */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl animate-scale-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Détail Commande N°{selectedOrder.id}</h3>
                <span className="text-xs text-slate-500 font-medium">Reçu le : {new Date(selectedOrder.created_at).toLocaleString('fr-FR')}</span>
              </div>
              <button
                id="close-order-modal"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Inner Specs */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-6">
              
              {/* Client specifications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Coordonnées du Client</h4>
                <div className="grid grid-cols-2 gap-4 border border-slate-100 p-4 rounded-2xl bg-slate-50/50 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 block mb-1">Nom Complet :</span>
                    <strong className="font-bold text-slate-850 text-slate-800">{selectedOrder.customer.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">GSM Téléphone :</span>
                    <strong className="font-bold text-slate-850 text-slate-800">{selectedOrder.customer.phone}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block mb-1">Adresse E-mail :</span>
                    <strong className="font-mono text-slate-800">{selectedOrder.customer.email}</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block mb-1">Adresse :</span>
                    <strong className="text-slate-800">{selectedOrder.customer.address || "Non renseignée / Retrait magasin"}</strong>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Pièces Détachées Auto Commandées</h4>
                <div className="divide-y divide-slate-100 border-t border-b border-slate-100/80">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex py-3 justify-between items-center text-xs">
                      <div className="flex items-center space-x-3">
                        <img src={item.product_image_url} alt={item.product_name} className="h-8 w-11 object-cover rounded" />
                        <div>
                          <strong className="font-bold text-slate-805 text-slate-800 block leading-snug">{item.product_name}</strong>
                          <span className="text-slate-450 text-slate-400 text-[10px] block mt-0.5">ID: #{item.product_id} • Qté: x{item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-black text-slate-900">{(item.price * item.quantity).toLocaleString('fr-FR')} DA</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Row */}
              <div className="flex justify-between items-baseline bg-slate-50 p-4 rounded-xl border border-slate-205">
                <span className="text-xs font-bold text-slate-500 border-none">Prix final de la commande :</span>
                <span className="text-xl font-black text-blue-600">{selectedOrder.total_price.toLocaleString('fr-FR')} DA</span>
              </div>

              {/* Status Updater segment */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">Changer le statut de la commande</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    id="status-btn-pending"
                    onClick={() => handleStatusChange(selectedOrder.id, 'pending')}
                    className={`font-semibold text-xs py-2.5 rounded-xl border transition ${
                      selectedOrder.status === 'pending'
                        ? 'bg-blue-105 border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    En Attente
                  </button>

                  <button
                    id="status-btn-confirmed"
                    onClick={() => handleStatusChange(selectedOrder.id, 'confirmed')}
                    className={`font-semibold text-xs py-2.5 rounded-xl border transition ${
                      selectedOrder.status === 'confirmed'
                        ? 'bg-emerald-105 border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Confirmer
                  </button>

                  <button
                    id="status-btn-delivered"
                    onClick={() => handleStatusChange(selectedOrder.id, 'delivered')}
                    className={`font-semibold text-xs py-2.5 rounded-xl border transition ${
                      selectedOrder.status === 'delivered'
                        ? 'bg-slate-105 border-slate-700 bg-slate-100 text-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Livré
                  </button>

                  <button
                    id="status-btn-rejected"
                    onClick={() => handleStatusChange(selectedOrder.id, 'rejected')}
                    className={`font-semibold text-xs py-2.5 rounded-xl border transition ${
                      selectedOrder.status === 'rejected'
                        ? 'bg-red-105 border-red-500 bg-red-50 text-red-750 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Annu./Refusé
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50/50 py-4 px-6 text-right border-t border-slate-100">
              <button
                id="close-order-modal-bottom"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 bg-white py-2 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL 2: ADD OR EDIT PRODUCT SHEET --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form 
            id="product-form-modal"
            onSubmit={handleSaveProduct} 
            className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-xl animate-scale-up"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50">
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {editingProduct ? `Éditer la pièce #${editingProduct.id}` : 'Ajouter une pièce automobile'}
              </h3>
              <button
                id="close-prod-modal"
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Form inputs */}
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-4 text-xs sm:text-sm">
              
              {prodError && (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-800 font-medium animate-fade-in">
                  {prodError}
                </div>
              )}

              {/* Row 1 */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Nom de la pièce *</label>
                <input
                  id="prod-input-name"
                  type="text"
                  required
                  placeholder="Ex: Plaquettes de frein avant Brembo"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                />
              </div>

              {/* Group selection Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Groupe principal (Catégorie) *</label>
                <select
                  id="prod-input-category"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm bg-white cursor-pointer"
                  value={pCategory}
                  onChange={(e) => setPCategory(e.target.value)}
                >
                  {PRODUCT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Row 2: Brand & Car Model & Motorisation */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Marque constructeur *</label>
                  <input
                    id="prod-input-brand"
                    type="text"
                    required
                    placeholder="Ex: Peugeot, Renault, BMW"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                    value={pBrand}
                    onChange={(e) => setPBrand(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Modèle Véhicule *</label>
                  <input
                    id="prod-input-carmodel"
                    type="text"
                    required
                    placeholder="Ex: Clio IV, 208, GOLF VII"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                    value={pCarModel}
                    onChange={(e) => setPCarModel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Motorisation Principale</label>
                  <input
                    id="prod-input-motorisation"
                    type="text"
                    placeholder="Ex: 1.6 tdi, 150ch, All"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                    value={pMotorisation}
                    onChange={(e) => setPMotorisation(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Compatible Year & Stock & Price */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Année ou plage *</label>
                  <input
                    id="prod-input-year"
                    type="text"
                    required
                    placeholder="Ex: 2018 ou 2013-2018"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                    value={pYear}
                    onChange={(e) => setPYear(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Stock *</label>
                    <input
                      id="prod-input-stock"
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide" title="Quantité en dessous de laquelle l'alerte de stock critique s'affiche">Seuil Alerte</label>
                    <input
                      id="prod-input-threshold"
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all shadow-sm"
                      value={pThreshold}
                      onChange={(e) => setPThreshold(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Prix (DA) *</label>
                  <input
                    id="prod-input-price"
                    type="number"
                    step="0.01"
                    required
                    placeholder="45.99"
                    min="0"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Section: Compatibilités supplémentaires */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <Wrench className="h-3.5 w-3.5 text-blue-500" />
                  <span>Compatibilités de véhicules supplémentaires ({extraComps.length})</span>
                </h4>

                {/* List of current "extra" compatibilities */}
                {extraComps.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {extraComps.map((c, index) => (
                      <div key={index} className="flex justify-between items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs shadow-xs">
                        <div>
                          <span className="font-bold text-slate-900">{c.brand}</span> {c.car_model} {c.motorisation && <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded font-semibold text-[10px] ml-1 mr-1">{c.motorisation}</span>} <span className="text-slate-400">({c.year})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtraComps(prev => prev.filter((_, i) => i !== index))}
                          className="text-red-500 hover:text-red-700 font-bold px-1 py-0.5 rounded transition hover:bg-red-50 text-[10px]"
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Aucun autre véhicule compatible configuré. Utilisez le formulaire ci-dessous pour en ajouter.</p>
                )}

                {/* Form to add another compatibility */}
                <div className="grid grid-cols-4 gap-2 items-end bg-white border border-slate-200 p-2.5 rounded-lg shadow-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Constructeur</label>
                    <input
                      type="text"
                      placeholder="Ex: Renault"
                      value={newCompBrand}
                      onChange={(e) => setNewCompBrand(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 py-1 px-1.5 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Modèle</label>
                    <input
                      type="text"
                      placeholder="Ex: Megane"
                      value={newCompModel}
                      onChange={(e) => setNewCompModel(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 py-1 px-1.5 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Motorisation</label>
                    <input
                      type="text"
                      placeholder="Ex: 2.0 HDi"
                      value={newCompMotorisation}
                      onChange={(e) => setNewCompMotorisation(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 py-1 px-1.5 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Année (ex: 2013-2018)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ex: 2017 ou 2013-2020"
                        value={newCompYear}
                        onChange={(e) => setNewCompYear(e.target.value)}
                        className="mt-1 w-full rounded border border-slate-200 py-1 px-1.5 outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const brandVal = newCompBrand.trim();
                          const modelVal = newCompModel.trim();
                          const yearInputStr = newCompYear.trim();
                          const motorVal = newCompMotorisation.trim() || "Toutes motorisations";
                          
                          if (!brandVal || !modelVal || !yearInputStr) {
                            setProdError("Veuillez remplir au moins le constructeur, le modèle et l'année pour ajouter une nouvelle compatibilité.");
                            return;
                          }

                          const isValidYearSingle = (y: number) => !isNaN(y) && y >= 1900 && y <= 2030;
                          const isValidYearOrRange = (val: string) => {
                            const v = val.trim();
                            if (v.includes('-')) {
                              const parts = v.split('-');
                              if (parts.length === 2) {
                                const start = parseInt(parts[0].trim(), 10);
                                const end = parseInt(parts[1].trim(), 10);
                                return isValidYearSingle(start) && isValidYearSingle(end) && start <= end;
                              }
                              return false;
                            }
                            return isValidYearSingle(parseInt(v, 10));
                          };

                          if (!isValidYearOrRange(yearInputStr)) {
                            setProdError("L'année additionnelle (ex: 2015 ou 2013-2018) est invalide (entre 1900 et 2030).");
                            return;
                          }

                          const finalYearVal = yearInputStr.includes('-') ? yearInputStr : parseInt(yearInputStr, 10);

                          setExtraComps(prev => [...prev, {
                            brand: brandVal,
                            car_model: modelVal,
                            year: finalYearVal,
                            motorisation: motorVal
                          }]);
                          // Clear fields using state setter
                          setNewCompBrand('');
                          setNewCompModel('');
                          setNewCompYear('');
                          setNewCompMotorisation('');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1 rounded transition text-xs flex items-center justify-center cursor-pointer"
                        title="Ajouter ce véhicule"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product description content field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide font-sans">Description complète de la pièce</label>
                <textarea
                  id="prod-input-description"
                  placeholder="Écrivez les informations d'origine comme OEM, dimension, matériel..."
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 py-2 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 resize-none text-xs sm:text-sm"
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                />
              </div>

              {/* Image url */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide font-sans">URL de l'image de la pièce</label>
                <input
                  id="prod-input-img"
                  type="url"
                  placeholder="https://images.unsplash.com/... (laisser vide pour l'image par défaut)"
                  className="mt-1.5 w-full rounded-xl border border-slate-200 py-2.5 px-3 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 text-xs sm:text-sm"
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                />
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 bg-slate-50 py-4 px-6 border-t border-slate-100">
              <button
                id="cancel-prod-modal"
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white py-2 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                id="save-prod-modal"
                type="submit"
                className="rounded-lg bg-blue-600 hover:bg-blue-700 py-2 px-5 text-xs font-bold text-white shadow-sm transition active:scale-95"
              >
                Enregistrer la pièce
              </button>
            </div>

          </form>
        </div>
      )}

      {/* --- MODAL 3: CONFIRM DELETE PRODUCT --- */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-up border border-slate-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-rose-100 px-6 py-5 bg-rose-50/50">
              <h3 className="text-base font-extrabold text-red-700 leading-tight flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                <span>Confirmer la suppression</span>
              </h3>
              <button
                id="close-delete-modal"
                type="button"
                onClick={() => setProductToDelete(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4">
              {deleteErrorMsg && (
                <div className="rounded-lg bg-red-50 border border-red-150 p-3 text-sm font-medium text-red-700">
                  {deleteErrorMsg}
                </div>
              )}

              <p className="text-xs sm:text-sm leading-relaxed text-slate-600">
                Êtes-vous sûr de vouloir supprimer définitivement cette pièce automobile ? Cette action est irréversible.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex gap-3.5 items-center">
                <img 
                  src={productToDelete.image_url} 
                  alt={productToDelete.name} 
                  className="h-12 w-16 object-cover rounded border border-slate-200 bg-white" 
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{productToDelete.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                    Constructeur : {productToDelete.brand} {productToDelete.car_model} ({productToDelete.year})
                    {productToDelete.compatibilities && productToDelete.compatibilities.length > 1 ? ` (+${productToDelete.compatibilities.length - 1})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 bg-slate-50 py-4 px-6 border-t border-slate-100">
              <button
                id="cancel-delete-modal-btn"
                type="button"
                onClick={() => setProductToDelete(null)}
                className="rounded-lg border border-slate-200 bg-white py-2 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                id="confirm-delete-modal-btn"
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-red-600 hover:bg-red-700 py-2 px-5 text-xs font-bold text-white shadow-sm transition active:scale-95"
              >
                Supprimer la pièce
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
