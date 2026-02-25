"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Select from 'react-select';
import dinar from "../../assets/dinar.png";
import {
  BsSearch,
  BsPlus,
  BsTrash,
  BsPencil,
  BsArrowRepeat,
  BsImage,
  BsUpcScan,
  BsBox,
  BsTag,
  BsCurrencyDollar,
  BsChevronDown,
  BsChevronUp,
  BsX,
  BsExclamationTriangle,
} from "react-icons/bs";

interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  is_primary: boolean;
  created_at: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost_price: number;
  stock: number;
  barcode: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
  ProductImages?: ProductImage[];
}

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "worker";
  pin: string;
  created_at: string;
  is_active: boolean;
}

interface SelectOption {
  value: string;
  label: string;
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [categoryFilter, setCategoryFilter] = useState<SelectOption>({ value: "all", label: "Toutes les catégories" });
  const [stockFilter, setStockFilter] = useState<SelectOption>({ value: "all", label: "Tous les stocks" });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null,
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch current user from API
  const fetchCurrentUser = async () => {
    try {
      setUserLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setUserLoading(false);
        return;
      }

      const response = await fetch("https://superettejemai.onrender.com/api/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response || !response.ok) {
        console.warn(
          "Could not fetch user from API, using default permissions"
        );
        setCurrentUser({ role: "admin" } as User);
        setUserLoading(false);
        return;
      }

      const data = await response.json();
      setCurrentUser(data.user || data);
    } catch (err) {
      console.error("Error fetching current user:", err);
      setCurrentUser({ role: "admin" } as User);
    } finally {
      setUserLoading(false);
    }
  };

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      const url = `https://superettejemai.onrender.com/api/products?${new URLSearchParams({
        q: searchQuery,
        sort: sortField,
        order: sortDirection,
      })}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters locally
  const applyFilters = () => {
    let filtered = [...products];

    // Apply category filter
    if (categoryFilter.value !== "all") {
      filtered = filtered.filter(
        (product) => product.category === categoryFilter.value
      );
    }

    // Apply stock filter
    if (stockFilter.value !== "all") {
      switch (stockFilter.value) {
        case "out":
          filtered = filtered.filter((product) => product.stock === 0);
          break;
        case "low":
          filtered = filtered.filter(
            (product) => product.stock > 0 && product.stock <= 20
          );
          break;
        case "normal":
          filtered = filtered.filter((product) => product.stock > 20);
          break;
      }
    }

    setFilteredProducts(filtered);
  };

  // Handle delete product
  const handleDeleteProduct = async () => {
    if (!deleteModal.product) return;

    // Double check user role before proceeding with deletion
    if (currentUser?.role === "worker") {
      alert(
        "Vous n'avez pas les autorisations nécessaires pour supprimer des produits."
      );
      setDeleteModal({ isOpen: false, product: null });
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        alert("Authentication token not found. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://superettejemai.onrender.com/api/products/${deleteModal.product.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete product");
      }

      setProducts((prev) =>
        prev.filter((product) => product.id !== deleteModal.product!.id)
      );
      setDeleteModal({ isOpen: false, product: null });
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Échec de la suppression du produit"
      );
      console.error("Error deleting product:", err);
    }
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  // Handle sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Open delete modal
  const openDeleteModal = (product: Product) => {
    // Check if user has permission to delete
    if (currentUser?.role === "worker") {
      alert(
        "Vous n'avez pas les autorisations nécessaires pour supprimer des produits."
      );
      return;
    }
    setDeleteModal({ isOpen: true, product });
  };

  // Handle edit product
  const handleEditProduct = (product: Product) => {
    // Check if user has permission to edit
    if (currentUser?.role === "worker") {
      alert(
        "Vous n'avez pas les autorisations nécessaires pour modifier des produits."
      );
      return;
    }
    window.location.href = `/gestion/edit?id=${product.id}`;
  };

  // Close delete modal
  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, product: null });
  };

  // Get unique categories for select options
  const categoryOptions: SelectOption[] = [
    { value: "all", label: "Toutes les catégories" },
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).map(
      (category) => ({
        value: category,
        label: category,
      })
    ),
  ];

  // Stock filter options
  const stockOptions: SelectOption[] = [
    { value: "all", label: "Tous les stocks" },
    { value: "out", label: "Rupture de stock" },
    { value: "low", label: "Stock faible" },
    { value: "normal", label: "Stock normal" },
  ];

  // Custom styles for react-select with padding
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

  // Check if user is worker (for button disabling)
  const isWorker = currentUser?.role === "worker";

  // Load user and products on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchCurrentUser();
      await fetchProducts();
    };
    loadData();
  }, []);

  // Load products when sort changes
  useEffect(() => {
    if (!userLoading) {
      fetchProducts();
    }
  }, [sortField, sortDirection, userLoading]);

  // Apply filters when products, categoryFilter, or stockFilter changes
  useEffect(() => {
    applyFilters();
  }, [products, categoryFilter, stockFilter]);

  // Format price
  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) + " DT"
    );
  };

  // Get product image URL
  const getProductImageUrl = (product: Product) => {
    if (product.ProductImages && product.ProductImages.length > 0) {
      const imageUrl = product.ProductImages[0].url;
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      return `https://superettejemai.onrender.com${imageUrl}`;
    }
    return null;
  };

  // Statistics based on filtered products
  const stats = {
    total: filteredProducts.length,
    lowStock: filteredProducts.filter((p) => p.stock > 0 && p.stock <= 10)
      .length,
    outOfStock: filteredProducts.filter((p) => p.stock === 0).length,
    totalValue: filteredProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-5">
      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.product && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-gray-200 w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BsExclamationTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmer la suppression
                  </h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <BsX className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">
                  Êtes-vous sûr de vouloir supprimer le produit suivant ?
                </p>
                <div className="bg-gray-50 p-3 border border-gray-200">
                  <p className="font-medium text-gray-900">
                    {deleteModal.product.name}
                  </p>
                  {deleteModal.product.sku && (
                    <p className="text-xs text-gray-500">
                      SKU: {deleteModal.product.sku}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Prix: {formatPrice(deleteModal.product.price)} | Stock:{" "}
                    {deleteModal.product.stock}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Cette action peut être annulée. Le produit pourra être
                  restauré si nécessaire.
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors focus:ring-1 focus:ring-gray-400"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-4 bg-red-600 text-white text-sm hover:bg-red-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400 flex items-center gap-2"
                >
                  <BsTrash className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Gestion des Produits
            </h1>
            <p className="text-sm text-gray-600">
              Gérez vos produits et suivez vos stocks
            </p>
            {currentUser && (
              <p className="text-xs text-gray-500 mt-1">
                Connecté en tant que:{" "}
                <span className="font-medium">
                  {currentUser.name || "Utilisateur"}
                </span>
                ({currentUser.role === "admin" ? "Administrateur" : "Employé"})
                {isWorker && (
                  <span className="ml-2 text-red-600">
                    (Permissions limitées)
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            className="flex items-center gap-2 px-4 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 transition-colors mt-4 lg:mt-0 border border-gray-300 focus:ring-1 focus:ring-gray-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={() => (window.location.href = "/gestion/add")}
            title={
              isWorker
                ? "Non autorisé à ajouter des produits"
                : "Ajouter un produit"
            }
          >
            <BsPlus className="w-4 h-4" />
            Ajouter un produit
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Total Produits
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <BsBox className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Stock Faible
                </p>
                <p className="text-xl font-semibold text-yellow-600">
                  {stats.lowStock}
                </p>
              </div>
              <BsBox className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Rupture</p>
                <p className="text-xl font-semibold text-red-600">
                  {stats.outOfStock}
                </p>
              </div>
              <BsBox className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Valeur Stock
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatPrice(stats.totalValue)}
                </p>
              </div>
              <Image
                src={dinar.src}
                className="w-11 h-10"
                width={11}
                height={10}
                alt="Dinar Logo"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
          <div className="flex items-center">
            <BsExclamationTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <BsX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white border border-gray-200">
        {/* Filters and Search */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 mb-4 lg:mb-0 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Select
                  value={categoryFilter}
                  onChange={(newValue) => setCategoryFilter(newValue as SelectOption)}
                  options={categoryOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={stockFilter}
                  onChange={(newValue) => setStockFilter(newValue as SelectOption)}
                  options={stockOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>
            </div>

            {/* Search */}
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto"
            >
              <div className="relative">
                <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher des produits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-64 text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
              >
                Rechercher
              </button>
              <button
                onClick={fetchProducts}
                className="flex items-center gap-2 px-3 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors focus:ring-1 focus:ring-gray-400"
              >
                <BsArrowRepeat className="w-4 h-4" />
                Actualiser
              </button>
            </form>
          </div>
        </div>

        {/* Products Count */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="text-sm text-gray-600">
            {filteredProducts.length} produit(s) trouvé(s)
            {(categoryFilter.value !== "all" || stockFilter.value !== "all") && (
              <span className="text-xs text-gray-500 ml-2">
                (filtré sur {products.length} total)
              </span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("name")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Nom
                    {sortField === "name" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("price")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Prix
                    {sortField === "price" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("stock")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Stock
                    {sortField === "stock" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code à barre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <BsBox className="w-8 h-8 mb-2 text-gray-300" />
                      <p className="text-sm font-medium mb-1">
                        Aucun produit trouvé
                      </p>
                      <p className="text-xs mb-3">
                        {products.length === 0
                          ? "Commencez par créer votre premier produit"
                          : "Aucun produit ne correspond aux filtres sélectionnés"}
                      </p>
                      {!isWorker && (
                        <button
                          onClick={() =>
                            (window.location.href = "/gestion/add")
                          }
                          className="px-3 py-1.5 bg-gray-600 text-white text-sm hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                        >
                          Ajouter un produit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-300">
                        {getProductImageUrl(product) ? (
                          <img
                            src={getProductImageUrl(product)!}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        {!getProductImageUrl(product) && (
                          <BsImage className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                        {product.sku && (
                          <div className="text-xs text-gray-500">
                            SKU: {product.sku}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(product.price)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                          product.stock > 10
                            ? "bg-green-100 text-green-800"
                            : product.stock > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.stock} en stock
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.category ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700">
                          <BsTag className="w-3 h-3 mr-1" />
                          {product.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Non catégorisé
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center text-sm">
                        <BsUpcScan className="w-4 h-4 mr-2 text-gray-400" />
                        {product.barcode || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <button
                          className={`flex items-center gap-1 px-6 py-4 text-xs border border-gray-300 focus:ring-1 focus:ring-gray-400 ${
                            isWorker
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                          }`}
                          onClick={() =>
                            !isWorker && handleEditProduct(product)
                          }
                          title={
                            isWorker ? "Non autorisé à modifier" : "Modifier"
                          }
                          disabled={isWorker}
                        >
                          <BsPencil className="w-3 h-3" />
                          Modifier
                        </button>
                        <button
                          className={`flex items-center gap-1 px-6 py-4 text-xs border border-gray-300 focus:ring-1 focus:ring-gray-400 ${
                            isWorker
                              ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                              : "text-red-600 hover:text-red-800 hover:bg-red-50"
                          }`}
                          onClick={() => !isWorker && openDeleteModal(product)}
                          title={
                            isWorker ? "Non autorisé à supprimer" : "Supprimer"
                          }
                          disabled={isWorker}
                        >
                          <BsTrash className="w-3 h-3" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}