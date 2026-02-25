"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { BsClock, BsCalendar, BsReceipt, BsSearch, BsX, BsPlus, BsArrowRight, BsArrowLeft, BsTags } from 'react-icons/bs';
import { RxDividerVertical } from "react-icons/rx";

interface Product {
  id: number;
  name: string;
  stock: number;
  price: number;
  image: string;
  barcode?: string;
  description?: string;
  sku?: string;
  cost_price?: number;
  category?: string;
}

interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  product_id: number;
}

interface ProductWithImages extends Product {
  ProductImages?: ProductImage[];
}

interface ProductsProps {
  onAddToCart?: (product: Product) => void;
}

export default function Products({ onAddToCart }: ProductsProps) {
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<ProductWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['Tous']);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const categorySearchInputRef = useRef<HTMLInputElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSearching, setIsSearching] = useState(false);

  // Products per page for table view
  const PRODUCTS_PER_PAGE = 100;

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch products from backend
  const fetchProducts = useCallback(async (searchQuery: string = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('q', searchQuery);
      }

      const response = await fetch(`http://localhost:4000/api/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);

      const productCategories = data.products
        .filter((product: ProductWithImages) => product.category && product.category.trim() !== '')
        .map((product: ProductWithImages) => product.category as string);
      
      const uniqueCategories = ['Tous', ...Array.from(new Set(productCategories)) as string[]];
      setCategories(uniqueCategories);
      setAvailableCategories(uniqueCategories.filter(cat => cat !== 'Tous'));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search on change with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (productSearchQuery || categorySearchQuery) {
        setIsSearching(true);
        const searchTerm = productSearchQuery || categorySearchQuery;
        fetchProducts(searchTerm);
        setCurrentPage(1);
      } else {
        // If both search queries are empty, fetch all products
        setIsSearching(true);
        fetchProducts('');
        setCurrentPage(1);
      }
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timeoutId);
  }, [productSearchQuery, categorySearchQuery, fetchProducts]);

  // Clear searches
  const handleClearProductSearch = () => {
    setProductSearchQuery('');
    setCategorySearchQuery(''); // Also clear category search
    setCurrentPage(1);
    productSearchInputRef.current?.focus();
  };

  const handleClearCategorySearch = () => {
    setCategorySearchQuery('');
    setProductSearchQuery(''); // Also clear product search
    setCurrentPage(1);
    categorySearchInputRef.current?.focus();
  };

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setProductSearchQuery('');
    setCategorySearchQuery('');
    setCurrentPage(1);
    // When selecting a category from buttons, we filter locally
    // No need to call fetchProducts here as we're using local filtering
  };

  // Filter products by selected category (local filtering)
  const filteredProducts = products.filter(product => {
    return selectedCategory === 'Tous' || product.category === selectedCategory;
  });

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  
  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 200;
      categoriesScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle add to cart
  const handleAddToCart = (product: Product) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  // Show search hints
  const showProductSearchHint = productSearchQuery.length === 1;

  const formattedDate = currentTime.toLocaleDateString('fr-FR');
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit'
  });

  // Get product image URL
  const getImageUrl = (product: ProductWithImages) => {
    if (product.ProductImages && product.ProductImages.length > 0) {
      const imageUrl = product.ProductImages[0].url;
      if (imageUrl && imageUrl.trim() !== '') {
        return `http://localhost:4000${imageUrl}`;
      }
    }
    if (product.image && product.image.trim() !== '') {
      if (product.image.startsWith('http')) {
        return product.image;
      } else {
        return `http://localhost:4000${product.image}`;
      }
    }
    return null;
  };

  // Reset all searches
  const handleClearAllSearches = () => {
    setSelectedCategory('Tous');
    setProductSearchQuery('');
    setCategorySearchQuery('');
    setCurrentPage(1);
    productSearchInputRef.current?.focus();
  };

  // Determine if we're currently searching
  const isCurrentlySearching = productSearchQuery || categorySearchQuery;

  if (loading && products.length === 0) {
    return (
      <div className="flex-1 py-2 sm:py-4 h-full flex flex-col">
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="text-lg animate-pulse">Chargement des produits...</div>
        </div>
      </div>
    );
  }

 if (error) {
  const skeletonCount = 8;

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      {[...Array(skeletonCount)].map((_, index) => (
        <div
          key={index}
          className="border border-gray-200  p-4 animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-18 h-18 bg-gray-200 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 py-1">
                <div className="h-4 bg-gray-200  w-3/4" />
                <div className="h-3 bg-gray-200 w-1/2" />
                <div className="flex items-center gap-4 mt-1">
                  <div className="h-4 bg-gray-200 w-1/4" />
                  <div className="h-3 bg-gray-200 w-1/3" />
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 ml-4">
              <div className="h-12 w-12 bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className='flex justify-center mx-auto'>
      <button onClick={() => fetchProducts()}
        className='block mt-2 px-6 py-4 bg-gray-600 text-white hover:bg-gray-700'>Réessayer</button>
    </div>
    </>
  );
}



  return (
    <div className="flex-1 py-2 sm:py-0 h-full flex flex-col">
      {/* Header */}
      <div className="px-2 sm:px-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-3xl font-black text-gray-800 mb-2 uppercase">
          Espace Vente
        </h1>
        
        {/* Quick Stats */}
        <div className="flex flex-row justify-between items-end xs:items-center gap-4 text-sm text-gray-600 mb-4">
         
          <span className={isSearching ? 'animate-pulse' : ''}>
  {isSearching
    ? 'Recherche en cours...'
    : `${filteredProducts.length} ${filteredProducts.length % 2 === 1 ? 'produit' : 'produits'} ${filteredProducts.length % 2 === 1 ? 'trouvé' : 'trouvés'}`}
</span>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BsCalendar className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">{formattedDate}</span>
               <BsClock className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              <span className="text-xs sm:text-sm">{formattedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Categories and Search Section */}
      <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 px-2 sm:px-4">
        {/* Categories Row */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 w-full">
            <button 
              onClick={() => scrollCategories('left')}
              className="px-4 sm:px-4 py-4  border border-gray-400 text-sm hover:bg-gray-100 flex items-center justify-center shrink-0 active:bg-gray-200 transition-colors"
            >
              <BsArrowLeft className="w-3 h-3" />
            </button>
            
            <div 
              ref={categoriesScrollRef}
              className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide flex-1 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className={`px-2 sm:px-4 py-4 sm:py-4 capitalize text-xs sm:text-sm min-w-[4rem] sm:min-w-[6rem] whitespace-nowrap shrink-0 transition-colors border ${
                    selectedCategory === category 
                      ? 'bg-gray-600 text-white border-gray-600' 
                      : 'border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <button 
              onClick={() => scrollCategories('right')}
              className="px-4 sm:px-4 py-4 border border-gray-400 text-sm hover:bg-gray-100 flex items-center justify-center shrink-0 active:bg-gray-200 transition-colors"
            >
              <BsArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Dual Search Inputs Row */}
        <div className="flex flex-col lg:flex-row gap-3 w-full">
          {/* Product Name Search */}
          <div className="flex-1">
            <label htmlFor="product-search" className="block text-xs font-medium text-gray-700 mb-1">
              Recherche par nom de produit
            </label>
            <div className="relative">
              <div className="flex items-center">
                <input
                  ref={productSearchInputRef}
                  id="product-search"
                  type="text"
                  placeholder="Rechercher un produit par nom..."
                  value={productSearchQuery}
                  onChange={(e) => {
                    setProductSearchQuery(e.target.value);
                    setCategorySearchQuery(''); // Clear category search when typing in product search
                  }}
                  className="pl-2 sm:pl-3 pr-10 py-4 border border-gray-400 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent transition-colors"
                />
                
                {productSearchQuery ? (
                  <button
                    onClick={handleClearProductSearch}
                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Effacer la recherche produit"
                  >
                    <BsX className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="absolute right-2 p-1 text-gray-400">
                    <BsSearch className="w-4 h-4" />
                  </div>
                )}
              </div>
              
              {showProductSearchHint && (
                <div className="absolute top-full left-0 right-0 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-2 p-1 mt-1 z-10">
                  La recherche se déclenche automatiquement
                </div>
              )}
            </div>
          </div>

          {/* Category Name Search */}
          <div className="flex-1">
            <label htmlFor="category-search" className="block text-xs font-medium text-gray-700 mb-1">
              Recherche par catégorie
            </label>
            <div className="relative">
              <div className="flex items-center">
                <BsTags className="absolute left-2 sm:left-3 text-gray-400 w-4 h-4" />
                <input
                  ref={categorySearchInputRef}
                  id="category-search"
                  type="text"
                  placeholder="Rechercher par nom de catégorie..."
                  value={categorySearchQuery}
                  onChange={(e) => {
                    setCategorySearchQuery(e.target.value);
                    setProductSearchQuery(''); // Clear product search when typing in category search
                  }}
                  className="pl-8 sm:pl-10 pr-10 py-4 border border-gray-400 text-sm w-full focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent transition-colors"
                  list="category-options"
                />
                
                {categorySearchQuery ? (
                  <button
                    onClick={handleClearCategorySearch}
                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Effacer la recherche catégorie"
                  >
                    <BsX className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="absolute right-2 p-1 text-gray-400">
                    <BsSearch className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Category datalist for autocomplete */}
              <datalist id="category-options">
                {availableCategories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex justify-center sm:justify-end">
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`px-3 sm:px-4 py-2 border border-gray-400 text-sm transition-colors flex items-center gap-1 ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <BsArrowLeft className="w-3 h-3" />
                <span className="hidden sm:inline">Précédent</span>
              </button>
              
              <span className="text-sm text-gray-600 px-2 min-w-[80px] text-center">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className={`px-3 sm:px-4 py-2 border border-gray-400 text-sm transition-colors flex items-center gap-1 ${
                  currentPage === totalPages 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'hover:bg-gray-100 active:bg-gray-200'
                }`}
              >
                <span className="hidden sm:inline">Suivant</span>
                <BsArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="flex-1 flex flex-col px-2 sm:px-4">
        {/* Active Filters Info */}
        {(selectedCategory !== 'Tous' || isCurrentlySearching) && (
          <div className="mb-3 sm:mb-4 text-sm text-gray-600 bg-gray-50 p-2 flex flex-wrap items-center gap-2">
            {selectedCategory !== 'Tous' && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                Catégorie: {selectedCategory}
              </span>
            )}
            {productSearchQuery && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                Produit: "{productSearchQuery}"
                <button 
                  onClick={handleClearProductSearch}
                  className="hover:text-green-900"
                  title="Effacer la recherche produit"
                >
                  <BsX className="w-3 h-3" />
                </button>
              </span>
            )}
            {categorySearchQuery && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                Catégorie: "{categorySearchQuery}"
                <button 
                  onClick={handleClearCategorySearch}
                  className="hover:text-purple-900"
                  title="Effacer la recherche catégorie"
                >
                  <BsX className="w-3 h-3" />
                </button>
              </span>
            )}
            <button 
              onClick={handleClearAllSearches}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div className="flex-1 overflow-hidden">
          {currentProducts.length === 0 && !isSearching ? (
            <div className="border-2 border-dashed border-gray-300  p-4 sm:p-8 h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
                  <BsReceipt className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Aucun produit trouvé
                </h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {isCurrentlySearching 
                    ? `Aucun produit ne correspond à votre recherche`
                    : selectedCategory !== 'Tous'
                    ? `Aucun produit dans la catégorie "${selectedCategory}"`
                    : 'Aucun produit disponible'
                  }
                </p>

                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={handleClearAllSearches}
                    className="px-4 py-2 bg-gray-600 text-white  text-sm font-medium hover:bg-gray-700 transition-colors"
                  >
                    Voir tous les produits
                  </button>
                  {isCurrentlySearching && (
                    <button
                      onClick={() => {
                        if (productSearchQuery) {
                          productSearchInputRef.current?.focus();
                        } else {
                          categorySearchInputRef.current?.focus();
                        }
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700  text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Modifier la recherche
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {isSearching ? (
                <div className="flex justify-center items-center h-full bg-gray-50 border-2 border-dashed border-gray-300 ">
                  <div className="text-lg animate-pulse">Recherche en cours...</div>
                </div>
              ) : (
                <>
                  {/* Products Grid Layout */}
                  <div className="bg-white border h-full border-gray-300 overflow-hidden">
                   
                    {/* Table Body with Two Grid Layout */}
                    <div 
                      className="overflow-y-auto scrollbar-hidden"
                      style={{ 
                        maxHeight: 'calc(100vh - 420px)',
                        minHeight: '200px'
                      }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                        {currentProducts.map((product) => {
                          const imageUrl = getImageUrl(product);
                          
                          return (
                            <div 
                              key={product.id}
                              className="border border-gray-200  p-4 hover:bg-gray-50 transition-colors"
                            >
                              {/* Product Card Layout */}
                              <div className="flex items-center justify-between">
                                {/* Left Section - Product Info */}
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  {/* Product Image */}
                                  <div className="w-18 h-18 flex items-center justify-center bg-gray-50 flex-shrink-0">
                                    {imageUrl ? (
                                      <img 
                                        src={imageUrl} 
                                        alt={product.name}
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <div className="text-gray-400">
                                        <svg 
                                          xmlns="http://www.w3.org/2000/svg" 
                                          fill="currentColor" 
                                          className="w-6 h-6" 
                                          viewBox="0 0 16 16"
                                        >
                                          <path d="M7 2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0m4.225 4.053a.5.5 0 0 0-.577.093l-3.71 4.71-2.66-2.772a.5.5 0 0 0-.63.062L.002 13v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4.5z"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Product Details */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-gray-800 truncate uppercase">
                                      {product.name}
                                    </h3>
                                    {product.category && (
                                      <p className="text-xs text-gray-500 uppercase truncate">{product.category}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-1">
                                      {/* Price */}
                                      <span className="font-bold text-gray-800 text-sm">
                                        {product.price.toFixed(3)} DT
                                      </span>
                                      
                                      {/* Stock */}
                                      <span className={`text-xs capitalize font-medium ${
                                        product.stock > 10 
                                          ? 'text-green-700' 
                                          : product.stock > 0 
                                          ? 'text-yellow-700'
                                          : 'text-red-700'
                                      }`}>
                                        {product.stock > 10 
                                          ? `${product.stock} en stock` 
                                          : product.stock > 0 
                                          ? `Stock faible: ${product.stock}`
                                          : 'Rupture de stock'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Section - Add to Cart Button */}
                                <div className="shrink-0 ml-4">
                                  <button
                                    onClick={() => handleAddToCart(product)}
                                    disabled={product.stock === 0}
                                    className={`
                                      flex items-center justify-center
                                      px-6 py-5
                                      
                                      transition-all
                                      active:scale-95
                                      touch-manipulation
                                      ${product.stock === 0 
                                        ? 'bg-gray-400 cursor-not-allowed' 
                                        : 'bg-gray-600 hover:bg-gray-700 active:bg-gray-800'
                                      } 
                                      text-white
                                      text-sm font-medium
                                    `}
                                  >
                                    <BsPlus className="w-8 h-8" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}