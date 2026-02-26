"use client";

import React, { useState, useEffect } from 'react';
import Select, { SingleValue } from 'react-select';
import { X, Calendar, User, Package, Tag } from 'lucide-react';

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
    minHeight: '48px',
    borderColor: '#E5E7EB',
    borderRadius: '0.5rem',
    boxShadow: 'none',
    '&:hover': {
      borderColor: '#9CA3AF',
    },
    '&:focus-within': {
      borderColor: '#4B5563',
      outline: 'none',
      boxShadow: '0 0 0 2px rgba(75, 85, 99, 0.1)',
    },
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    borderRadius: '0',
    backgroundColor: state.isFocused ? '#F3F4F6' : 'white',
    color: '#1F2937',
    padding: '12px 16px',
    fontSize: '0.875rem',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#E5E7EB',
    },
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#1F2937',
    fontSize: '0.875rem',
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#9CA3AF',
    fontSize: '0.875rem',
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 60,
    borderRadius: '0.5rem',
    overflow: 'hidden',
    marginTop: '4px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  }),
  menuList: (provided: any) => ({
    ...provided,
    maxHeight: '220px',
    overflowY: 'auto',
    padding: '4px',
  }),
  clearIndicator: (provided: any) => ({
    ...provided,
    cursor: 'pointer',
    padding: '4px',
    '&:hover': {
      color: '#4B5563',
    },
  }),
  dropdownIndicator: (provided: any) => ({
    ...provided,
    cursor: 'pointer',
    padding: '8px',
    '&:hover': {
      color: '#4B5563',
    },
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
};

export default function FilterModal({ isOpen, onClose, onApply }: FilterModalProps) {
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
      const productsRes = await fetch('https://superettejemai.onrender.com/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const productsData = await productsRes.json();
      const products = productsData.products || productsData.data?.products || [];

      // Fetch categories from /api/stats/categories
      const categoriesRes = await fetch('https://superettejemai.onrender.com/api/stats/categories', {
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

      const response = await fetch('https://superettejemai.onrender.com/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      const users = data.users || data.data || data || [];
      const cashierUsers = users.filter(
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

  const handleReset = () => {
    setFilters({
      dateRange: 'today',
      fromDate: '',
      toDate: '',
      category: '',
      selectedProduct: '',
    });
    setSelectedCashier(null);
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
    label: `${p.name} (${p.barcode})`,
  }));

  const cashierOptions = cashiers.map(c => ({
    value: c.id,
    label: `${c.name} - ${c.role === 'worker' ? 'Caissier' : 'Administrateur'}`,
  }));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Filtrer les Statistiques</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Range Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b border-gray-100 pb-2">
              <Calendar className="w-5 h-5" />
              <h3 className="font-medium">Période</h3>
            </div>
            
            <div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm bg-white"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm bg-white"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cashier Filter Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b border-gray-100 pb-2">
              <User className="w-5 h-5" />
              <h3 className="font-medium">Caissier</h3>
            </div>
            
            <div>
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
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                Sélectionnez un caissier pour filtrer les ventes
              </p>
            </div>
          </div>

          {/* Category Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b border-gray-100 pb-2">
              <Tag className="w-5 h-5" />
              <h3 className="font-medium">Catégorie</h3>
            </div>
            
            <div>
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
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                Filtre par catégorie de produits
              </p>
            </div>
          </div>

          {/* Product Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700 border-b border-gray-100 pb-2">
              <Package className="w-5 h-5" />
              <h3 className="font-medium">Produit spécifique</h3>
            </div>
            
            <div>
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
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                Sélectionnez un produit spécifique pour un rapport détaillé
              </p>
            </div>
          </div>

          {/* Selected Filters Summary */}
          {(filters.dateRange !== 'today' || filters.category || filters.selectedProduct || selectedCashier) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Filtres actifs :</h4>
              <div className="flex flex-wrap gap-2">
                {filters.dateRange !== 'today' && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
                    {filters.dateRange === 'custom' && filters.fromDate && filters.toDate && (
                      <>: {new Date(filters.fromDate).toLocaleDateString()} - {new Date(filters.toDate).toLocaleDateString()}</>
                    )}
                  </span>
                )}
                {filters.category && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Catégorie: {filters.category}
                  </span>
                )}
                {filters.selectedProduct && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Produit: {products.find(p => p.id === Number(filters.selectedProduct))?.name}
                  </span>
                )}
                {selectedCashier && (
                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                    Caissier: {selectedCashier.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Appliquer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
