/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product } from '../types';
import { ShoppingCart, Eye, Car } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <article 
      id={`product-card-${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      {/* Compatibility Banner */}
      {(() => {
        const comps = product.compatibilities && product.compatibilities.length > 0
          ? product.compatibilities
          : [{ brand: product.brand, car_model: product.car_model, year: product.year }];
        const mainComp = comps[0];
        const moreCount = comps.length - 1;
        const allCompatibilitiesStr = comps.map(c => `${c.brand} ${c.car_model} (${c.year})`).join(', ');

        return (
          <div 
            className="absolute top-2.5 left-2.5 z-10 flex items-center space-x-1 rounded-md bg-black/75 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm cursor-help max-w-[60%] truncate"
            title={`Compatible avec : ${allCompatibilitiesStr}`}
          >
            <Car className="h-2.5 w-2.5 text-red-400 shrink-0" />
            <span className="truncate">
              {mainComp.brand} {mainComp.car_model}{moreCount > 0 ? ` +${moreCount}` : ''}
            </span>
          </div>
        );
      })()}

      {/* Stock Indicator Badge */}
      <div className="absolute top-2.5 right-2.5 z-10">
        {isOutOfStock ? (
          <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">
            Rupture
          </span>
        ) : isLowStock ? (
          <span className="inline-flex rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white animate-pulse">
            Faible ({product.stock})
          </span>
        ) : (
          <span className="inline-flex rounded-md bg-green-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            En Stock
          </span>
        )}
      </div>

      {/* Product Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        <img
          src={product.image_url}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Product Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex-1">
          {/* Brand label */}
          <p className="text-[10px] font-bold tracking-wider text-red-600 uppercase mb-1 truncate">
            {product.brand || "PIÈCE D'ORIGINE"}
          </p>
          
          {/* Product Name */}
          <h3 
            onClick={() => onViewDetails(product)}
            className="line-clamp-2 cursor-pointer text-sm font-bold tracking-tight text-gray-800 hover:text-red-600 transition leading-snug min-h-[2.5rem]"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-400 hidden sm:block">
            {product.description || "Aucune description fournie."}
          </p>

          {/* Compatibility chips */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Car className="h-3 w-3 text-red-400" />
              <span>Véhicules compatibles</span>
            </p>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {(() => {
                const comps = product.compatibilities && product.compatibilities.length > 0
                  ? product.compatibilities
                  : [{ brand: product.brand, car_model: product.car_model, year: product.year, motorisation: product.motorisation }];
                return comps.slice(0, 3).map((comp, idx) => {
                  const bName = comp.brand?.trim() || product.brand?.trim();
                  const mName = comp.car_model?.trim() || product.car_model?.trim();
                  if (!bName && !mName) return null;
                  return (
                    <span 
                      key={idx} 
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[9px] sm:text-[10px] font-semibold border border-gray-200"
                    >
                      {bName} {mName} ({comp.year || product.year})
                    </span>
                  );
                });
              })()}
              {(() => {
                const comps = product.compatibilities && product.compatibilities.length > 0
                  ? product.compatibilities : [];
                return comps.length > 3 ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[9px] sm:text-[10px] font-bold border border-red-100">
                    +{comps.length - 3} autres
                  </span>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Price & Actions */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-base sm:text-lg font-black text-gray-900">
              {product.price.toLocaleString('fr-FR')} DA
            </span>
            <span className="text-[10px] text-gray-400">Prix unitaire</span>
          </div>

          <div className="flex gap-2">
            <button
              id={`view-details-${product.id}`}
              onClick={() => onViewDetails(product)}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-2 sm:py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 active:scale-95"
            >
              <Eye className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Détails</span>
            </button>

            <button
              id={`add-to-cart-${product.id}`}
              onClick={() => onAddToCart(product)}
              disabled={isOutOfStock}
              className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 sm:py-2.5 text-xs font-bold text-white transition active:scale-95 ${
                isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">Acheter</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
