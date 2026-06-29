/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, ShieldCheck, ShoppingBag, Search, ChevronLeft, User } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  activeView: 'home' | 'details' | 'cart' | 'checkout' | 'admin';
  onNavigate: (view: 'home' | 'details' | 'cart' | 'checkout' | 'admin') => void;
  isAdminLoggedIn: boolean;
  onLogout: () => void;
  searchText: string;
  onSearchChange: (text: string) => void;
}

export default function Header({
  cartCount,
  activeView,
  onNavigate,
  isAdminLoggedIn,
  onLogout,
  searchText,
  onSearchChange,
}: HeaderProps) {
  return (
    <header id="app-header" className="sticky top-0 z-50 w-full border-b border-zinc-600 bg-gray-900/97 backdrop-blur-md shadow-lg shadow-black/30">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Title */}
        <div 
          className="flex cursor-pointer items-center space-x-3 transition active:scale-95"
          onClick={() => onNavigate('home')}
        >
          <img
            src="/logo.jpg"
            alt="Dallas Auto Logo"
            className="h-11 w-11 rounded-full object-cover ring-2 ring-red-600 shadow-md shadow-red-900/40"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-sans text-lg font-extrabold tracking-tight text-white">
              dallas <span className="text-red-500">auto</span>
            </span>
            <span className="font-sans text-[9px] tracking-widest text-zinc-300 uppercase font-semibold">
              Automotive Maintenance & Chiptuning
            </span>
          </div>
        </div>

        {/* Global Search Bar (Only shown on home grid or simple lookup) */}
        {activeView === 'home' && (
          <div className="relative hidden max-w-md flex-1 px-4 md:block">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="search-input-header"
                type="text"
                placeholder="Rechercher une pièce, référence ou marque..."
                className="w-full rounded-full border border-zinc-500 bg-zinc-600 py-2 pl-9 pr-4 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:ring-2 focus:ring-red-500 focus:border-red-500"
                value={searchText}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Action Widgets */}
        <nav className="flex items-center space-x-2 sm:space-x-4">
          
          {/* Back button if in other view */}
          {activeView !== 'home' && (
            <button
              id="back-to-store-btn"
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-1 rounded-xl px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 hover:text-white transition active:scale-95"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-300" />
              <span className="hidden sm:inline">Catalogue</span>
            </button>
          )}

          {/* Cart Trigger */}
          <button
            id="cart-navigation-btn"
            onClick={() => onNavigate('cart')}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition active:scale-95 ${
              activeView === 'cart'
                ? 'bg-red-600/20 text-red-400'
                : 'text-zinc-200 hover:bg-zinc-600 hover:text-white'
            }`}
            title="Mon Panier"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 font-sans text-[10px] font-bold text-white ring-2 ring-zinc-800">
                {cartCount}
              </span>
            )}
          </button>

          {/* Separation */}
          <span className="h-5 w-px bg-zinc-500" />

          {/* Admin Space Trigger */}
          {isAdminLoggedIn ? (
            <div className="flex items-center space-x-2">
              <button
                id="admin-dashboard-btn"
                onClick={() => onNavigate('admin')}
                className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                  activeView === 'admin'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-600 text-zinc-200 hover:bg-zinc-500'
                }`}
              >
                <ShieldCheck className="h-4 w-4 text-red-400" />
                <span className="hidden md:inline">Espace Admin</span>
              </button>
              <button
                id="admin-logout-btn"
                onClick={onLogout}
                className="rounded-xl p-1.5 text-xs text-zinc-400 hover:bg-zinc-600 hover:text-red-400 transition"
                title="Déconnexion Admin"
              >
                Quitter
              </button>
            </div>
          ) : (
            <button
              id="admin-login-trigger-btn"
              onClick={() => onNavigate('admin')}
              className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                activeView === 'admin'
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-600 text-zinc-200 hover:bg-zinc-500'
              }`}
            >
              <User className="h-4 w-4 text-zinc-300" />
              <span className="hidden sm:inline">Connexion Admin</span>
            </button>
          )}

        </nav>
      </div>
      
      {/* Mobile Search Bar (Only shown on home view) */}
      {activeView === 'home' && (
        <div className="block border-t border-zinc-600 px-4 py-2.5 md:hidden">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              id="search-input-header-mobile"
              type="text"
              placeholder="Rechercher une pièce, référence, OEM..."
              className="w-full rounded-full border border-zinc-500 bg-zinc-600 py-1.5 pl-9 pr-4 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:ring-2 focus:ring-red-500"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </header>
  );
}
