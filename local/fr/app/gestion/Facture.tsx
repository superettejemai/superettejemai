"use client";
import React, { useState, useEffect, useRef } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import Image from "next/image";
import Select from 'react-select';
import dinar from "../../assets/dinar.png";
import {
  BsSearch,
  BsPlus,
  BsTrash,
  BsEye,
  BsCheckCircle,
  BsXCircle,
  BsDownload,
  BsFileEarmarkText,
  BsCalendar,
  BsPerson,
  BsTelephone,
  BsEnvelope,
  BsGeoAlt,
  BsCurrencyDollar,
  BsBox,
  BsClock,
  BsArrowRepeat,
  BsThreeDotsVertical,
  BsPencil,
  BsChevronDown,
  BsChevronUp,
  BsFilter,
  BsSortDown,
} from "react-icons/bs";

// Initialize pdfmake with fonts
(pdfMake as any).vfs = (pdfFonts as any).vfs;

interface Product {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  stock: number;
  price: number;
  cost_price?: number;
  ProductImages?: any[];
  category?: string;
}

interface FactureItem {
  id?: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface Facture {
  id: number;
  facture_number: string;
  supplier_name: string;
  supplier_info: string;
  facture_date: string;
  total_amount: number;
  comment: string;
  status: "draft" | "confirmed" | "cancelled";
  created_at: string;
  updated_at: string;
  FactureItems: FactureItem[];
}

interface SelectOption {
  value: string;
  label: string;
}

export default function FactureManagementPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusFilterOption, setStatusFilterOption] = useState<SelectOption>({ 
    value: "all", 
    label: "Tous les statuts" 
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [sortField, setSortField] = useState("facture_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // New facture form state
  const [newFacture, setNewFacture] = useState({
    supplier_name: "",
    supplier_info: "",
    facture_date: new Date().toISOString().split("T")[0],
    comment: "",
    supplier_phone: "",
    supplier_email: "",
    supplier_address: "",
  });
  const [items, setItems] = useState<FactureItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Refs for click outside detection
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const factureSearchInputRef = useRef<HTMLInputElement>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    cancelled: 0,
    totalAmount: 0,
  });

  // Status filter options
  const statusOptions: SelectOption[] = [
    { value: "all", label: "Tous les statuts" },
    { value: "draft", label: "Brouillon" },
    { value: "confirmed", label: "Confirmé" },
    { value: "cancelled", label: "Annulé" },
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
      minHeight: '53px',
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

  // Enhanced fetch with real-time search
  const fetchFactures = async (searchTerm: string = searchQuery) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }

      let url = `http://localhost:4000/api/factures?`;
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        if (searchTerm.toUpperCase().startsWith("FACT-")) {
          params.append("facture_number", searchTerm);
        } else {
          params.append("supplier", searchTerm);
        }
      }

      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sort", sortField);
      params.append("order", sortDirection);

      const response = await fetch(url + params, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch factures");
      }

      const data = await response.json();
      setFactures(data.factures || []);
      calculateStats(data.factures || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching factures:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = (facturesList: Facture[]) => {
    const stats = {
      total: facturesList.length,
      draft: facturesList.filter((f) => f.status === "draft").length,
      confirmed: facturesList.filter((f) => f.status === "confirmed").length,
      cancelled: facturesList.filter((f) => f.status === "cancelled").length,
      totalAmount: facturesList.reduce((sum, f) => sum + f.total_amount, 0),
    };
    setStats(stats);
  };

  // Search products
  const searchProducts = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/products?q=${encodeURIComponent(
          query
        )}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error("Error searching products:", err);
    }
  };

  // Add product to items
  const addProductToItems = (product: Product) => {
    const existingItem = items.find((item) => item.product_id === product.id);

    if (existingItem) {
      setItems(
        items.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_cost: (item.quantity + 1) * item.unit_cost,
              }
            : item
        )
      );
    } else {
      const unitCost = product.cost_price || product.price * 0.8;
      setItems([
        ...items,
        {
          product_id: product.id,
          product: product,
          quantity: 1,
          unit_cost: unitCost,
          total_cost: unitCost,
        },
      ]);
    }

    setProductSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Quick add product by quantity
  const quickAddProduct = (product: Product, quantity: number = 1) => {
    const existingItem = items.find((item) => item.product_id === product.id);

    if (existingItem) {
      setItems(
        items.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total_cost: (item.quantity + quantity) * item.unit_cost,
              }
            : item
        )
      );
    } else {
      const unitCost = product.cost_price || product.price * 0.8;
      setItems([
        ...items,
        {
          product_id: product.id,
          product: product,
          quantity: quantity,
          unit_cost: unitCost,
          total_cost: unitCost * quantity,
        },
      ]);
    }
  };

  // Update item quantity
  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity,
      total_cost: quantity * updatedItems[index].unit_cost,
    };
    setItems(updatedItems);
  };

  // Update item unit cost
  const updateItemUnitCost = (index: number, unit_cost: number) => {
    if (unit_cost < 0) return;

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      unit_cost,
      total_cost: updatedItems[index].quantity * unit_cost,
    };
    setItems(updatedItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Clear all items
  const clearAllItems = () => {
    if (
      items.length > 0 &&
      confirm("Êtes-vous sûr de vouloir supprimer tous les produits ?")
    ) {
      setItems([]);
    }
  };

  // Create new facture
  const createFacture = async () => {
    if (!newFacture.supplier_name.trim()) {
      alert("Veuillez saisir le nom du fournisseur");
      return;
    }

    if (items.length === 0) {
      alert("Veuillez ajouter au moins un produit");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("http://localhost:4000/api/factures", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplier_name: newFacture.supplier_name,
          supplier_info: newFacture.supplier_info,
          supplier_phone: newFacture.supplier_phone,
          supplier_email: newFacture.supplier_email,
          supplier_address: newFacture.supplier_address,
          facture_date: newFacture.facture_date,
          comment: newFacture.comment,
          items: items.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create facture");
      }

      const data = await response.json();

      if (data.success) {
        setShowCreateForm(false);
        resetForm();
        fetchFactures();
        alert("Facture créée avec succès !");
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Échec de la création de la facture"
      );
      console.error("Error creating facture:", err);
    }
  };

  // Reset form
  const resetForm = () => {
    setNewFacture({
      supplier_name: "",
      supplier_info: "",
      facture_date: new Date().toISOString().split("T")[0],
      comment: "",
      supplier_phone: "",
      supplier_email: "",
      supplier_address: "",
    });
    setItems([]);
    setProductSearch("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Confirm facture
  const confirmFacture = async (factureId: number) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir confirmer cette facture ? Cela mettra à jour le stock des produits."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/factures/${factureId}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to confirm facture");
      }

      const data = await response.json();

      if (data.success) {
        fetchFactures();
        alert("Facture confirmée et stock mis à jour avec succès !");
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Échec de la confirmation de la facture"
      );
      console.error("Error confirming facture:", err);
    }
  };

  // Cancel facture
  const cancelFacture = async (factureId: number) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir annuler cette facture ? Cette action ne peut pas être annulée."
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:4000/api/factures/${factureId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel facture");
      }

      const data = await response.json();

      if (data.success) {
        fetchFactures();
        alert("Facture annulée avec succès !");
      }
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : "Échec de l'annulation de la facture"
      );
      console.error("Error cancelling facture:", err);
    }
  };

  // View facture details
  const viewFactureDetails = (facture: Facture) => {
    setSelectedFacture(facture);
    setShowDetails(true);
  };

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Format date for PDF
  const formatDateForPDF = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format price for PDF
  const formatPriceForPDF = (price: number) => {
    return (
      new Intl.NumberFormat("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) + " DT"
    );
  };

  // Get items from facture
  const getFactureItems = (facture: Facture) => {
    return facture.FactureItems || [];
  };

  // Export facture as PDF
  const exportToPDF = () => {
    if (!selectedFacture) return;

    const factureItems = getFactureItems(selectedFacture);

    const tableBody = [
      [
        { text: "Produit", style: "tableHeader" },
        { text: "Quantité", style: "tableHeader" },
        { text: "Prix Unitaire", style: "tableHeader" },
        { text: "Total", style: "tableHeader" },
      ],
      ...factureItems.map((item: FactureItem) => [
        item.product?.name || `Produit #${item.product_id}`,
        item.quantity.toString(),
        formatPriceForPDF(item.unit_cost),
        formatPriceForPDF(item.total_cost),
      ]),
    ];

    // Fixed colspan syntax
    tableBody.push([
      {
        text: "TOTAL",
        style: "totalLabel",
        colSpan: 3,
        alignment: "right",
      } as any,
      "" as any,
      "" as any,
      {
        text: formatPriceForPDF(selectedFacture.total_amount),
        style: "totalAmount",
      },
    ]);

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          columns: [
            {
              stack: [
                { text: "VOTRE ENTREPRISE", style: "companyName" },
                { text: "123 Rue Principale", style: "companyInfo" },
                { text: "Tunis, Tunisie", style: "companyInfo" },
                { text: "Tél: +216 12 345 678", style: "companyInfo" },
                { text: "Email: contact@entreprise.tn", style: "companyInfo" },
              ],
              width: "50%",
            },
            {
              stack: [
                { text: "FACTURE", style: "header" },
                {
                  text: `N° ${selectedFacture.facture_number}`,
                  style: "factureNumber",
                },
                {
                  text: `Date: ${formatDateForPDF(
                    selectedFacture.facture_date
                  )}`,
                  style: "date",
                },
                {
                  text: `Statut: ${selectedFacture.status.toUpperCase()}`,
                  style:
                    selectedFacture.status === "confirmed"
                      ? "statusConfirmed"
                      : selectedFacture.status === "draft"
                      ? "statusDraft"
                      : "statusCancelled",
                },
              ],
              width: "50%",
              alignment: "right",
            },
          ],
          margin: [0, 0, 0, 30],
        },
        {
          stack: [
            { text: "INFORMATIONS FOURNISSEUR", style: "sectionHeader" },
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: selectedFacture.supplier_name,
                          style: "supplierName",
                        },
                        selectedFacture.supplier_info
                          ? {
                              text: selectedFacture.supplier_info,
                              style: "supplierInfo",
                            }
                          : { text: "" },
                      ],
                    },
                  ],
                ],
              },
              layout: {
                fillColor: () => "#f8fafc",
              },
              margin: [0, 5, 0, 20],
            },
          ],
        },
        {
          stack: [
            { text: "DÉTAIL DES PRODUITS", style: "sectionHeader" },
            {
              table: {
                headerRows: 1,
                widths: ["*", "auto", "auto", "auto"],
                body: tableBody,
              },
              layout: {
                hLineWidth: (i: number, node: any) =>
                  i === 0 || i === node.table.body.length ? 1 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => "#374151",
                vLineColor: () => "#374151",
                fillColor: (rowIndex: number) => {
                  if (rowIndex === 0) return "#374151";
                  if (rowIndex === tableBody.length - 1) return "#f1f5f9";
                  return rowIndex % 2 === 0 ? "#f8fafc" : null;
                },
              },
            },
          ],
        },
        ...(selectedFacture.comment
          ? [
              {
                stack: [
                  {
                    text: "OBSERVATIONS",
                    style: "sectionHeader",
                    margin: [0, 20, 0, 5],
                  },
                  {
                    text: selectedFacture.comment,
                    style: "comment",
                    margin: [0, 0, 0, 20],
                  },
                ],
              },
            ]
          : []),
        {
          columns: [
            {
              text: "Merci pour votre confiance",
              style: "thankYou",
              width: "50%",
            },
            {
              text: `Généré le ${new Date().toLocaleDateString(
                "fr-FR"
              )} à ${new Date().toLocaleTimeString("fr-FR")}`,
              style: "footer",
              width: "50%",
              alignment: "right",
            },
          ],
          margin: [0, 30, 0, 0],
        },
      ],
      styles: {
        companyName: {
          fontSize: 16,
          bold: true,
          color: "#1e293b",
        },
        companyInfo: {
          fontSize: 9,
          color: "#64748b",
          margin: [0, 1, 0, 0],
        },
        header: {
          fontSize: 24,
          bold: true,
          color: "#1e293b",
        },
        factureNumber: {
          fontSize: 14,
          bold: true,
          color: "#374151",
        },
        date: {
          fontSize: 10,
          color: "#64748b",
        },
        statusConfirmed: {
          fontSize: 10,
          color: "#059669",
          bold: true,
        },
        statusDraft: {
          fontSize: 10,
          color: "#d97706",
          bold: true,
        },
        statusCancelled: {
          fontSize: 10,
          color: "#dc2626",
          bold: true,
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          color: "#374151",
          margin: [0, 0, 0, 5],
        },
        supplierName: {
          fontSize: 11,
          bold: true,
          color: "#1e293b",
        },
        supplierInfo: {
          fontSize: 9,
          color: "#64748b",
          margin: [0, 2, 0, 0],
        },
        tableHeader: {
          fontSize: 9,
          bold: true,
          color: "#ffffff",
          fillColor: "#374151",
        },
        totalLabel: {
          fontSize: 10,
          bold: true,
          color: "#1e293b",
          alignment: "right",
        },
        totalAmount: {
          fontSize: 10,
          bold: true,
          color: "#1e293b",
        },
        comment: {
          fontSize: 9,
          color: "#64748b",
          italics: true,
        },
        thankYou: {
          fontSize: 9,
          color: "#64748b",
          italics: true,
        },
        footer: {
          fontSize: 8,
          color: "#94a3b8",
        },
      },
      defaultStyle: {
        fontSize: 9,
        color: "#374151",
      },
    };

    pdfMake
      .createPdf(docDefinition as any)
      .download(`facture-${selectedFacture.facture_number}.pdf`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  // Format price for display
  const formatPrice = (price: number) => {
    return (
      new Intl.NumberFormat("fr-TN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) + " DT"
    );
  };

  // Calculate total
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_cost, 0);
  };

  // Filter factures by active tab
  const getFilteredFactures = () => {
    if (activeTab === "all") return factures;
    return factures.filter((facture) => facture.status === activeTab);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Handle product search input change
  const handleProductSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setProductSearch(value);
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (productSearch.trim() && searchResults.length > 0) {
      setShowSearchResults(true);
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (newValue: SelectOption | null) => {
    if (newValue) {
      setStatusFilterOption(newValue);
      setStatusFilter(newValue.value);
    }
  };

  // Handle click outside search results (for product search only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current &&
        !searchResultsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      fetchFactures();
    }
  };

  // Handle search on input blur (when clicking outside)
  const handleSearchBlur = () => {
    fetchFactures();
  };

  // Load factures on component mount and when filters change
  useEffect(() => {
    fetchFactures();
  }, [statusFilter, sortField, sortDirection]);

  // Search products when query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      searchProducts(productSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [productSearch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white px-5">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-1">
              Gestion des Factures
            </h1>
            <p className="text-sm text-gray-600">
              Gérez vos factures fournisseurs et suivez vos achats
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-4 bg-gray-600 text-white hover:bg-gray-700 transition-colors mt-4 lg:mt-0 border border-gray-300 focus:ring-1 focus:ring-gray-400"
            onClick={() => setShowCreateForm(true)}
          >
            <BsPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Nouvelle Facture</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">
                  Total Factures
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <BsFileEarmarkText className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">Brouillons</p>
                <p className="text-xl font-semibold text-yellow-600">
                  {stats.draft}
                </p>
              </div>
              <BsClock className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">Confirmées</p>
                <p className="text-xl font-semibold text-green-600">
                  {stats.confirmed}
                </p>
              </div>
              <BsCheckCircle className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">Annulées</p>
                <p className="text-xl font-semibold text-red-600">
                  {stats.cancelled}
                </p>
              </div>
              <BsXCircle className="w-5 h-5 text-gray-500" />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600">
                  Montant Total
                </p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatPrice(stats.totalAmount)}
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
            <BsXCircle className="w-4 h-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <BsXCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white border border-gray-200">
        {/* Tabs and Filters */}
        <div className="border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-4">
            {/* Tabs */}
            <div className="flex space-x-1 mb-4 lg:mb-0">
              {[
                { id: "all", label: "Toutes", count: stats.total },
                { id: "draft", label: "Brouillons", count: stats.draft },
                {
                  id: "confirmed",
                  label: "Confirmées",
                  count: stats.confirmed,
                },
                { id: "cancelled", label: "Annulées", count: stats.cancelled },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-4 text-base font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? "border-black text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative">
                <BsSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  ref={factureSearchInputRef}
                  type="text"
                  placeholder="Rechercher par fournisseur ou N° facture (FACT-...) - Appuyez sur Entrée"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  onBlur={handleSearchBlur}
                  className="pl-10 pr-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 w-full sm:w-64 text-sm"
                />
              </div>

              <div className="w-48">
                <Select
                  value={statusFilterOption}
                  onChange={handleStatusFilterChange}
                  options={statusOptions}
                  styles={customSelectStyles}
                  isSearchable={false}
                />
              </div>

              <button
                onClick={() => fetchFactures()}
                className="flex items-center gap-2 px-3 py-4 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm focus:ring-1 focus:ring-gray-400"
              >
                <BsArrowRepeat className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        {/* Factures Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("facture_number")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Facture
                    {sortField === "facture_number" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Fournisseur
                </th>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("facture_date")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Date
                    {sortField === "facture_date" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort("total_amount")}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Montant
                    {sortField === "total_amount" &&
                      (sortDirection === "asc" ? (
                        <BsChevronUp className="w-3 h-3" />
                      ) : (
                        <BsChevronDown className="w-3 h-3" />
                      ))}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredFactures().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <BsFileEarmarkText className="w-12 h-12 mb-4 text-gray-300" />
                      <p className="text-2xl font-medium mb-2">
                        Aucune facture trouvée
                      </p>
                      <p className="text-lg mb-4">
                        Commencez par créer votre première facture
                      </p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-4 py-4 bg-gray-600 text-white text-lg hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                      >
                        Créer une Facture
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredFactures().map((facture) => (
                  <tr
                    key={facture.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {facture.facture_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {facture.FactureItems?.length || 0} produits
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {facture.supplier_name}
                        </div>
                        {facture.supplier_info && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {facture.supplier_info}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <BsCalendar className="w-3 h-3 text-gray-400" />
                        {formatDate(facture.facture_date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">
                        {formatPrice(facture.total_amount)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                          facture.status === "confirmed"
                            ? "bg-green-100 text-green-800"
                            : facture.status === "draft"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {facture.status === "confirmed" && (
                          <BsCheckCircle className="w-3 h-3 mr-1" />
                        )}
                        {facture.status === "draft" && (
                          <BsClock className="w-3 h-3 mr-1" />
                        )}
                        {facture.status === "cancelled" && (
                          <BsXCircle className="w-3 h-3 mr-1" />
                        )}
                        {facture.status === "confirmed"
                          ? "Confirmé"
                          : facture.status === "draft"
                          ? "Brouillon"
                          : "Annulé"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => viewFactureDetails(facture)}
                          className="flex items-center gap-1 px-4 py-4 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                          title="Voir détails"
                        >
                          <BsEye className="w-3 h-3" />
                          Détails
                        </button>

                        {facture.status === "draft" && (
                          <>
                            <button
                              onClick={() => confirmFacture(facture.id)}
                              className="flex items-center gap-1 px-4 py-4 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                              title="Confirmer"
                            >
                              <BsCheckCircle className="w-3 h-3" />
                              Confirmer
                            </button>
                            <button
                              onClick={() => cancelFacture(facture.id)}
                              className="flex items-center gap-1 px-4 py-4 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                              title="Annuler"
                            >
                              <BsXCircle className="w-3 h-3" />
                              Annuler
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setSelectedFacture(facture);
                            exportToPDF();
                          }}
                          className="flex items-center gap-1 px-4 py-4 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                          title="Télécharger PDF"
                        >
                          <BsDownload className="w-4 h-4" />
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

      {/* Facture Details Modal */}
      {showDetails && selectedFacture && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Détails de la Facture
                  </h2>
                  <p className="text-sm text-gray-600">
                    N° {selectedFacture.facture_number}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-3 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                  >
                    <BsDownload className="w-4 h-4" />
                    Exporter PDF
                  </button>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-3 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors focus:ring-1 focus:ring-gray-400"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              {/* Invoice Preview */}
              <div className="bg-white border border-gray-200">
                {/* Invoice Header */}
                <div className="bg-gray-100 text-black p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-2xl font-semibold mb-1">FACTURE</h1>
                      <p className="text-gray-600 text-sm">
                        N° {selectedFacture.facture_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-600 text-sm">
                        Date d'émission
                      </div>
                      <div className="text-black text-sm font-medium">
                        {formatDate(selectedFacture.facture_date)}
                      </div>
                      <div
                        className={`mt-1 px-2 py-0.5 text-xs font-medium inline-block ${
                          selectedFacture.status === "confirmed"
                            ? "bg-green-600 text-white"
                            : selectedFacture.status === "draft"
                            ? "bg-yellow-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {selectedFacture.status === "confirmed"
                          ? "CONFIRMÉ"
                          : selectedFacture.status === "draft"
                          ? "BROUILLON"
                          : "ANNULÉ"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company and Supplier Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      VOTRE ENTREPRISE
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="font-medium">Nom de l'Entreprise</p>
                      <p>123 Rue Principale</p>
                      <p>Tunis, Tunisie</p>
                      <p>+216 12 345 678</p>
                      <p>contact@entreprise.tn</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      FOURNISSEUR
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFacture.supplier_name}
                      </p>
                      {selectedFacture.supplier_info && (
                        <p className="text-sm text-gray-600">
                          {selectedFacture.supplier_info}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    PRODUITS
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                            Produit
                          </th>
                          <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                            Quantité
                          </th>
                          <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                            Prix Unitaire
                          </th>
                          <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFactureItems(selectedFacture).map(
                          (item: FactureItem, index: number) => (
                            <tr
                              key={index}
                              className="border-b border-gray-100 hover:bg-gray-50"
                            >
                              <td className="px-4 py-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.product?.name ||
                                      `Produit #${item.product_id}`}
                                  </div>
                                  {item.product?.sku && (
                                    <div className="text-xs text-gray-500">
                                      SKU: {item.product.sku}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-600">
                                {item.quantity}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-600">
                                {formatPrice(item.unit_cost)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                {formatPrice(item.total_cost)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-right text-sm font-medium text-gray-700"
                          >
                            TOTAL:
                          </td>
                          <td className="px-4 py-3 text-right text-lg font-semibold text-gray-900">
                            {formatPrice(selectedFacture.total_amount)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Comment */}
                {selectedFacture.comment && (
                  <div className="px-6 pb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">
                      OBSERVATIONS
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 p-4">
                      <p className="text-sm text-gray-700">
                        {selectedFacture.comment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="text-center text-xs text-gray-500">
                    <p>
                      Facture générée le{" "}
                      {new Date().toLocaleDateString("fr-FR")} à{" "}
                      {new Date().toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="mt-1">Merci pour votre confiance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Facture Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Nouvelle Facture
                  </h2>
                  <p className="text-sm text-gray-600">
                    Créez une nouvelle facture fournisseur
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <BsXCircle className="w-10 h-10" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Supplier Info */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Supplier Information Card */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BsPerson className="w-4 h-4 text-gray-500" />
                      Informations Fournisseur
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nom du Fournisseur *
                        </label>
                        <input
                          type="text"
                          value={newFacture.supplier_name}
                          onChange={(e) =>
                            setNewFacture({
                              ...newFacture,
                              supplier_name: e.target.value,
                            })
                          }
                          className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Saisissez le nom du fournisseur"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Informations supplémentaires
                        </label>
                        <textarea
                          value={newFacture.supplier_info}
                          onChange={(e) =>
                            setNewFacture({
                              ...newFacture,
                              supplier_info: e.target.value,
                            })
                          }
                          className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                          rows={2}
                          placeholder="Contact, adresse, informations..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <BsTelephone className="w-3 h-3 inline mr-1" />
                            Téléphone
                          </label>
                          <input
                            type="tel"
                            value={newFacture.supplier_phone}
                            onChange={(e) =>
                              setNewFacture({
                                ...newFacture,
                                supplier_phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="+216"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            <BsEnvelope className="w-3 h-3 inline mr-1" />
                            Email
                          </label>
                          <input
                            type="email"
                            value={newFacture.supplier_email}
                            onChange={(e) =>
                              setNewFacture({
                                ...newFacture,
                                supplier_email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                            placeholder="email@exemple.com"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          <BsGeoAlt className="w-3 h-3 inline mr-1" />
                          Adresse
                        </label>
                        <input
                          type="text"
                          value={newFacture.supplier_address}
                          onChange={(e) =>
                            setNewFacture({
                              ...newFacture,
                              supplier_address: e.target.value,
                            })
                          }
                          className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date and Comment Card */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BsCalendar className="w-4 h-4 text-gray-500" />
                      Informations Facture
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Date de la Facture
                        </label>
                        <input
                          type="date"
                          value={newFacture.facture_date}
                          onChange={(e) =>
                            setNewFacture({
                              ...newFacture,
                              facture_date: e.target.value,
                            })
                          }
                          className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Commentaire
                        </label>
                        <textarea
                          value={newFacture.comment}
                          onChange={(e) =>
                            setNewFacture({
                              ...newFacture,
                              comment: e.target.value,
                            })
                          }
                          className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm resize-none"
                          rows={3}
                          placeholder="Notes supplémentaires, conditions particulières..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Products */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Product Search Card */}
                  <div className="bg-white border border-gray-200 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <BsSearch className="w-4 h-4 text-gray-500" />
                      Ajouter des Produits
                    </h3>

                    <div className="relative">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={productSearch}
                        onChange={handleProductSearchChange}
                        onFocus={handleSearchFocus}
                        className="w-full px-3 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                        placeholder="Rechercher un produit par nom, code barre, SKU..."
                      />
                      <BsSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />

                      {showSearchResults && searchResults.length > 0 && (
                        <div
                          ref={searchResultsRef}
                          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 max-h-60 overflow-y-auto"
                        >
                          {searchResults.map((product) => (
                            <div
                              key={product.id}
                              className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => addProductToItems(product)}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    SKU: {product.sku} | Stock: {product.stock}{" "}
                                    | Prix: {formatPrice(product.price)}
                                  </div>
                                  {product.category && (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      {product.category}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 ml-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 1);
                                    }}
                                    className="px-1.5 py-0.5 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                                  >
                                    +1
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      quickAddProduct(product, 5);
                                    }}
                                    className="px-1.5 py-0.5 bg-gray-600 text-white text-xs hover:bg-gray-700 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                                  >
                                    +5
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Items Table Card */}
                  {items.length > 0 && (
                    <div className="bg-white border border-gray-200">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <BsBox className="w-4 h-4 text-gray-500" />
                            Produits Ajoutés ({items.length})
                          </h3>
                          <button
                            onClick={clearAllItems}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                          >
                            <BsTrash className="w-3 h-3" />
                            Tout supprimer
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                Produit
                              </th>
                              <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                Quantité
                              </th>
                              <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                Prix Unitaire
                              </th>
                              <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                Total
                              </th>
                              <th className="px-4 py-4 text-center text-xs font-medium text-gray-500 uppercase border-b border-gray-200">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {items.map((item, index) => (
                              <tr
                                key={index}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-4 py-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.product?.name ||
                                        "Produit non trouvé"}
                                    </div>
                                    {item.product?.sku && (
                                      <div className="text-xs text-gray-500">
                                        SKU: {item.product.sku}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center justify-center space-x-1">
                                    <button
                                      onClick={() =>
                                        updateItemQuantity(
                                          index,
                                          item.quantity - 1
                                        )
                                      }
                                      disabled={item.quantity <= 1}
                                      className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateItemQuantity(
                                          index,
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      className="w-16 px-2 py-1 border border-gray-300 text-center focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                    />
                                    <button
                                      onClick={() =>
                                        updateItemQuantity(
                                          index,
                                          item.quantity + 1
                                        )
                                      }
                                      className="w-6 h-6 flex items-center justify-center border border-gray-300 hover:bg-gray-100 transition-colors text-xs"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={item.unit_cost}
                                    onChange={(e) =>
                                      updateItemUnitCost(
                                        index,
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-24 px-2 py-1 border border-gray-300 text-right focus:outline-none focus:ring-1 focus:ring-gray-400 text-sm"
                                  />
                                </td>
                                <td className="px-4 py-4 text-right text-sm font-medium text-gray-900">
                                  {formatPrice(item.total_cost)}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <button
                                    onClick={() => removeItem(index)}
                                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400"
                                    title="Supprimer"
                                  >
                                    <BsTrash className="w-3 h-3" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td
                                colSpan={3}
                                className="px-4 py-4 text-right text-sm font-medium text-gray-700"
                              >
                                TOTAL:
                              </td>
                              <td className="px-4 py-4 text-right text-lg font-semibold text-gray-900">
                                {formatPrice(calculateTotal())}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        resetForm();
                      }}
                      className="px-4 py-4 bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-50 transition-colors focus:ring-1 focus:ring-gray-400"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={createFacture}
                      disabled={
                        !newFacture.supplier_name.trim() || items.length === 0
                      }
                      className="px-4 py-4 bg-gray-600 text-white text-sm hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors border border-gray-300 focus:ring-1 focus:ring-gray-400 flex items-center gap-2"
                    >
                      <BsCheckCircle className="w-4 h-4" />
                      Créer la Facture
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}