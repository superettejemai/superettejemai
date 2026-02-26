"use client";
import React from 'react';
import { FiX, FiPackage } from 'react-icons/fi';

interface Product {
  product_id: number;
  product_name: string;
  product_category: string;
  product_barcode: string;
  total_quantity: number;
  total_revenue: number;
  avg_price: number;
  total_profit: number;
  cashierName?: string; // Optional if you add it later
  saleDate?: string; // Optional if you add it later
}

interface ProductsSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function ProductsSoldModal({ isOpen, onClose, products, period }: ProductsSoldModalProps) {
  if (!isOpen) return null;

  // Safely calculate totals with default values
  const totalQuantity = products.reduce((sum, product) => sum + (product.total_quantity || 0), 0);
  const totalRevenue = products.reduce((sum, product) => sum + (product.total_revenue || 0), 0);
  const totalProfit = products.reduce((sum, product) => sum + (product.total_profit || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white shadow-xl w-full max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <FiPackage className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Produits Vendus
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Period Info */}
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-base text-gray-600">
              Période: {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
            </p>
            <div className="flex gap-4 mt-1">
              <p className="text-base text-gray-600">
                Total produits vendus: <span className="font-semibold">{totalQuantity}</span>
              </p>
              <p className="text-base text-gray-600">
                Chiffre d'affaires: <span className="font-semibold">{totalRevenue.toFixed(2)} TND </span>
              </p>
              <p className="text-base text-gray-600">
                Bénéfice: <span className={`font-semibold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {totalProfit.toFixed(2)} TND 
                </span>
              </p>
            </div>
          </div>

          {/* Products Table */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun produit vendu sur cette période
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Catégorie
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix moyen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chiffre d'affaires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bénéfice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product, index) => (
                    <tr key={product.product_id || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {product.product_name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {product.product_category || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {product.total_quantity || 0}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(product.avg_price || 0).toFixed(2)} TND 
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {(product.total_revenue || 0).toFixed(2)} TND 
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${(product.total_profit || 0) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {(product.total_profit || 0).toFixed(2)} TND 
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}