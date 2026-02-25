"use client";

import React, { useState, useEffect } from 'react';
import Select, { SingleValue } from 'react-select';
import { X } from 'lucide-react';

// Define types
interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  userRole?: string | null;
}

interface Product {
  id: number;
  name: string;
  category: string;
  barcode: string;
}

interface User {
  id: number;
  name: string;
  role: string;
}

// Helper: Custom react-select styles to match your design
const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    minHeight: '54px',
    borderColor: '#A2ACBC',
    borderRadius: '0',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#d1d5db',
    },
    '&:focus-within': {
      borderColor: '#6b7280',
      outline: 'none',
      boxShadow: '0 0 0 1px #6b7280',
    },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    borderRadius: '0',
    backgroundColor: state.isFocused ? '#f3f4f6' : 'white',
    color: '#1f2937',
    padding: '18px 22px',
    fontSize: '0.875rem',
    textTransform: 'capitalize',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#1f2937',
    fontSize: '0.875rem',
    textTransform: 'capitalize',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#9ca3af',
    fontSize: '0.875rem',
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 60, // Higher than modal's z-50
    borderRadius: '0',
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: '220px', // Prevent menu from being too tall
    overflowY: 'auto',
  }),
};

export default function FilterModal({ isOpen, onClose, onApply, userRole }: FilterModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<SingleValue<{ value: number; label: string }> | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'today',
    fromDate: '',
    toDate: '',
    category: '',
    selectedProduct: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchProductsAndCategories();
      fetchCashiers();
      setFilters({
        dateRange: 'today',
        fromDate: '',
        toDate: '',
        category: '',
        selectedProduct: '',
      });
      setSelectedCashier(null);
    }
  }, [isOpen]);

 const fetchProductsAndCategories = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Fetch products from /api/products
    const productsRes = await fetch('http://localhost:4000/api/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const productsData = await productsRes.json();
    // Handle both { products: [] } and { success: true, data: { products: [] } } formats
    const products = productsData.products || productsData.data?.products || [];

    // Fetch categories from /api/stats/categories
    const categoriesRes = await fetch('http://localhost:4000/api/stats/categories', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const categoriesData = await categoriesRes.json();
    const categories = categoriesData.data || categoriesData.categories || [];

    setProducts(products);
    setCategories(categories);
  } catch (error) {
    console.error('Error fetching products and categories:', error);
  }
};

  const fetchCashiers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const cashierUsers = (data.users || data || []).filter(
        (user: User) => user.role === 'worker' || user.role === 'admin'
      );
      setCashiers(cashierUsers);
    } catch (error) {
      console.error('Error fetching cashiers:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filterData: any = {};

    if (filters.dateRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filterData.startDate = today;
      filterData.endDate = today;
    } else if (filters.dateRange === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      filterData.startDate = yesterdayStr;
      filterData.endDate = yesterdayStr;
    } else if (filters.dateRange === 'custom' && filters.fromDate && filters.toDate) {
      filterData.startDate = filters.fromDate;
      filterData.endDate = filters.toDate;
    }

    if (filters.selectedProduct) {
      const selectedProduct = products.find(p => p.id === Number(filters.selectedProduct));
      if (selectedProduct) {
        filterData.productName = selectedProduct.name;
      }
    } else if (filters.category) {
      filterData.category = filters.category;
    }

    if (selectedCashier?.value) {
      filterData.cashierId = selectedCashier.value;
    }

    onApply(filterData);
    onClose();
  };

  if (!isOpen) return null;

  const dateRangeOptions = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'yesterday', label: 'Hier' },
    { value: 'custom', label: 'Personnalisé' },
  ];

  const categoryOptions = categories.map(cat => ({ value: cat, label: cat }));
  const productOptions = products.map(p => ({
    value: p.id.toString(),
    label: `${p.name} - ${p.barcode}`,
  }));

  const cashierOptions = cashiers.map(c => ({
    value: c.id,
    label: `${c.name} (${c.role})`,
  }));

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl  overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Filtrer les Statistiques</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
            <Select
              options={dateRangeOptions}
              value={dateRangeOptions.find(option => option.value === filters.dateRange)}
              onChange={(option) =>
                setFilters({ ...filters, dateRange: option?.value || 'today' })
              }
              styles={customSelectStyles}
              isSearchable={false}
              menuPlacement="auto"
              menuPosition="fixed"
            />
          </div>

          {/* Custom Date Range */}
          {filters.dateRange === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de début
                </label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                  className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* Cashier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par Caissier
            </label>
            <Select
              options={cashierOptions}
              value={selectedCashier}
              onChange={setSelectedCashier}
              placeholder="Tous les caissiers"
              styles={customSelectStyles}
              isClearable
              menuPlacement="auto"
              menuPosition="fixed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez un caissier pour filtrer le rapport.
            </p>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <Select
              options={categoryOptions}
              value={categoryOptions.find(opt => opt.value === filters.category) || null}
              onChange={(option) => {
                setFilters({
                  ...filters,
                  category: option?.value || '',
                  selectedProduct: '',
                });
              }}
              placeholder="Toutes les catégories"
              styles={customSelectStyles}
              isClearable
              menuPlacement="auto"
              menuPosition="fixed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez une catégorie pour filtrer les produits.
            </p>
          </div>

          {/* Product Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produit spécifique
            </label>
            <Select
              options={productOptions}
              value={productOptions.find(opt => opt.value === filters.selectedProduct) || null}
              onChange={(option) => {
                setFilters({
                  ...filters,
                  selectedProduct: option?.value || '',
                  category: '',
                });
              }}
              placeholder="Tous les produits"
              styles={customSelectStyles}
              isClearable
              menuPlacement="auto"
              menuPosition="fixed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez un produit spécifique pour un rapport détaillé.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 pb-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              Appliquer les filtres
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}