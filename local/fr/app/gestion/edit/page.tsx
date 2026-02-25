"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// Définition des types pour les entrées du formulaire
interface ProductFormState {
  productName: string;
  productDescription: string;
  price: number;
  purchasePrice: number;
  category: string;
  quantityInStock: number;
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

const EditProductPage: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id");

  const [formData, setFormData] = useState<ProductFormState>({
    productName: "",
    productDescription: "",
    price: 0,
    purchasePrice: 0,
    category: "",
    quantityInStock: 0,
    barcode: "",
    sku: "",
  });

  const [productImage, setProductImage] = useState<ProductImage>({
    file: null,
    previewUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // État pour les suggestions de catégories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Récupérer les données du produit et les catégories disponibles lors du chargement du composant
  useEffect(() => {
    if (productId) {
      fetchProductData();
      fetchAvailableCategories();
    } else {
      setMessage({ type: "error", text: "ID du produit manquant" });
      setIsLoading(false);
    }
  }, [productId]);

  // Récupérer les catégories disponibles depuis l'API des produits existants
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

        // Extraire les catégories uniques des produits
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
      // Retour à un tableau vide si l'API échoue
      setAvailableCategories([]);
    }
  };

  // Gestionnaire de changement de saisie de catégorie avec suggestions
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

  // Sélectionner une catégorie depuis les suggestions
  const selectCategory = (category: string) => {
    setFormData((prev) => ({ ...prev, category }));
    setCategorySuggestions([]);
    setShowCategorySuggestions(false);
  };

  // Gestionnaire de la modale de succès et redirection
  useEffect(() => {
    if (showSuccessModal) {
      const redirectTimer = setTimeout(() => {
        router.push("/gestion");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [showSuccessModal, router]);

  // Récupérer les données du produit
  const fetchProductData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("Token d'authentification non trouvé");
      }

      const response = await fetch(
        `http://localhost:4000/api/products/${productId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Échec de la récupération du produit: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      // Gérer les structures de réponse potentielles différentes
      const productData: BackendProduct = result.product || result;

      if (!productData) {
        throw new Error("Aucune donnée produit reçue du serveur");
      }

      // Définir les données backend vers notre état de formulaire
      setFormData({
        productName: productData.name || "",
        productDescription: productData.description || "",
        price: productData.price || 0,
        purchasePrice: productData.cost_price || 0,
        category: productData.category || "",
        quantityInStock: productData.stock || 0,
        barcode: productData.barcode || "",
        sku: productData.sku || "",
      });

      // Définir l'image existante si disponible
      if (productData.ProductImages && productData.ProductImages.length > 0) {
        const primaryImage =
          productData.ProductImages.find((img: any) => img.is_primary) ||
          productData.ProductImages[0];
        const imageUrl = `http://localhost:4000${primaryImage.url}`;
        setExistingImageUrl(imageUrl);
        setProductImage((prev) => ({ ...prev, previewUrl: imageUrl }));
      } else {
        setExistingImageUrl("");
        setProductImage({ file: null, previewUrl: "" });
      }

      setMessage(null);
    } catch (error) {
      console.error("Erreur lors de la récupération du produit:", error);
      setMessage({
        type: "error",
        text: `Erreur lors du chargement du produit: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Gestionnaire de changement de saisie du formulaire
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

  // Gestionnaire de téléchargement d'image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      if (!file.type.startsWith("image/")) {
        setMessage({
          type: "error",
          text: "Veuillez télécharger un fichier image",
        });
        return;
      }

      // Vérifier la taille du fichier (5 Mo)
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
      setExistingImageUrl("");
      setMessage(null);
    }
  };

  // Validation du formulaire
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

  // Gestionnaire de soumission du formulaire pour la mise à jour
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

      // Ajouter les données du formulaire avec les noms de champs corrects pour le backend
      formDataToSend.append("name", formData.productName);
      formDataToSend.append("description", formData.productDescription);
      formDataToSend.append("price", formData.price.toString());
      formDataToSend.append("cost_price", formData.purchasePrice.toString());
      formDataToSend.append("stock", formData.quantityInStock.toString());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("barcode", formData.barcode);
      formDataToSend.append("sku", formData.sku);

      // Ajouter l'image si une nouvelle image est sélectionnée
      if (productImage.file) {
        formDataToSend.append("productImage", productImage.file);
      }

      const response = await fetch(
        `http://localhost:4000/api/products/${productId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Échec de la mise à jour du produit: ${response.status}`
        );
      }

      setShowSuccessModal(true);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du produit:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour du produit",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestionnaire d'annulation
  const handleCancel = () => {
    router.push("/gestion");
  };

  // Variables d'animation pour la modale
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: -50,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        damping: 25,
        stiffness: 300,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: 50,
      transition: {
        duration: 0.2,
      },
    },
  };

  const checkmarkVariants = {
    hidden: {
      scale: 0,
      rotate: -180,
    },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring" as const,
        stiffness: 200,
        damping: 15,
        delay: 0.2,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full h-full max-w-full max-h-[90vh] grid grid-rows-[auto_1fr] gap-4">
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            <span className="ml-4 text-gray-600">Chargement du produit...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full bg-gray-50 flex items-center justify-center p-4"
      dir="ltr"
    >
      <div className="w-full h-full max-w-full max-h-[90vh] grid grid-rows-[auto_1fr] gap-4">
        {/* Display messages - only for errors now */}
        {message && message.type === "error" && (
          <div className={`p-4 bg-red-50 border border-red-200 text-red-700`}>
            {message.text}
          </div>
        )}

        {/* Animated success modal */}
        <AnimatePresence>
          {showSuccessModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Light background with blur effect */}
              <motion.div
                className="absolute inset-0 bg-white/80 backdrop-blur-sm"
                variants={backdropVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              />

              {/* Modal content */}
              <motion.div
                className="relative bg-white p-8 mx-4 max-w-sm w-full border border-gray-100"
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="text-center">
                  {/* Animated success icon */}
                  <motion.div
                    className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6 border border-green-100"
                    variants={checkmarkVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <motion.svg
                      className="h-10 w-10 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  </motion.div>

                  {/* Success message */}
                  <motion.h3
                    className="text-2xl font-bold text-gray-900 mb-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Succès!
                  </motion.h3>
                  <motion.p
                    className="text-gray-600 mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Produit mis à jour avec succès
                  </motion.p>

                  {/* Redirect message */}
                  <motion.div
                    className="text-sm text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    Redirection vers la liste des produits...
                  </motion.div>

                  {/* Progress bar */}
                  <motion.div
                    className="w-full bg-gray-200 rounded-full h-1.5 mt-4 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      className="bg-green-500 h-1.5 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.5, ease: "linear" }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <p className="text-gray-500 text-sm text-center">
                  Cliquez pour simuler le scan
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
                    ) : existingImageUrl ? (
                      <img
                        src={existingImageUrl}
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
                      {existingImageUrl
                        ? "Changer l'image"
                        : "Télécharger une image"}
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
                    onChange={handleInputChange}
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
                  {isSubmitting ? "Chargement..." : "Mettre à jour le produit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;
