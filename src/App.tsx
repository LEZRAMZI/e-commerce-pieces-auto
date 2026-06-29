/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header.tsx';
import ProductCard from './components/ProductCard.tsx';
import ProductDetails from './components/ProductDetails.tsx';
import CartView from './components/CartView.tsx';
import CheckoutView from './components/CheckoutView.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import { Product, PRODUCT_CATEGORIES } from './types';
import { cacheHelper } from './services/api';
import { Search, RotateCcw, ShieldCheck, HelpCircle, Car, Wrench, Sparkles, ListFilter } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

function matchesYear(selectedYear: string, compYear: number | string): boolean {
  if (!selectedYear) return true;
  if (!compYear) return false;

  const targetStr = selectedYear.toString().trim();
  const compatStr = compYear.toString().trim();

  if (targetStr === compatStr) return true;

  if (compatStr.includes('-')) {
    const parts = compatStr.split('-');
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
}

export default function App() {
  // Global States
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // View states: 'home' | 'details' | 'cart' | 'checkout' | 'admin'
  const [activeView, setActiveView] = useState<'home' | 'details' | 'cart' | 'checkout' | 'admin'>('home');
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Authentication status
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(!!localStorage.getItem('admin_token'));
  
  // Universal filters
  const [searchText, setSearchText] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedMotorisation, setSelectedMotorisation] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Initial products retrieval
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await cacheHelper.getProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products: ", err);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique brands, models (based on brand), and years for dropdown configurations from all compatibilities
  const uniqueBrands = Array.from(
    new Set(
      products.flatMap(p => 
        p.compatibilities && p.compatibilities.length > 0 
          ? p.compatibilities.map(c => c.brand) 
          : [p.brand]
      )
    )
  ).sort();
  
  const uniqueModels = Array.from(
    new Set(
      products.flatMap(p => {
        const comps = p.compatibilities && p.compatibilities.length > 0
          ? p.compatibilities
          : [{ brand: p.brand, car_model: p.car_model, year: p.year }];
        
        return comps
          .filter(c => !selectedBrand || c.brand.toLowerCase() === selectedBrand.toLowerCase())
          .map(c => c.car_model);
      })
    )
  ).sort();

  const uniqueMotorisations = Array.from(
    new Set(
      products.flatMap(p => {
        const comps = p.compatibilities && p.compatibilities.length > 0
          ? p.compatibilities
          : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
        
        return comps
          .filter(c => !selectedBrand || c.brand.toLowerCase() === selectedBrand.toLowerCase())
          .filter(c => !selectedModel || c.car_model.toLowerCase() === selectedModel.toLowerCase())
          .map(c => c.motorisation || 'Toutes motorisations');
      })
    )
  ).sort();

  const uniqueYears = Array.from(
    new Set(
      products.flatMap(p => {
        const comps = p.compatibilities && p.compatibilities.length > 0
          ? p.compatibilities
          : [{ brand: p.brand, car_model: p.car_model, year: p.year, motorisation: p.motorisation }];
        
        return comps
          .filter(c => !selectedBrand || c.brand.toLowerCase() === selectedBrand.toLowerCase())
          .filter(c => !selectedModel || c.car_model.toLowerCase() === selectedModel.toLowerCase())
          .filter(c => {
            if (!selectedMotorisation) return true;
            const m = c.motorisation || 'Toutes motorisations';
            return m.toLowerCase() === selectedMotorisation.toLowerCase();
          })
          .flatMap(c => {
            const yearStr = c.year?.toString().trim() || '';
            if (yearStr.includes('-')) {
              const parts = yearStr.split('-');
              if (parts.length === 2) {
                const start = parseInt(parts[0].trim(), 10);
                const end = parseInt(parts[1].trim(), 10);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                  const years: number[] = [];
                  for (let y = start; y <= end; y++) {
                    years.push(y);
                  }
                  return years;
                }
              }
            }
            const yNum = parseInt(yearStr, 10);
            return !isNaN(yNum) ? [yNum] : [];
          });
      })
    )
  ).sort((a: any, b: any) => parseInt(b, 10) - parseInt(a, 10)); // descending order

  // Filter products in memory based on selected compatibilities plus text search
  const filteredProducts = products.filter(product => {
    // Category selection check
    if (selectedCategory && product.category !== selectedCategory) {
      return false;
    }

    const comps = product.compatibilities && product.compatibilities.length > 0
      ? product.compatibilities
      : [{ brand: product.brand, car_model: product.car_model, year: product.year, motorisation: product.motorisation }];

    // We must find AT LEAST one compatibility item that matches all active selectors
    const hasMatchingComp = comps.some(c => {
      const matchBrand = !selectedBrand || c.brand.toLowerCase() === selectedBrand.toLowerCase();
      const matchModel = !selectedModel || c.car_model.toLowerCase() === selectedModel.toLowerCase();
      
      const compMotor = c.motorisation || 'Toutes motorisations';
      const matchMotor = !selectedMotorisation || 
          selectedMotorisation === 'Toutes motorisations' || 
          compMotor.toLowerCase() === selectedMotorisation.toLowerCase();

      const matchYear = !selectedYear || matchesYear(selectedYear, c.year);
      return matchBrand && matchModel && matchMotor && matchYear;
    });

    if (!hasMatchingComp) {
      return false;
    }

    // Case-insensitive Text query
    if (searchText) {
      const term = searchText.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(term);
      const matchesDesc = product.description.toLowerCase().includes(term);
      
      const matchesAnyCompText = comps.some(c => 
        c.brand.toLowerCase().includes(term) || 
        c.car_model.toLowerCase().includes(term) ||
        c.year.toString().includes(term)
      );

      return matchesName || matchesDesc || matchesAnyCompText;
    }

    return true;
  });

  // Reset all vehicle compatibility selectors
  const handleClearFilters = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedMotorisation('');
    setSelectedYear('');
    setSearchText('');
    setSelectedCategory('');
  };

  // Cart Management functions
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (product.stock <= 0) return;

    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: nextQty } : item);
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
  };

  const handleUpdateCartQuantity = (productId: number, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const boundedQty = Math.max(1, Math.min(product.stock, quantity));

    setCartItems(prev => 
      prev.map(item => item.product.id === productId ? { ...item, quantity: boundedQty } : item)
    );
  };

  const handleRemoveCartItem = (productId: number) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  // Action triggered once customer checks out successfully
  const handleCheckoutSuccess = () => {
    setCartItems([]); // flush cart
  };

  // Total amount of pieces in cart
  const cartPiecesCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      
      {/* Header element */}
      <Header
        cartCount={cartPiecesCount}
        activeView={activeView}
        searchText={searchText}
        onSearchChange={setSearchText}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogout={() => {
          localStorage.removeItem('admin_token');
          setIsAdminLoggedIn(false);
          setActiveView('home');
        }}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== 'details') {
            setSelectedProduct(null);
          }
        }}
      />

      <main className="flex-grow">
        
        {/* --- VIEW 1: STORE FRONT HOME GRID --- */}
        {activeView === 'home' && (
          <div className="animate-fade-in">
            
            {/* High Premium Hero Showcase Banner */}
            <section className="relative overflow-hidden bg-gray-900 py-16 text-white px-4 sm:px-6 lg:px-8 border-b border-zinc-600">
              
              {/* Backglow decor circles */}
              <div className="absolute right-0 top-0 -mr-20 -mt-20 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />
              <div className="absolute left-0 bottom-0 -ml-20 -mb-20 h-96 w-96 rounded-full bg-red-700/10 blur-3xl" />

              <div className="relative mx-auto max-w-7xl text-center">
                
                {/* Logo hero */}
                <div className="flex justify-center mb-6">
                  <img
                    src="/logo.jpg"
                    alt="Dallas Auto"
                    className="h-28 w-28 rounded-full ring-4 ring-red-600/40 shadow-2xl shadow-red-900/60 animate-pulse-slow"
                  />
                </div>

                <h1 className="mt-4 text-3xl font-black sm:text-5xl tracking-tight leading-none bg-gradient-to-r from-white via-red-100 to-red-400 bg-clip-text text-transparent">
                  Trouvez la Pièce Auto Exacte
                </h1>
                
                <p className="mx-auto mt-4 max-w-2xl text-zinc-300 text-sm sm:text-base leading-relaxed">
                  Recherchez et filtrez parmi notre catalogue complet de pièces par marque, modèle et année de mise en circulation. Achetez et payez directement au retrait.
                </p>

                {/* Compatibility search widgets console */}
                <div id="compatibility-search-bar" className="mx-auto mt-10 max-w-4xl rounded-2xl md:rounded-3xl border border-zinc-600 bg-zinc-700/90 p-5 md:p-6 shadow-2xl backdrop-blur-md">
                  
                  <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-zinc-300 mb-4 pb-2 border-b border-zinc-600">
                    <Car className="h-4 w-4 text-red-500" />
                    <span>Sélectionnez votre véhicule pour vérifier la compatibilité</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-neutral-100 text-sm">
                    
                    {/* Brand dropdown */}
                    <div className="flex flex-col text-left">
                      <label htmlFor="brand-select" className="text-[10px] font-bold text-zinc-300 uppercase mb-1.5 tracking-wider">Constructeur</label>
                      <select
                        id="brand-select"
                        className="w-full rounded-xl border border-zinc-500 bg-zinc-600 py-3 px-3 text-xs sm:text-sm text-neutral-100 outline-none transition focus:border-red-500"
                        value={selectedBrand}
                        onChange={(e) => {
                          setSelectedBrand(e.target.value);
                          setSelectedModel('');
                          setSelectedMotorisation('');
                          setSelectedYear('');
                        }}
                      >
                        <option value="">Tous les constructeurs</option>
                        {uniqueBrands.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    {/* Model dropdown (Reactively disabled if brand is not selected) */}
                    <div className="flex flex-col text-left">
                      <label htmlFor="model-select" className="text-[10px] font-bold text-zinc-300 uppercase mb-1.5 tracking-wider">Modèle de voiture</label>
                      <select
                        id="model-select"
                        disabled={!selectedBrand}
                        className="w-full rounded-xl border border-zinc-500 bg-zinc-600 py-3 px-3 text-xs sm:text-sm text-neutral-100 outline-none transition focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          setSelectedMotorisation('');
                          setSelectedYear('');
                        }}
                      >
                        <option value="">Sélectionner le modèle</option>
                        {uniqueModels.map(m => (
                          <option key={m} value={m}>{selectedBrand} {m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Motorisation selection dropdown (Disabled if model is not selected) */}
                    <div className="flex flex-col text-left">
                      <label htmlFor="motorisation-select" className="text-[10px] font-bold text-zinc-300 uppercase mb-1.5 tracking-wider">Motorisation</label>
                      <select
                        id="motorisation-select"
                        disabled={!selectedModel}
                        className="w-full rounded-xl border border-zinc-500 bg-zinc-600 py-3 px-3 text-xs sm:text-sm text-neutral-100 outline-none transition focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        value={selectedMotorisation}
                        onChange={(e) => {
                          setSelectedMotorisation(e.target.value);
                          setSelectedYear('');
                        }}
                      >
                        <option value="">Sélectionner la motorisation</option>
                        {uniqueMotorisations.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year selection dropdown (Disabled if model is not selected) */}
                    <div className="flex flex-col text-left">
                      <label htmlFor="year-select" className="text-[10px] font-bold text-zinc-300 uppercase mb-1.5 tracking-wider">Année</label>
                      <select
                        id="year-select"
                        disabled={!selectedModel}
                        className="w-full rounded-xl border border-zinc-500 bg-zinc-600 py-3 px-3 text-xs sm:text-sm text-neutral-100 outline-none transition focus:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                      >
                        <option value="">Sélectionner l'année</option>
                        {uniqueYears.map(y => (
                          <option key={y} value={y.toString()}>{y}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter action keys */}
                    <div className="flex items-end gap-2 md:col-span-1">
                      <button
                        id="reset-filters-btn"
                        onClick={handleClearFilters}
                        disabled={!selectedBrand && !searchText}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-500 bg-zinc-600 hover:bg-zinc-500 text-zinc-200 py-3 text-xs font-bold transition active:scale-95 disabled:opacity-20 cursor-pointer"
                        title="Réinitialiser la recherche"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="md:hidden lg:inline">Effacer</span>
                      </button>
                    </div>

                  </div>

                </div>

              </div>
            </section>

            {/* Sélection de Groupe Principal (Category selector) */}
            <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center space-x-2 text-gray-900 mb-6 border-b border-gray-100 pb-3">
                  <ListFilter className="h-5 w-5 text-red-600" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                    SÉLECTION DE GROUPE PRINCIPAL (CATÉGORIES)
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {PRODUCT_CATEGORIES.map(cat => {
                    const isSelected = selectedCategory === cat;
                    const num = cat.charAt(0);
                    const label = cat.substring(2);

                    return (
                      <button
                        key={cat}
                        id={`category-filter-btn-${num}`}
                        onClick={() => setSelectedCategory(isSelected ? '' : cat)}
                        className={`flex flex-col items-start p-4 rounded-2xl border text-left transition relative overflow-hidden group cursor-pointer ${
                          isSelected
                            ? 'border-red-500 bg-red-50 shadow-sm ring-1 ring-red-400/30'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {/* Big abstract numbers in background */}
                        <span className={`absolute -right-2 -bottom-2 text-6xl font-black select-none tracking-tighter opacity-[0.05] transition group-hover:scale-110 ${
                          isSelected ? 'text-red-500' : 'text-gray-900'
                        }`}>
                          {num}
                        </span>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`flex items-center justify-center h-6 w-6 rounded-lg text-xs font-black transition ${
                            isSelected ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {num}
                          </span>
                        </div>
                        
                        <span className={`font-bold text-xs tracking-tight uppercase leading-snug transition line-clamp-2 ${
                          isSelected ? 'text-red-700' : 'text-gray-600 group-hover:text-gray-900'
                        }`}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {selectedCategory && (
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Afficher toutes les pièces</span>
                      <span>&times;</span>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Core Catalogue Parts Grid Row */}
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
              
              {/* Results status header */}
              <div className="flex flex-col justify-between sm:flex-row items-baseline border-b border-gray-200 pb-5 mb-8 gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                    {selectedBrand ? `Pièces compatibles : ${selectedBrand} ${selectedModel} ${selectedMotorisation ? `- ${selectedMotorisation}` : ''} ${selectedYear ? `(${selectedYear})` : ''}` : "Catalogue complet des pièces disponibles"}
                  </h2>
                  <span className="text-xs text-gray-400 font-medium">Affichage de {filteredProducts.length} référence{filteredProducts.length > 1 ? 's' : ''} auto</span>
                </div>

                {/* Compatibility active badge */}
                {(selectedBrand || selectedModel || selectedMotorisation || selectedYear) && (
                  <div className="flex items-center space-x-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-semibold text-red-700">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Filtre d'ajustement compatible actif</span>
                  </div>
                )}
              </div>

              {/* Loader */}
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <LoaderSpinner className="h-8 w-8 text-red-500" />
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Chargement des pièces détachées d'origine...</span>
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center bg-white border border-dashed border-gray-200 rounded-3xl p-16">
                  <Search className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-sm font-bold text-gray-800">Aucune pièce automobile trouvée</h3>
                  <p className="mt-2 text-xs text-gray-500 max-w-md mx-auto">
                    Nous n'avons trouvé aucune référence correspondant à votre véhicule ou vos termes de recherche. Veuillez essayer d'ajuster les critères ou effacer les filtres constructeurs.
                  </p>
                  <button
                    id="clear-all-filter-grid-btn"
                    onClick={handleClearFilters}
                    className="mt-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 text-xs transition active:scale-95"
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
                  {filteredProducts.map((product) => {
                    const CardComponent = ProductCard as any;
                    return (
                      <CardComponent
                        key={product.id}
                        product={product}
                        onAddToCart={(prod: any) => {
                          handleAddToCart(prod, 1);
                        }}
                        onViewDetails={(prod: any) => {
                          setSelectedProduct(prod);
                          setActiveView('details');
                        }}
                      />
                    );
                  })}
                </div>
              )}

            </section>
          </div>
        )}

        {/* --- VIEW 2: PRODUCT EXTENSIVE DETAILS --- */}
        {activeView === 'details' && selectedProduct && (
          <ProductDetails
            product={selectedProduct}
            onAddToCart={handleAddToCart}
            onBackToCatalogue={() => {
              setSelectedProduct(null);
              setActiveView('home');
            }}
          />
        )}

        {/* --- VIEW 3: MY SHOPPING CART --- */}
        {activeView === 'cart' && (
          <CartView
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onNavigate={setActiveView}
          />
        )}

        {/* --- VIEW 4: GUEST ORDER CHECKOUT --- */}
        {activeView === 'checkout' && (
          <CheckoutView
            cartItems={cartItems}
            onOrderSuccess={handleCheckoutSuccess}
            onNavigate={setActiveView}
          />
        )}

        {/* --- VIEW 5: ADMINISTRATOR BACKEND SECURED DASHPORT --- */}
        {activeView === 'admin' && (
          <AdminPanel
            productsList={products}
            onRefreshProducts={loadProducts}
            onLoginStateChange={(loggedIn) => {
              setIsAdminLoggedIn(loggedIn);
            }}
          />
        )}

      </main>

      {/* Unified professional footer design */}
      <footer className="border-t border-zinc-600 bg-gray-900 py-10 text-xs text-zinc-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <img src="/logo.jpg" alt="Dallas Auto" className="h-8 w-8 rounded-full ring-1 ring-red-700" />
            <div className="flex flex-col">
              <span className="font-sans font-bold tracking-tight text-white">dallas <span className="text-red-500">auto</span></span>
              <span className="font-mono text-[9px] tracking-wider uppercase font-semibold text-zinc-400">Automotive Maintenance & Chiptuning</span>
            </div>
          </div>
          <p className="text-center md:text-right text-zinc-400">
            &copy; {new Date().getFullYear()} Dallas Auto. Tous droits réservés. Vente professionnelle de pièces automobiles avec retrait local.
          </p>
        </div>
      </footer>

    </div>
  );
}

// Small helper loader component
function LoaderSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
