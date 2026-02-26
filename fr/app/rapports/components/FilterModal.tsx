"use client";
import React, { useState, useEffect } from 'react';
import { FiSearch, FiX } from "react-icons/fi";
import Select from 'react-select';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  users: User[]; // This expects users array, not userRole
}

interface SelectOption {
  value: string;
  label: string;
}

const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, onApply, users }) => {
  const [filters, setFilters] = useState({
    dateRange: false,
    fromDate: '',
    toDate: '',
    selectedProduct: null as number | null,
    category: '',
    productSearch: '',
    categorySearch: '',
    selectedUsers: [] as string[]
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Custom styles for react-select
  const customSelectStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      border: '1px solid #d1d5db',
      borderRadius: '0px',
      boxShadow: state.isFocused ? '0 0 0 1px #9ca3af' : 'none',
      '&:hover': {
        borderColor: '#9ca3af',
      },
      minHeight: '48px',
      padding: '0px 4px',
      fontSize: '14px',
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#4b5563' : state.isFocused ? '#f3f4f6' : 'white',
      color: state.isSelected ? 'white' : '#374151',
      padding: '12px 16px',
      fontSize: '14px',
      '&:hover': {
        backgroundColor: '#f3f4f6',
      },
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '0px',
      border: '1px solid #d1d5db',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: '4px 0',
    }),
    singleValue: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#374151',
    }),
    placeholder: (provided: any) => ({
      ...provided,
      fontSize: '14px',
      color: '#9ca3af',
    }),
    dropdownIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    clearIndicator: (provided: any) => ({
      ...provided,
      padding: '8px',
    }),
    valueContainer: (provided: any) => ({
      ...provided,
      padding: '4px 12px',
    }),
    input: (provided: any) => ({
      ...provided,
      margin: '0px',
      padding: '0px',
    }),
  };

  // Fetch products and categories
  useEffect(() => {
    if (isOpen) {
      fetchProductsAndCategories();
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
    // Handle both { products: [] } and { success: true, data: { products: [] } } formats
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prepare filter data for API calls
    const filterData: any = {};
    
    if (filters.dateRange && filters.fromDate && filters.toDate) {
      filterData.startDate = filters.fromDate;
      filterData.endDate = filters.toDate;
    }
    
    if (filters.selectedProduct) {
      const selectedProduct = products.find(p => p.id === filters.selectedProduct);
      filterData.productName = selectedProduct?.name;
    } else if (filters.category) {
      filterData.category = filters.category;
    }
    
    // Add user IDs to filter data
    if (filters.selectedUsers.length > 0) {
      filterData.userIds = filters.selectedUsers;
    }
    
    onApply(filterData);
    onClose();
  };

  const handleReset = () => {
    setFilters({
      dateRange: false,
      fromDate: '',
      toDate: '',
      selectedProduct: null,
      category: '',
      productSearch: '',
      categorySearch: '',
      selectedUsers: []
    });
    setUserSearch('');
  };

  const selectProduct = (productId: number) => {
    setFilters(prev => ({
      ...prev,
      selectedProduct: productId,
      category: '' // Clear category when product is selected
    }));
  };

  const clearSelectedProduct = () => {
    setFilters(prev => ({
      ...prev,
      selectedProduct: null
    }));
  };

  const handleCategoryChange = (selectedOption: SelectOption | null) => {
    setFilters(prev => ({
      ...prev,
      category: selectedOption?.value || '',
      selectedProduct: null // Clear product when category is selected
    }));
  };

  const handleCategorySearchChange = (selectedOption: SelectOption | null) => {
    setFilters(prev => ({
      ...prev,
      categorySearch: selectedOption?.value || ''
    }));
  };

  const handleUserSelect = (userId: string) => {
    setFilters(prev => {
      const isSelected = prev.selectedUsers.includes(userId);
      if (isSelected) {
        return {
          ...prev,
          selectedUsers: prev.selectedUsers.filter(id => id !== userId)
        };
      } else {
        return {
          ...prev,
          selectedUsers: [...prev.selectedUsers, userId]
        };
      }
    });
  };

  const clearSelectedUsers = () => {
    setFilters(prev => ({
      ...prev,
      selectedUsers: []
    }));
  };

  const getSelectedProduct = () => {
    if (!filters.selectedProduct) return null;
    return products.find(product => product.id === filters.selectedProduct);
  };

  const getSelectedCategoryOption = () => {
    if (!filters.category) return null;
    return categoryOptions.find(option => option.value === filters.category);
  };

  const getSelectedCategorySearchOption = () => {
    if (!filters.categorySearch) return null;
    return categoryOptions.find(option => option.value === filters.categorySearch);
  };

  const getFilteredProducts = () => {
    return products.filter(product => 
      product.name.toLowerCase().includes(filters.productSearch.toLowerCase()) &&
      (filters.categorySearch ? product.category === filters.categorySearch : true)
    );
  };

  const getFilteredUsers = () => {
    return users.filter(user => 
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
    );
  };

  // Prepare options for react-select
  const categoryOptions: SelectOption[] = [
    { value: '', label: 'Toutes les catégories' },
    ...categories.map(category => ({
      value: category,
      label: category
    }))
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Filtrer les Statistiques</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.checked })}
                className="accent-gray-600 w-4 h-4 text-gray-600 border-gray-300 rounded focus:ring-gray-500"
              />
              <span className="text-sm font-medium text-gray-700">Période spécifique</span>
            </label>

            {filters.dateRange && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">De</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">À</label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                    className="w-full px-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par Utilisateurs
            </label>
            
            {/* Selected Users */}
            {filters.selectedUsers.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    Utilisateurs sélectionnés ({filters.selectedUsers.length})
                  </label>
                  <button
                    type="button"
                    onClick={clearSelectedUsers}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Tout désélectionner
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {filters.selectedUsers.map(userId => {
                    const user = users.find(u => u.id === userId);
                    return user ? (
                      <div
                        key={userId}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full"
                      >
                        <span className="text-xs font-medium text-blue-700">
                          {user.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUserSelect(userId)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* User Search */}
            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Users List */}
            <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
              {getFilteredUsers().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucun utilisateur trouvé
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {getFilteredUsers().map(user => (
                    <label
                      key={user.id}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={filters.selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelect(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {user.email} • {user.role}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez un ou plusieurs utilisateurs pour filtrer les statistiques par vendeur
            </p>
          </div>

          {/* Sold Products with Search and Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrer par Produit ou Catégorie
            </label>
            
            {/* Selected Product */}
            {filters.selectedProduct && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Produit sélectionné
                </label>
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-300 rounded-md">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {getSelectedProduct()?.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getSelectedProduct()?.category} • {getSelectedProduct()?.price} DT
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedProduct}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filter Controls */}
            <div className="space-y-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Product Search */}
                <div className="relative">
                  <FiSearch className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={filters.productSearch}
                    onChange={(e) => setFilters({ ...filters, productSearch: e.target.value })}
                    placeholder="Rechercher un produit..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Category Filter for Product List */}
                <Select
                  value={getSelectedCategorySearchOption()}
                  onChange={handleCategorySearchChange}
                  options={categoryOptions}
                  styles={customSelectStyles}
                  placeholder="Toutes les catégories"
                  isSearchable={true}
                />
              </div>
            </div>

            {/* Products List */}
            <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Chargement des produits...
                </div>
              ) : getFilteredProducts().length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucun produit trouvé
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {getFilteredProducts().map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product.id)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                        filters.selectedProduct === product.id ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {product.name}
                          {filters.selectedProduct === product.id && (
                            <span className="ml-2 text-xs text-blue-600">✓ Sélectionné</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.category} • {product.price} DT • Stock: {product.stock}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category Dropdown for Report Filtering */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ou filtrer par Catégorie
            </label>
            <Select
              value={getSelectedCategoryOption()}
              onChange={handleCategoryChange}
              options={categoryOptions}
              styles={customSelectStyles}
              placeholder="Toutes les catégories"
              isSearchable={true}
            />
            <p className="text-xs text-gray-500 mt-1">
              Sélectionnez une catégorie pour filtrer le rapport. Ceci désélectionnera tout produit choisi.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors font-medium"
            >
              Appliquer les filtres
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FilterModal;
