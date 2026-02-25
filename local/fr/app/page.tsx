"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import Products from '../components/Products/Products';
import OrderPanel from '../components/Products/OrderPanel';
import SuccessReceipt from '../components/Products/SuccessReceipt';

interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
}

interface TabSession {
  id: string;
  cartItems: CartItem[];
  createdAt: number;
  name: string;
  isActive: boolean;
  originalNumber: number;
}

export default function ProductsPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [tabSessions, setTabSessions] = useState<TabSession[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');

  // Generate unique tab ID
  const generateTabId = () => {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generate tab name with sequential numbering
  const generateTabName = (tabs: TabSession[]) => {
    const nextNumber = tabs.length + 1;
    return `Caisse ${nextNumber}`;
  };

  // Reorganize tab numbers to be sequential
  const reorganizeTabNumbers = (tabs: TabSession[]): TabSession[] => {
    return tabs.map((tab, index) => ({
      ...tab,
      name: `Caisse ${index + 1}`,
      originalNumber: index + 1
    }));
  };

  // Initialize first tab
  useEffect(() => {
    const firstTabId = generateTabId();
    const firstTab: TabSession = {
      id: firstTabId,
      cartItems: [],
      createdAt: Date.now(),
      name: 'Caisse 1',
      isActive: true,
      originalNumber: 1
    };

    setTabSessions([firstTab]);
    setActiveTabId(firstTabId);
    
    // Load cart from localStorage for first tab
    const savedCart = localStorage.getItem(`cart_${firstTabId}`);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  // Update current tab when cart changes
  useEffect(() => {
    if (activeTabId && !showSuccess) { // Only update if not in success state
      const updatedTabs = tabSessions.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, cartItems, isActive: true }
          : { ...tab, isActive: false }
      );
      
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
      localStorage.setItem(`cart_${activeTabId}`, JSON.stringify(cartItems));
    }
  }, [cartItems, activeTabId, showSuccess]);

  // Load tabs from localStorage on component mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('tabSessions');
    if (savedTabs) {
      const tabs: TabSession[] = JSON.parse(savedTabs);
      const reorganizedTabs = reorganizeTabNumbers(tabs);
      setTabSessions(reorganizedTabs);
      
      const activeTab = reorganizedTabs.find(tab => tab.isActive) || reorganizedTabs[0];
      if (activeTab) {
        setActiveTabId(activeTab.id);
        setCartItems(activeTab.cartItems);
      }
    }
  }, []);

  // Function to add product to cart
  const addToCart = (product: any) => {
    if (showSuccess) return; // Don't add to cart if in success state
    
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        );
      } else {
        return [...prevItems, {
          id: product.id,
          name: product.name,
          quantity: 1,
          price: product.price,
          stock: product.stock,
          barcode: product.barcode,
          category: product.category
        }];
      }
    });
  };

  // Update cart items
  const updateCartItems = (items: CartItem[]) => {
    if (showSuccess) return; // Don't update if in success state
    setCartItems(items);
  };

  // Add new tab
  const addNewTab = () => {
    const newTabId = generateTabId();
    const newTabName = generateTabName(tabSessions);
    
    const newTab: TabSession = {
      id: newTabId,
      cartItems: [],
      createdAt: Date.now(),
      name: newTabName,
      isActive: true,
      originalNumber: tabSessions.length + 1
    };

    const updatedTabs = tabSessions.map(tab => ({ ...tab, isActive: false }));
    updatedTabs.push(newTab);
    
    // Reorganize numbers to ensure they are sequential
    const reorganizedTabs = reorganizeTabNumbers(updatedTabs);
    
    setTabSessions(reorganizedTabs);
    setActiveTabId(newTabId);
    setCartItems([]);
    setShowSuccess(false);
    setOrderData(null);
    
    localStorage.setItem('tabSessions', JSON.stringify(reorganizedTabs));
  };

  // Switch between tabs
  const switchToTab = (tabId: string) => {
    const tab = tabSessions.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      setCartItems(tab.cartItems);
      setShowSuccess(false);
      setOrderData(null);
      
      // Update tab active states
      const updatedTabs = tabSessions.map(t => 
        t.id === tabId 
          ? { ...t, isActive: true }
          : { ...t, isActive: false }
      );
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
    }
  };

  // Close tab
  const closeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (tabSessions.length <= 1) {
      alert("Vous ne pouvez pas fermer la dernière caisse !");
      return;
    }

    const tabToClose = tabSessions.find(t => t.id === tabId);
    const updatedTabs = tabSessions.filter(t => t.id !== tabId);
    
    // Reorganize numbers to ensure they are sequential after removal
    const reorganizedTabs = reorganizeTabNumbers(updatedTabs);
    
    setTabSessions(reorganizedTabs);
    localStorage.setItem('tabSessions', JSON.stringify(reorganizedTabs));
    localStorage.removeItem(`cart_${tabId}`);
    
    // If closing active tab, switch to another tab
    if (tabId === activeTabId) {
      let newActiveTabId: string;
      
      // Try to find the tab that was next to the closed one
      const closedTabIndex = tabSessions.findIndex(t => t.id === tabId);
      if (closedTabIndex > 0) {
        // Switch to previous tab
        newActiveTabId = reorganizedTabs[closedTabIndex - 1]?.id || reorganizedTabs[0].id;
      } else {
        // Switch to first tab
        newActiveTabId = reorganizedTabs[0].id;
      }
      
      switchToTab(newActiveTabId);
    }
  };

  // Rename tab (custom name, not numbered)
  const renameTab = (tabId: string, newName: string) => {
    // Only allow custom names that don't start with "Caisse"
    if (newName.trim().toLowerCase().startsWith('caisse')) {
      alert("Les noms personnalisés ne peuvent pas commencer par 'Caisse'. Utilisez un nom différent.");
      return;
    }

    const updatedTabs = tabSessions.map(tab =>
      tab.id === tabId ? { ...tab, name: newName.trim() } : tab
    );
    
    setTabSessions(updatedTabs);
    localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
  };

  // Reset tab to numbered name
  const resetTabName = (tabId: string) => {
    const tab = tabSessions.find(t => t.id === tabId);
    if (tab) {
      const tabIndex = tabSessions.findIndex(t => t.id === tabId);
      const newName = `Caisse ${tabIndex + 1}`;
      
      const updatedTabs = tabSessions.map(t =>
        t.id === tabId ? { ...t, name: newName } : t
      );
      
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
    }
  };

  // Handle successful checkout
  const handleCheckoutSuccess = (order: any) => {
    setOrderData(order);
    setShowSuccess(true);
  };

  // Handle print ticket (confirmed payment) - RESET EVERYTHING
  const handlePrintTicket = () => {
    // Clear cart for current tab after successful order
    const currentTab = tabSessions.find(t => t.id === activeTabId);
    if (currentTab) {
      // Reset the current tab to empty state
      const updatedTabs = tabSessions.map(tab =>
        tab.id === activeTabId ? { ...tab, cartItems: [] } : tab
      );
      
      setTabSessions(updatedTabs);
      localStorage.setItem('tabSessions', JSON.stringify(updatedTabs));
      localStorage.removeItem(`cart_${activeTabId}`);
    }
    
    // Reset all states
    setCartItems([]);
    setShowSuccess(false);
    setOrderData(null);
  };

  // Handle cancel operation (keep items for editing)
  const handleCancelOperation = () => {
    setShowSuccess(false);
    setOrderData(null);
    // Cart items remain unchanged for editing
  };

  // Get current tab name for display
  const getCurrentTabName = () => {
    const tab = tabSessions.find(t => t.id === activeTabId);
    return tab?.name || 'Caisse';
  };

  // Get total items count for a tab
  const getTabItemsCount = (tab: TabSession) => {
    return tab.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Check if tab has custom name
  const hasCustomName = (tab: TabSession) => {
    return !tab.name.startsWith('Caisse ');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab Manager */}
      <div className="bg-gray-200 text-white px-4 pt-0  flex justify-between items-center border-b border-gray-300">
        <div className="flex items-center space-x-2 flex-1 overflow-x-auto">
          {tabSessions.map((tab) => (
            <div
              key={tab.id}
              onClick={() => switchToTab(tab.id)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-t-lg cursor-pointer min-w-0 max-w-xs transition-colors relative group
                ${tab.id === activeTabId
                  ? 'bg-white text-gray-800 font-semibold'
                  : 'bg-gray-600 hover:bg-gray-700'
                }
                ${showSuccess && tab.id === activeTabId ? 'border-2 border-green-500' : ''}
              `}
            >
              {/* Tab Name with Context Menu */}
              <div className="flex items-center space-x-2 flex-1" >
                <span 
                  className="truncate"
                  title={tab.name}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Renommer la caisse:', tab.name);
                    if (newName && newName.trim() && !newName.trim().toLowerCase().startsWith('caisse')) {
                      renameTab(tab.id, newName.trim());
                    } else if (newName && newName.trim().toLowerCase().startsWith('caisse')) {
                      alert("Les noms personnalisés ne peuvent pas commencer par 'Caisse'");
                    }
                  }}
                >
                  {tab.name}
                </span>
                
                {/* Reset button for custom names */}
                {hasCustomName(tab) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetTabName(tab.id);
                    }}
                    className="text-xs opacity-70 hover:opacity-100"
                    title="Rétablir le nom par défaut"
                  >
                    ↶
                  </button>
                )}
              </div>
              
              {/* Items Count Badge */}
              {getTabItemsCount(tab) > 0 && (
                <span className={`
                  rounded-full w-5 h-5 text-xs inline-flex items-center justify-center shrink-0
                  ${tab.id === activeTabId 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-500 text-white'
                  }
                `}>
                  {getTabItemsCount(tab)}
                </span>
              )}
              
              {/* Success Indicator */}
              {showSuccess && tab.id === activeTabId && (
                <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" title="Paiement réussi"></span>
              )}
              
              {/* Close Button - Only show for non-active tabs or on hover */}
              {tabSessions.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className={`
                    w-8 h-8 rounded-full flex px-4 py-2 items-center justify-center text-base transition-opacity shrink-0
                    ${tab.id === activeTabId 
                      ? 'opacity-0 group-hover:opacity-100 hover:bg-gray-200' 
                      : 'opacity-70 hover:opacity-100 hover:bg-gray-600'
                    }
                  `}
                  title="Fermer cette caisse"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex space-x-2 ml-4 shrink-0">
          <button
            onClick={addNewTab}
            className="px-3 py-2 bg-gray-600 hover:bg-green-700 rounded-t-lg text-sm flex items-center space-x-1 transition-colors"
            title="Ouvrir une nouvelle caisse"
          >
            <span className="text-lg">+</span>
            <span className="hidden sm:inline">Nouvelle Caisse</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row w-full p-2 sm:p-4 flex-1 gap-4 bg-gray-50">
        <div className="flex-1 overflow-hidden">
          <Products onAddToCart={addToCart} />
        </div>
        <div className="w-full lg:w-96 xl:w-96 2xl:w-md shrink-0">
          {showSuccess ? (
            <SuccessReceipt 
              order={orderData}
              cartItems={cartItems}
              onPrintTicket={handlePrintTicket}
              onCancelOperation={handleCancelOperation}
            />
          ) : (
            <OrderPanel 
              cartItems={cartItems} 
              onCartUpdate={updateCartItems}
              onCheckoutSuccess={handleCheckoutSuccess}
              currentSessionName={getCurrentTabName()}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
     
      {/* Status Bar */}
      <div className="bg-gray-800 text-white px-4 sm:fixed bottom-0 w-full  text-xs flex justify-between items-center shrink-0 border-t border-gray-700">
        <span className="flex items-center space-x-2">
          <span className="font-medium">{getCurrentTabName()}</span>
          <span className="text-gray-300">•</span>
          {showSuccess ? (
            <span className="text-green-300 flex items-center">
              <span className="w-2 h-2 bg-green-300 rounded-full mr-2 animate-pulse"></span>
              Paiement réussi - Prêt pour nouvelle commande
            </span>
          ) : (
            <span className="text-gray-300">
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)} article(s) • 
              {cartItems.length} produit(s) • 
              {cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(3)} DT
            </span>
          )}
        </span>
        <span className="text-gray-300 bg-gray-700 px-2 py-1 rounded text-xs">
          {tabSessions.length} caisse(s) ouverte(s)
        </span>
      </div>
    </div>
  );
}