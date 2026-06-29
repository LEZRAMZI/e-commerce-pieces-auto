/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { Trash2, ArrowRight, ShoppingBag, Plus, Minus, ArrowLeft } from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

interface CartViewProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onNavigate: (view: 'home' | 'details' | 'cart' | 'checkout' | 'admin') => void;
}

export default function CartView({ cartItems, onUpdateQuantity, onRemoveItem, onNavigate }: CartViewProps) {
  const isCartEmpty = cartItems.length === 0;

  // Calculate shopping cart totals
  const totalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  if (isCartEmpty) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:py-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
          <ShoppingBag className="h-8 w-8 text-slate-350" />
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900">Votre panier est vide</h2>
        <p className="mt-2 text-sm text-slate-500">
          Vous n'avez pas encore ajouté de pièces détachées automobiles à votre panier d'achats.
        </p>
        <div className="mt-8 flex justify-center">
          <button
            id="empty-cart-back-btn"
            onClick={() => onNavigate('home')}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 shadow-md transition active:scale-95"
          >
            Découvrir nos pièces auto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        Mon Panier d'Achat
      </h1>

      <div className="mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12">
        {/* Item List Row (Takes 7 of 12 cols on desktop) */}
        <section className="lg:col-span-7">
          <ul id="cart-items-list" className="divide-y divide-slate-100 border-t border-b border-slate-100">
            {cartItems.map((item) => {
              const product = item.product;
              return (
                <li key={product.id} className="flex py-6">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-50 border border-slate-100">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover object-center"
                    />
                  </div>

                  {/* Description Box */}
                  <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                    <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                      <div>
                        {/* Name */}
                        <h4 className="text-sm font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer">
                          {product.name}
                        </h4>
                        
                        {/* Compatibility */}
                        <p className="mt-1 font-mono text-[11px] text-slate-500 font-semibold uppercase">
                          {(() => {
                            const comps = product.compatibilities && product.compatibilities.length > 0
                              ? product.compatibilities
                              : [{ brand: product.brand, car_model: product.car_model, year: product.year }];
                            const main = comps[0];
                            const extra = comps.length - 1;
                            return `${main.brand} ${main.car_model} (${main.year})${extra > 0 ? ` (+${extra})` : ''}`;
                          })()}
                        </p>
                        
                        {/* Unit Price */}
                        <p className="mt-1.5 text-xs text-slate-400">
                          Prix unitaire : {product.price.toLocaleString('fr-FR')} DA
                        </p>
                      </div>

                      {/* Adjust Quantity Section */}
                      <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                          {/* Decreter */}
                          <button
                            id={`qty-decrease-${product.id}`}
                            onClick={() => onUpdateQuantity(product.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-white disabled:opacity-20 transition"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          
                          {/* Value */}
                          <span className="w-8 text-center text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          
                          {/* Incremeter */}
                          <button
                            id={`qty-increase-${product.id}`}
                            onClick={() => onUpdateQuantity(product.id, item.quantity + 1)}
                            disabled={item.quantity >= product.stock}
                            className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-white disabled:opacity-20 transition"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Removal Basket button */}
                        <button
                          id={`cart-remove-${product.id}`}
                          onClick={() => onRemoveItem(product.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Retirer la pièce"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline mt-4 sm:mt-0 border-t border-slate-50/50 pt-2 sm:border-0 sm:pt-0">
                      <span className="text-xs text-slate-400 sm:hidden">Sous-total :</span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {(product.price * item.quantity).toLocaleString('fr-FR')} DA
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Pricing Summary Side Box (Takes 5 of 12 cols) */}
        <section className="mt-16 rounded-xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8 lg:col-span-5 lg:mt-0">
          <h3 className="text-lg font-bold text-slate-900">Récapitulatif</h3>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-sm text-slate-500">Nombre de pièces</span>
              <span className="text-sm font-semibold text-slate-800">
                {cartItems.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <span className="text-sm text-slate-500">Livraison</span>
              <span className="text-xs font-bold text-emerald-650 bg-emerald-50 px-2 py-0.5 rounded">
                Validation & retrait en magasin (Gratuit)
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-bold text-slate-900">Total à régler</span>
              <span className="text-2xl font-black text-slate-900">
                {totalAmount.toLocaleString('fr-FR')} DA
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {/* Proceed key button */}
            <button
              id="proceed-checkout-btn"
              onClick={() => onNavigate('checkout')}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition active:scale-95"
            >
              <span>Valider ma commande</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Back button */}
            <button
              id="continue-shopping-btn"
              onClick={() => onNavigate('home')}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Continuer mes achats</span>
            </button>
          </div>

          <div className="mt-4 rounded bg-blue-50 border border-blue-150 p-3 text-[11px] leading-relaxed text-blue-800">
            <strong>ℹ️ Information :</strong> Cet e-commerce ne requiert aucun paiement en ligne. Votre commande sera validée manuellement par l’administrateur avant votre retrait.
          </div>
        </section>
      </div>
    </div>
  );
}
