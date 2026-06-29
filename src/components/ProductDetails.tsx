/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Product } from '../types';
import { ShoppingCart, Check, X, ShieldAlert, BadgeCheck, ArrowLeft, Fuel } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  onBackToCatalogue: () => void;
}

export default function ProductDetails({ product, onAddToCart, onBackToCatalogue }: ProductDetailsProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddWithQty = () => {
    if (quantity > 0 && quantity <= product.stock) {
      onAddToCart(product, quantity);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Navigate Back Header */}
      <button
        id="back-btn-product-details"
        onClick={onBackToCatalogue}
        className="group flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Retour au catalogue</span>
      </button>

      {/* Main Details Panel Layout */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid lg:grid-cols-2 lg:gap-x-8">
        
        {/* Left Side: Solid product imagery */}
        <div className="relative aspect-square w-full bg-slate-50 lg:h-full">
          <img
            src={product.image_url}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />
          

        </div>

        {/* Right Side: Informational Specifications */}
        <div className="flex flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          
          {/* Header Metadata */}
          <div className="border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700 uppercase">
                {product.brand}
              </span>
              {product.category && (
                <span className="rounded bg-slate-100 px-3 py-1 text-xs font-bold tracking-wide text-slate-700 uppercase">
                  {product.category}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {product.name}
            </h1>
            <p className="mt-4 text-3xl font-black text-slate-900">
              {product.price.toLocaleString('fr-FR')} DA
            </p>
          </div>

          {/* Description Section */}
          <div className="py-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Description de la pièce
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {product.description || "Ce produit est une pièce détachée auto rigoureusement certifiée conforme aux normes d'origine. Elle apporte une durabilité maximale et des performances comparables à l'équipement d'usine."}
            </p>
          </div>

          {/* Vehicular Compatibility Section */}
          <div className="py-6 border-b border-slate-200 bg-slate-50/50 -mx-4 px-4 rounded my-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-3">
              <Fuel className="h-4 w-4 text-blue-500" />
              Véhicules compatibles ({product.compatibilities && product.compatibilities.length > 0 ? product.compatibilities.length : 1})
            </h3>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
               {(product.compatibilities && product.compatibilities.length > 0
                ? product.compatibilities
                : [{ brand: product.brand, car_model: product.car_model, year: product.year, motorisation: product.motorisation }]
              ).map((comp, idx) => {
                const bName = comp.brand?.trim() || product.brand?.trim();
                const mName = comp.car_model?.trim() || product.car_model?.trim();
                const motor = comp.motorisation?.trim() || product.motorisation?.trim();
                return (
                  <div key={idx} className="flex justify-between items-center bg-white px-3 py-2.5 rounded-lg border border-slate-150 text-xs shadow-xs transition hover:border-slate-250">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] uppercase">
                        {bName}
                      </span>
                      <span className="font-semibold text-slate-800">{mName}</span>
                      {motor && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded uppercase">
                          {motor}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 font-medium text-[11px]">Année : {comp.year || product.year}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stock, Quantity Adjustments, and Cart Button */}
          <div className="mt-6 flex-1 flex flex-col justify-end">
            
            {/* Stock Level Warning */}
            <div className="flex items-center space-x-2 text-sm mb-4">
              {isOutOfStock ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-650">Rupture de stock temporaire. Réapprovisionnement en cours.</span>
                </>
              ) : isLowStock ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-500 animate-bounce" />
                  <span className="font-semibold text-amber-700">Stock très limité ! Seulement {product.stock} pièce{product.stock > 1 ? 's' : ''} restante{product.stock > 1 ? 's' : ''}.</span>
                </>
              ) : (
                <>
                  <BadgeCheck className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600">En stock. Disponible pour livraison immédiate.</span>
                </>
              )}
            </div>

            {/* Quantity Selector + Add to Cart Button Block */}
            {!isOutOfStock && (
              <div className="flex flex-col sm:flex-row gap-4">
                
                {/* Quantity adjustments counter */}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-36">
                  <button
                    id="decrement-qty-btn"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    -
                  </button>
                  <span className="font-sans font-bold text-slate-850 text-sm px-2">{quantity}</span>
                  <button
                    id="increment-qty-btn"
                    onClick={handleIncrement}
                    disabled={quantity >= product.stock}
                    className="flex h-10 w-10 items-center justify-center rounded text-slate-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
                  >
                    +
                  </button>
                </div>

                {/* Confirm buy button */}
                <button
                  id="add-to-cart-qty-btn"
                  onClick={handleAddWithQty}
                  className="flex-1 flex items-center justify-center space-x-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 shadow-lg shadow-blue-100 transition active:scale-95"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Ajouter au panier • {(product.price * quantity).toLocaleString('fr-FR')} DA</span>
                </button>
              </div>
            )}

            {/* In-app success alert banner */}
            {successMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-800 animate-fade-in">
                <Check className="h-4 w-4 text-emerald-550" />
                <span>Pièce ajoutée avec succès au panier ({quantity} exemplaire{quantity > 1 ? 's' : ''}) !</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
