"use client";
import { useState, useEffect, useRef } from "react";
import { BsTrash3, BsClock, BsCalendar, BsUpc } from "react-icons/bs";

interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
}

interface OrderPanelProps {
  cartItems: CartItem[];
  onCartUpdate: (items: CartItem[]) => void;
  onCheckoutSuccess: (order: any) => void;
  currentSessionName?: string;
}

export default function OrderPanel({ cartItems, onCartUpdate, onCheckoutSuccess, currentSessionName }: OrderPanelProps) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [countdown, setCountdown] = useState(0);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Reset payment amount when cart changes
  useEffect(() => {
    if (cartItems.length === 0) {
      setPaymentAmount("");
      cancelCountdown();
    }
  }, [cartItems]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Focus barcode input when shown
  useEffect(() => {
    if (showBarcodeInput && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [showBarcodeInput]);

  // Handle barcode scanner input (pistol scanner acts as keyboard)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in barcode input manually
      if (document.activeElement === barcodeInputRef.current) {
        return;
      }

      // Scanner typically sends characters quickly, we can detect by timing or Enter key
      if (event.key === 'Enter' && scannedBarcode) {
        // Scanner finished - process the barcode
        handleBarcodeScanned(scannedBarcode);
        setScannedBarcode("");
      } else if (event.key.length === 1 && /[0-9a-zA-Z]/.test(event.key)) {
        // Accumulate barcode characters
        setScannedBarcode(prev => prev + event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scannedBarcode]);

  // Auto-clear scanned barcode after a delay (if no Enter received)
  useEffect(() => {
    if (scannedBarcode) {
      const timer = setTimeout(() => {
        setScannedBarcode("");
      }, 500); // Clear after 500ms of inactivity
      return () => clearTimeout(timer);
    }
  }, [scannedBarcode]);

  // Countdown effect
  useEffect(() => {
    if (isCountdownActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isCountdownActive && countdown === 0) {
      // Countdown finished, trigger checkout
      handleFinalCheckout();
    }
  }, [isCountdownActive, countdown]);

  const cancelCountdown = () => {
    setIsCountdownActive(false);
    setCountdown(0);
    setIsProcessing(false);
  };

  const startCountdown = () => {
    if (parseFloat(paymentAmount) < total) {
      alert("Montant insuffisant !");
      return;
    }
    setIsCountdownActive(true);
    setCountdown(10);
  };

  const handleImmediateCheckout = async () => {
    if (parseFloat(paymentAmount) < total) {
      alert("Montant insuffisant !");
      return;
    }
    
    // Cancel countdown and immediately process checkout
    setIsCountdownActive(false);
    setCountdown(0);
    await handleFinalCheckout();
  };

  const handleBarcodeScanned = async (barcode: string) => {
    if (scanLoading) return;
    
    try {
      setScanLoading(true);
      const token = localStorage.getItem('authToken');
      
      // First try exact barcode match
      const response = await fetch(`https://superettejemai.onrender.com/api/products?barcode=${encodeURIComponent(barcode)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If barcode search fails, try searching by product name as fallback
        const fallbackResponse = await fetch(`https://superettejemai.onrender.com/api/products?q=${encodeURIComponent(barcode)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!fallbackResponse.ok) {
          throw new Error('Failed to fetch product');
        }
        
        const fallbackData = await fallbackResponse.json();
        await handleProductResponse(fallbackData, barcode);
      } else {
        const data = await response.json();
        await handleProductResponse(data, barcode);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Produit non trouvé. Vérifiez le code-barres.');
    } finally {
      setScanLoading(false);
      setScannedBarcode("");
      setBarcodeInput("");
      setShowBarcodeInput(false);
    }
  };

  const handleManualBarcodeSearch = () => {
    if (barcodeInput.trim()) {
      handleBarcodeScanned(barcodeInput.trim());
    }
  };

  const handleProductResponse = (data: any, barcode: string) => {
    let product = null;

    if (data.products && data.products.length > 0) {
      // If multiple products found, use the first one
      product = data.products[0];
    } else if (Array.isArray(data) && data.length > 0) {
      product = data[0];
    } else if (data.product) {
      product = data.product;
    } else if (data.id) {
      product = data;
    }

    if (product) {
      addProductToCart(product);
    } else {
      alert('Produit non trouvé');
    }
  };

  const addProductToCart = (product: any) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      onCartUpdate(
        cartItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      );
    } else {
      onCartUpdate([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          stock: product.stock,
          barcode: product.barcode,
          category: product.category
        }
      ]);
    }
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    onCartUpdate(
      cartItems.map(item =>
        item.id === id 
          ? { ...item, quantity: Math.min(newQuantity, item.stock) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    onCartUpdate(cartItems.filter(item => item.id !== id));
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal;
  const change = parseFloat(paymentAmount) - total || 0;

  const handleFinalCheckout = async () => {
    if (cartItems.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const orderItems = cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity
      }));

      const response = await fetch('https://superettejemai.onrender.com/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: orderItems,
          paid_amount: parseFloat(paymentAmount) || total,
          payment_method: 'cash'
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok || !responseData.success) {
        throw new Error(responseData.message || `Failed to create order: ${response.status}`);
      }

      // Call success handler with order data
      onCheckoutSuccess(responseData.order);
      
    } catch (error) {
      console.error('Error creating order:', error);
      alert(`Erreur lors de la création de la commande: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      setIsCountdownActive(false);
      setCountdown(0);
    }
  };

  const formattedDate = currentTime.toLocaleDateString('fr-FR');
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="w-full bg-white p-4 h-full lg:sticky lg:top-4 lg:h-[calc(100vh-11rem)] lg:overflow-hidden flex flex-col">
      {/* Barcode Scanner Section */}
      <div className="border border-gray-300 px-2 text-center mb-4 shrink-0 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <BsUpc className="w-4 h-4" />
            Scanner Code-Barres
          </h3>
          <button
            onClick={() => setShowBarcodeInput(!showBarcodeInput)}
            className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 transition-colors"
          >
            {showBarcodeInput ? 'Masquer' : 'Saisie Manuelle'}
          </button>
        </div>

        {/* Manual Barcode Input */}
        {showBarcodeInput && (
          <div className="flex gap-2 mb-2">
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualBarcodeSearch()}
              placeholder="Entrez le code-barres..."
              className="flex-1 px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <button
              onClick={handleManualBarcodeSearch}
              disabled={!barcodeInput.trim() || scanLoading}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm transition-colors"
            >
              Rechercher
            </button>
          </div>
        )}

        {/* Scanner Status */}
        <div className="text-xs">
          {scanLoading ? (
            <div className="text-blue-600 animate-pulse">Recherche du produit...</div>
          ) : scannedBarcode ? (
            <div className="text-green-600">
              Code détecté: <span className="font-mono">{scannedBarcode}</span>
            </div>
          ) : (
            <div className="text-gray-500 text-xs">
{/*               Prêt à scanner - pointez le pistolet scanner ici
 */}            </div>
          )}
        </div>
      </div>

      <h2 className="font-semibold text-lg mb-4 shrink-0">
        {cartItems.length === 0 ? 'Nouvelle Commande' : 'Panier'}
      </h2>

      {/* Products Orders Section */}
      <div className="flex-1 overflow-hidden mb-4">
        {cartItems.length === 0 ? (
            <div className="border border-gray-300 h-full flex flex-col">
            {/* Current Date & Time Display */}
            <div className="bg-gray-50 p-4 border-b border-gray-300">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <BsCalendar className="w-4 h-4" />
                  <span>{formattedDate}</span>

                </div>
                <div className="flex items-center space-x-2">
                  <BsClock className="w-4 h-4" />
                  <span>{formattedTime}</span>
                </div>
              </div>
            </div>

            {/* Empty State with Animated Skeleton */}
            <div className="flex-1 p-6 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="w-8 h-8 text-gray-400"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-2">En attente de produits...</p>
              <p className="text-gray-400 text-xs text-center">
                Scannez ou sélectionnez des produits pour commencer la vente
              </p>
              
              {/* Animated Skeleton Items */}
              <div className="w-full max-w-sm space-y-3 mt-6">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center space-x-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 w-3/4"></div>
                      <div className="h-2 bg-gray-200 w-1/2"></div>
                    </div>
                    <div className="w-12 h-6 bg-gray-200"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 h-full overflow-hidden flex flex-col">
            <div className="overflow-y-auto scrollbar-hide flex-1 p-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start mb-3 pb-3 border-b border-gray-200 last:border-b-0 last:mb-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-sm text-gray-800 truncate">
                        {item.name}
                      </p>
                    </div>
                    {item.category && (
                      <p className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                        {item.category} | <span className="flex items-center"> <BsUpc/> {item.barcode}</span>
                      </p>
                    )}
                   
                    <div className="flex items-center space-x-2 text-gray-600 my-2">
                      <label className="text-xs">Qté:</label>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-12 h-10 border border-gray-300 flex items-center justify-center text-xl hover:bg-gray-100"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          max={item.stock}
                          onChange={(e) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 1)
                          }
                          className="w-12 border border-gray-300 text-center text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none py-2.5"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className={`w-12 h-10 border border-gray-300 flex items-center justify-center text-base ${
                            item.quantity >= item.stock 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs">x {item.price.toFixed(3)} DT</span>
                    </div>
                    {item.quantity >= item.stock && (
                      <p className="text-xs text-red-600">Stock limité</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <p className="font-semibold text-sm text-gray-800 whitespace-nowrap">
                      {(item.price * item.quantity).toFixed(3)} DT
                    </p>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="px-4 py-4 text-gray-400 bg-gray-100 hover:text-red-500 transition-colors"
                    >
                      <BsTrash3 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Totals and Payment Section - ALWAYS VISIBLE */}
      <div className="shrink-0 space-y-4 border-t border-gray-200 pt-4">
        {/* Totals - Only show if there are items */}
        {cartItems.length > 0 && (
          <>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Sous-total:</span>
                <span>{subtotal.toFixed(3)} DT</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-2">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-lg">{total.toFixed(3)} DT</span>
            </div>

            {/* Payment Input */}
            <div>
              <h3 className="font-semibold mb-2">Paiement</h3>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border px-3 py-4 text-sm mb-3 focus:outline-none border-gray-300 focus:ring-1 focus:ring-gray-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <div className="flex justify-between text-sm text-gray-600 mb-4">
                <span>Monnaie à rendre:</span>
                <span className={`font-semibold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {change.toFixed(3)} DT
                </span>
              </div>
            </div>

            {/* Countdown Confirmation Section */}
            {isCountdownActive ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Impression dans <span className="font-bold text-blue-600">{countdown}s</span>
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={cancelCountdown}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
                    >
                      Annuler ({countdown}s)
                    </button>
                    <button
                      onClick={handleImmediateCheckout}
                      disabled={isProcessing}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        isProcessing
                          ? "bg-gray-400 cursor-not-allowed text-gray-200"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {isProcessing ? "Traitement..." : "Imprimer maintenant"}
                    </button>
                  </div>
                </div>
              </div>
            ) : isProcessing ? (
              /* Processing State */
              <button
                disabled
                className="w-full py-3 bg-gray-400 text-gray-200 text-sm font-medium cursor-not-allowed"
              >
                Traitement en cours...
              </button>
            ) : (
              /* Normal Checkout Button */
              <button
                onClick={startCountdown}
                disabled={cartItems.length === 0}
                className={`w-full py-3 text-sm font-medium transition-colors ${
                  cartItems.length === 0
                    ? "bg-gray-400 cursor-not-allowed text-gray-200"
                    : "bg-gray-800 hover:bg-gray-900 text-white"
                }`}
              >
                Valider et imprimer
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}