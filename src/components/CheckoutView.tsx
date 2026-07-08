/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Product, OrderWithDetails } from '../types';
import { cacheHelper } from '../services/api';
import { ShoppingBag, CheckCircle, Smartphone, User, Mail, MapPin, Loader, FileText } from 'lucide-react';

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

interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutViewProps {
  cartItems: CartItem[];
  onOrderSuccess: () => void; // Clears the cart on parent
  onNavigate: (view: 'home' | 'details' | 'cart' | 'checkout' | 'admin') => void;
}

export default function CheckoutView({ cartItems, onOrderSuccess, onNavigate }: CheckoutViewProps) {
  // Form coordinates
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Execution states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<OrderWithDetails | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('213555123456');

  const totalAmount = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  useEffect(() => {
    let isMounted = true;
    const loadWhatsAppNumber = async () => {
      try {
        const number = await cacheHelper.getWhatsAppNumber();
        if (isMounted) {
          setWhatsappNumber(normalizeWhatsAppNumber(number));
        }
      } catch (err) {
        console.error('Impossible de charger le numéro WhatsApp', err);
      }
    };

    void loadWhatsAppNumber();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setErrorMsg('Veuillez remplir tous les champs obligatoires (Nom, Téléphone et E-mail).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const itemsPayload = cartItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }));

    try {
      const response = await cacheHelper.createOrder({
        customer: { name, phone, email, address },
        items: itemsPayload
      });

      setCreatedOrder(response.order);
      onOrderSuccess(); // empty cart
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur de validation de la commande.");
    } finally {
      setLoading(false);
    }
  };

  // Precompose the French message block for WhatsApp
  const generateWhatsAppUrl = (order: OrderWithDetails, targetNumber: string) => {
    const header = `Bonjour, je souhaite commander sur dallas auto pieces (Commande N°${order.id}) :\n`;
    
    const itemsList = order.items.map(item => 
      `- ${item.product_name} x${item.quantity} (${(item.price * item.quantity).toLocaleString('fr-FR')} DA)`
    ).join('\n');

    const totalSection = `\n\nTotal global : ${order.total_price.toLocaleString('fr-FR')} DA`;
    const contactInfo = `\n\nCoordonnées du client :\n- Nom : ${order.customer.name}\n- Tél : ${order.customer.phone}\n- Adresse : ${order.customer.address || 'Retrait direct'}`;

    const rawMessage = `${header}${itemsList}${totalSection}${contactInfo}`;
    const encodedMessage = encodeURIComponent(rawMessage);

    return `https://wa.me/${targetNumber}?text=${encodedMessage}`;
  };

  // Screen 2: Successful purchase transaction and Receipt details
  if (createdOrder) {
    const targetNumbers = whatsappNumber.split(',').map(n => n.trim()).filter(Boolean);

    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 sm:p-10 shadow-lg text-center animate-fade-in">
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 mb-6">
            <CheckCircle className="h-8 w-8" />
          </div>

          <p className="font-mono text-xs font-bold tracking-wider text-emerald-600 uppercase">
            Validation réussie
          </p>
          
          <h2 className="mt-2 text-2xl font-black text-slate-9 tracking-tight text-slate-800">
            Merci pour votre commande !
          </h2>
          
          <p className="mt-3 text-sm leading-relaxed text-slate-500 max-w-md mx-auto">
            Votre commande numéro <strong className="text-slate-800">N°{createdOrder.id}</strong> a été enregistrée avec succès sous le statut <strong>"En attente"</strong>. Notre équipe va la valider sous peu.
          </p>

          {/* Receipt Details Box */}
          <div className="mt-8 text-left rounded-lg bg-slate-50 p-5 sm:p-6 border border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Récapitulatif de votre commande
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Client :</span>
                <span className="font-bold text-slate-800">{createdOrder.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Téléphone de contact :</span>
                <span className="font-bold text-slate-800">{createdOrder.customer.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-slate-500">E-mail :</span>
                <span className="font-mono text-slate-800">{createdOrder.customer.email}</span>
              </div>

              {createdOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-slate-600 py-1">
                  <span>{item.product_name} <strong className="text-slate-800">x{item.quantity}</strong></span>
                  <span className="font-semibold text-slate-800">{(item.price * item.quantity).toLocaleString('fr-FR')} DA</span>
                </div>
              ))}

              <div className="flex justify-between pt-3 border-t border-slate-200/60 font-sans text-sm font-extrabold text-slate-900">
                <span>Montant total :</span>
                <span className="text-base text-blue-600 font-black">{createdOrder.total_price.toLocaleString('fr-FR')} DA</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Action Button */}
          <div className="mt-8 space-y-3">
            {targetNumbers.map((num, i) => (
              <a
                key={num}
                id={`whatsapp-confirm-order-link-${i}`}
                href={generateWhatsAppUrl(createdOrder, num)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-md shadow-emerald-100 transition active:scale-95"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>Envoyer sur WhatsApp {targetNumbers.length > 1 ? i + 1 : ''}</span>
              </a>
            ))}

            <button
              id="back-home"
              onClick={() => onNavigate('home')}
              className="flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Retourner au site e-commerce
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 1: Form capture
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      
      <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
        Finaliser ma commande
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Veuillez remplir vos coordonnées pour enregistrer votre demande de pièces détachées (Aucun paiement requis en ligne).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-10 lg:grid-cols-12">
        
        {/* Form panel */}
        <div className="lg:col-span-7">
          <form id="checkout-customer-form" onSubmit={handleSubmitOrder} className="space-y-6">
            
            {/* Display error message if any */}
            {errorMsg && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-xs text-red-800 animate-fade-in font-medium">
                {errorMsg}
              </div>
            )}

            {/* Item 1: Name */}
            <div>
              <label htmlFor="customer-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Nom complet *
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="customer-name"
                  type="text"
                  required
                  placeholder="Jean Dupont ou Sofiane..."
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* Item 2: Phone */}
            <div>
              <label htmlFor="customer-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Numéro de téléphone portable GSM *
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Smartphone className="h-4 w-4" />
                </div>
                <input
                  id="customer-phone"
                  type="tel"
                  required
                  placeholder="Ex: +213 555 12 34 56"
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Item 3: Email */}
            <div>
              <label htmlFor="customer-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                E-mail *
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="customer-email"
                  type="email"
                  required
                  placeholder="jean.dupont@example.com"
                  className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Item 4: Address */}
            <div>
              <label htmlFor="customer-address" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Adresse de livraison / Retrait (Optionnel)
              </label>
              <div className="relative mt-1.5 rounded-xl shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <MapPin className="h-4 w-4" />
                </div>
                <textarea
                  id="customer-address"
                  placeholder="Ex: 12 Rue de la Paix, Paris ou Alger Centre..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 resize-none"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>

            {/* Submition Button with loader */}
            <button
              id="confirm-checkout-btn"
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 py-3 text-sm font-bold text-white shadow-md shadow-blue-100 transition active:scale-95 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Validation en cours...</span>
                </>
              ) : (
                <span>Confirmer ma commande • {totalAmount.toLocaleString('fr-FR')} DA</span>
              )}
            </button>
          </form>
        </div>

        {/* Sticky side Recaptulative */}
        <div id="sticky-checkout-summary" className="lg:col-span-5">
          <div className="sticky top-24 rounded-xl border border-slate-200 bg-slate-50/70 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-blue-500" />
              Dans votre panier
            </h3>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {cartItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-3.5">
                  <div className="mr-4">
                    <span className="font-bold text-slate-800 block line-clamp-1">{item.product.name} {item.product.reference ? `(${item.product.reference})` : ''}</span>
                    <span className="text-slate-400 block mt-0.5">
                      {(() => {
                        const comps = item.product.compatibilities && item.product.compatibilities.length > 0
                          ? item.product.compatibilities
                          : [{ brand: item.product.brand, car_model: item.product.car_model, year: item.product.year }];
                        const main = comps[0];
                        const extra = comps.length - 1;
                        return `${main.brand} ${main.car_model} (${main.year})${extra > 0 ? ` (+${extra})` : ''}`;
                      })()} • Qté: {item.quantity}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-800 text-right">
                    {(item.product.price * item.quantity).toLocaleString('fr-FR')} DA
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200/60 pt-4 mt-2">
              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Total à régler :</span>
                <span className="text-lg text-blue-600 font-black">{totalAmount.toLocaleString('fr-FR')} DA</span>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-slate-400 leading-relaxed text-center">
              * Mode de paiement : Pas de transaction bancaire en ligne. Retrait ou validation manuelle de la commande.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
