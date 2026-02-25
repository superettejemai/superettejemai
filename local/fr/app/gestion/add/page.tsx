"use client";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";

// Définition des types pour les entrées du formulaire
interface ProductFormState {
  productName: string;
  productDescription: string;
  price: any;
  purchasePrice: any;
  category: string;
  quantityInStock: any;
  barcode: string;
  sku: string;
}

interface ProductImage {
  file: File | null;
  previewUrl: string;
}

interface BackendProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  cost_price: number;
  stock: number;
  category: string;
  barcode: string;
  sku: string;
  ProductImages?: Array<{
    id: number;
    product_id: number;
    url: string;
    is_primary: boolean;
    created_at: string;
  }>;
}

const ProductForm: React.FC = () => {
  const [formData, setFormData] = useState<ProductFormState>({
    productName: "",
    productDescription: "",
    price: "",
    purchasePrice: "",
    category: "",
    quantityInStock: "",
    barcode: "",
    sku: "",
  });

  const [productImage, setProductImage] = useState<ProductImage>({
    file: null,
    previewUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  useEffect(() => {
    fetchAvailableCategories();
  }, []);

  const fetchAvailableCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("http://localhost:4000/api/products", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        const productCategories = products
          .filter(
            (product: BackendProduct) =>
              product.category && product.category.trim() !== ""
          )
          .map((product: BackendProduct) => product.category);

        const uniqueCategories = Array.from(
          new Set(productCategories)
        ) as string[];
        setAvailableCategories(uniqueCategories);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des catégories:", error);
      setAvailableCategories([]);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, category: value }));

    if (value.trim()) {
      const filtered = availableCategories.filter((category) =>
        category.toLowerCase().includes(value.toLowerCase())
      );
      setCategorySuggestions(filtered);
      setShowCategorySuggestions(filtered.length > 0);
    } else {
      setCategorySuggestions([]);
      setShowCategorySuggestions(false);
    }
  };

  const selectCategory = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    setCategorySuggestions([]);
    setShowCategorySuggestions(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === "category") {
      handleCategoryChange(e as React.ChangeEvent<HTMLInputElement>);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]:
          name.includes("price") || name.includes("quantityInStock")
            ? Number(value)
            : value,
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Veuillez télécharger un fichier image valide",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage({
          type: "error",
          text: "La taille de l'image doit être inférieure à 5 Mo",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setProductImage({
        file,
        previewUrl,
      });
      setMessage(null);
    }
  };

  const generateSKU = (name: string) => {
    if (!name) return "";
    const prefix = name.substring(0, 3).toUpperCase().replace(/\s/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${random}`;
  };

  const handleProductNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      productName: value,
      sku: generateSKU(value),
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.productName.trim()) {
      setMessage({ type: "error", text: "Le nom du produit est requis" });
      return false;
    }
    if (formData.price <= 0) {
      setMessage({ type: "error", text: "Le prix doit être supérieur à 0" });
      return false;
    }
    if (formData.quantityInStock < 0) {
      setMessage({
        type: "error",
        text: "La quantité en stock ne peut pas être négative",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Token d'authentification non trouvé");
      }

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.productName);
      formDataToSend.append("description", formData.productDescription);
      formDataToSend.append("price", formData.price.toString());
      formDataToSend.append("cost_price", formData.purchasePrice.toString());
      formDataToSend.append("stock", formData.quantityInStock.toString());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("barcode", formData.barcode);
      formDataToSend.append(
        "sku",
        formData.sku || generateSKU(formData.productName)
      );

      if (productImage.file) {
        formDataToSend.append("productImage", productImage.file);
      }

      const response = await fetch("http://localhost:4000/api/products", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Échec de la création du produit");
      }

      const result = await response.json();

      setMessage({ type: "success", text: "Produit créé avec succès!" });

      setFormData({
        productName: "",
        productDescription: "",
        price: "",
        purchasePrice: "",
        category: "",
        quantityInStock: "",
        barcode: "",
        sku: "",
      });
      setProductImage({ file: null, previewUrl: "" });

      console.log("Produit créé:", result);
    } catch (error) {
      console.error("Erreur lors de la création du produit:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Échec de la création du produit",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const router = useRouter();
  const handleCancel = () => {
    setFormData({
      productName: "",
      productDescription: "",
      price: "",
      purchasePrice: "",
      category: "",
      quantityInStock: "",
      barcode: "",
      sku: "",
    });
    setProductImage({ file: null, previewUrl: "" });
    setMessage(null);
    setCategorySuggestions([]);
    setShowCategorySuggestions(false);
    setIsSubmitting(false);
    router.push("/gestion");
  };

  return (
    <div className="h-full bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-full max-h-[90vh] grid grid-rows-[auto_1fr] gap-4">
        {/* Display messages */}
        {message && (
          <div
            className={`p-4 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
          {/* Barcode scanning section */}
          <div className="bg-white border border-gray-300 flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800 text-center">
                Détails du produit
              </h2>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] bg-gray-50 border-2 border-dashed border-gray-300 py-10 gap-y-4 hover:border-gray-400 transition cursor-pointer">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  className="bi bi-camera w-16 h-16 text-gray-400"
                  viewBox="0 0 16 16"
                >
                  <path d="M15 12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1.172a3 3 0 0 0 2.12-.879l.83-.828A1 1 0 0 1 6.827 3h2.344a1 1 0 0 1 .707.293l.828.828A3 3 0 0 0 12.828 5H14a1 1 0 0 1 1 1zM2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4z" />
                  <path d="M8 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5m0 1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M3 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
                </svg>
                <p className="text-gray-600 text-lg font-medium text-center">
                  Scanner le code-barres du produit
                </p>
                {formData.barcode && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200">
                    <p className="text-green-700 text-sm font-medium">
                      Code-barres généré:
                    </p>
                    <p className="text-green-800 font-mono text-lg">
                      {formData.barcode}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div className="bg-white border border-gray-300 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-gray-700 text-sm font-medium">
                  Image du produit
                </label>
                <div className="flex items-end gap-4 py-3">
                  <div className="w-24 h-24 border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-sm overflow-hidden">
                    {productImage.previewUrl ? (
                      <img
                        src={productImage.previewUrl}
                        alt="Aperçu du produit"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        className="bi bi-image-alt w-8 h-8"
                        viewBox="0 0 16 16"
                      >
                        <path d="M7 2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m4.225 4.053a.5.5 0 0 0-.577.093l-3.71 4.71-2.66-2.772a.5.5 0 0 0-.63.062L.002 13v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4.5z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      id="productImage"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="productImage"
                      className="inline-flex items-center gap-2 px-4 py-4 border border-gray-300 bg-white text-gray-600 text-sm font-normal hover:bg-gray-100 transition cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="currentColor"
                        className="bi bi-upload w-4 h-4"
                        viewBox="0 0 16 16"
                      >
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
                      </svg>
                      Télécharger une image
                    </label>
                    {productImage.file && (
                      <p className="text-xs text-gray-500 mt-2">
                        {productImage.file.name} (
                        {(productImage.file.size / 1024 / 1024).toFixed(3)} MB)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom du produit *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleProductNameChange}
                    placeholder="Nom du produit aléatoire"
                    className="mt-1 w-full border border-gray-300 p-2.5 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="productDescription"
                    value={formData.productDescription}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Description du nom du produit aléatoire..."
                    className="txtarea mt-1 w-full border border-gray-300 p-2.5 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pricing and Stock Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix (DT) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="2"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Prix d'achat (DT)
                  </label>
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice}
                    onChange={handleInputChange}
                    placeholder="1"
                    min="0"
                    step="0.01"
                    className="mt-1 w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                  />
                </div>

                {/* Category Input with Suggestions */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Catégorie
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    placeholder="Catégorie"
                    className="mt-1 w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                  />
                  {showCategorySuggestions && (
                    <div className="absolute w-full bg-white border border-gray-300 mt-1 shadow-lg z-10 max-h-40 overflow-y-auto">
                      {categorySuggestions.map((category, index) => (
                        <div
                          key={index}
                          className="p-2 text-gray-700 cursor-pointer hover:bg-gray-100"
                          onClick={() => selectCategory(category)}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantité en stock
                  </label>
                  <input
                    type="number"
                    name="quantityInStock"
                    value={formData.quantityInStock}
                    onChange={handleInputChange}
                    placeholder="50"
                    min="0"
                    className="mt-1 w-full border border-gray-300 p-2.5 focus:ring-1 focus:ring-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Barcode and SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Code-barres
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    className="mt-1 w-full border border-gray-300 p-2.5 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SKU
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    className="mt-1 w-full border border-gray-300 p-2.5 text-gray-700 focus:ring-1 focus:ring-gray-500 focus:outline-none bg-gray-50"
                    readOnly
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-8 py-4 bg-gray-500 text-white hover:bg-gray-600 transition font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-4 bg-green-700 text-white hover:bg-green-800 transition font-medium disabled:bg-green-500 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Chargement..." : "Ajouter le produit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
