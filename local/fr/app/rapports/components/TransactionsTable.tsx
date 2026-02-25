"use client";
import React, { useState, useEffect } from 'react';
import { BsFolder2Open, BsListUl, BsUpc, BsXLg } from 'react-icons/bs';
import { FiSearch, FiChevronLeft, FiChevronRight, FiFileText } from "react-icons/fi";

interface Order {
  id: number;
  user_id: number;
  total: number;
  tax: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_name: string;
  product_barcode?: string;
  product_category?: string;
}

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  message?: string;
}

interface Transaction {
  id: string;
  date: string;
  cashier: string;
  total_amount: string;
  paid_amount: string;
  change_amount: string;
  payment_method: string;
  status: string;
  original_id: number;
  user_id: number;
  note?: string | null;
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  orderItems: OrderItem[];
}

const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transaction,
  orderItems
}) => {
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const totalAmount = parseFloat(transaction.total_amount.replace(' DT', ''));

  // Function to handle backend printing
  const handleBackendPrint = async () => {
    if (!transaction) return;

    setPrintLoading(true);
    setPrintError(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Token d\'authentification non trouvé');
      }

      // Prepare data for printing in the format expected by the backend
      const order = {
        id: transaction.original_id,
        paid_amount: parseFloat(transaction.paid_amount.replace(' DT', '')),
        change_amount: parseFloat(transaction.change_amount.replace(' DT', '')),
        payment_method: transaction.payment_method,
        note: transaction.note,
        created_at: new Date().toISOString(),
        user_id: transaction.user_id,
        total: totalAmount,
        tax: 0
      };

      const cartItems = orderItems.map(item => ({
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        product_id: item.product_id,
        total_price: item.total_price
      }));

      const response = await fetch('http://localhost:4000/api/print', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order,
          cartItems
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de l\'impression');
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Ticket imprimé avec succès via le backend');
        // File cleanup is handled by the backend automatically
      } else {
        throw new Error(result.message || 'Échec de l\'impression');
      }

    } catch (error) {
      console.error('❌ Erreur d\'impression:', error);
      setPrintError(error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'impression');
    } finally {
      setPrintLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div dir='ltr' className="bg-white text-black p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Ticket de Facture</h2>
              <p className="text-gray-700 mt-1">Transaction #{transaction.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-black text-2xl rounded-full bg-gray-300 p-2"
            >
              <BsXLg  className='w-4 h-4' />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Date</p>
              <p>{transaction.date}</p>
            </div>
            <div>
              <p className="text-gray-600">Caissier</p>
              <p>{transaction.cashier}</p>
            </div>
            <div>
              <p className="text-gray-600">Méthode de Paiement</p>
              <p>{transaction.payment_method}</p>
            </div>
            <div>
              <p className="text-gray-600">Statut</p>
              <p>{transaction.status}</p>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div dir='ltr' className="p-6">
          <h3 className="text-lg font-semibold mb-4">Produits Achetés</h3>
          
          {orderItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun produit pour cette facture</p>
          ) : (
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-600 border-b border-dashed border-gray-300 pb-2">
                <div className="col-span-6">Produit</div>
                <div className="col-span-2 text-center">Quantité</div>
                <div className="col-span-2 text-right">Prix Unitaire</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {/* Products */}
              {orderItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 text-sm border-b border-gray-300 pb-3">
                  <div className="col-span-6">
                    <p className="font-medium">{item.product_name}</p>
                    {item.product_barcode && (
                      <p className="flex items-center text-xs text-gray-500"><BsUpc className='w-5 h-5' />{item.product_barcode}</p>
                    )}
                    {item.product_category && (
                      <p className="flex items-center gap-2 text-xs text-gray-500">Catégorie: {item.product_category}</p>
                    )}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">{item.quantity}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    {item.unit_price.toFixed(3)} DT
                  </div>
                  <div className="col-span-2 text-right font-medium">
                    {item.total_price.toFixed(3)} DT
                  </div>
                </div>
              ))}

              {/* Totals - NO TAX */}
              <div className="space-y-2 pt-4 border-t border-dashed border-gray-300">
                <div className="flex justify-between text-sm">
                  <span>Sous-total:</span>
                  <span>{calculateSubtotal().toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-dashed border-gray-300 pt-2">
                  <span>Total:</span>
                  <span>{totalAmount.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Montant Payé:</span>
                  <span>{transaction.paid_amount}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-900">
                  <span>Monnaie Rendu:</span>
                  <span>{transaction.change_amount}</span>
                </div>
              </div>

              {/* Note if exists */}
              {transaction.note && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-medium text-yellow-800">Note:</p>
                  <p className="text-sm text-yellow-700">{transaction.note}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 rounded-b-lg border-t">
          <div className="flex justify-end gap-2">
            {printError && (
              <div className="flex-1">
                <p className="text-red-600 text-sm">{printError}</p>
              </div>
            )}
            <button
              onClick={handleBackendPrint}
              disabled={printLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 disabled:bg-gray-400 rounded transition-colors"
            >
              {printLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Impression en cours...
                </>
              ) : (
                <>
                  <FiFileText className="w-4 h-4" />
                  Imprimer le Ticket
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransactionsTable: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [currentTransactions, setCurrentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPerPage] = useState(5);
  const [users, setUsers] = useState<Map<number, User>>(new Map());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const tableHeaders = [
    "Numéro de Transaction",
    "Date et Heure",
    "Caissier",
    "Montant Total",
    "Montant Payé",
    "Monnaie Rendu",
    "Méthode de Paiement",
    "Statut",
    "Détails"
  ];

  // Fetch ALL users (not just workers) to get cashier names
  const fetchUsers = async (): Promise<Map<number, User>> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Token d\'authentification non trouvé');
      }

      // Changed from /api/users/workers to /api/users to get ALL users
      const response = await fetch('http://localhost:4000/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Échec de la récupération des utilisateurs: ${response.status}`);
      }

      const data = await response.json();
      const usersMap = new Map<number, User>();
      
    /*   console.log('📋 [fetchUsers] API Response:', data);
       */
      // Handle different possible response structures
      const usersArray = data.users || data.workers || data || [];
      
      usersArray.forEach((user: User) => {
        usersMap.set(user.id, user);
/*         console.log(`👤 [fetchUsers] Added user: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
 */      });

      console.log(`✅ [fetchUsers] Created users map with ${usersMap.size} users`);
      return usersMap;
    } catch (error) {
      console.error('❌ [fetchUsers] Erreur lors de la récupération des utilisateurs:', error);
      return new Map();
    }
  };

  const fetchOrderItems = async (orderId: number): Promise<OrderItem[]> => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Token d\'authentification non trouvé');

      const response = await fetch(`http://localhost:4000/api/orders/${orderId}/items`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        const errorText = await response.text();
        throw new Error(`Échec de la récupération des détails de la commande: ${response.status}`);
      }

      const data = await response.json();
      return data.success && data.items ? data.items : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de la commande:', error);
      return [];
    }
  };

  const handleTicketClick = async (transaction: Transaction) => {
    setModalLoading(true);
    setModalError(null);
    setSelectedTransaction(transaction);
    
    try {
      const items = await fetchOrderItems(transaction.original_id);
      setOrderItems(items);
      
      if (items.length === 0) setModalError('Aucun détail pour cette transaction');
    } catch (error) {
      console.error('Erreur lors du chargement des détails:', error);
      setModalError('Une erreur est survenue lors du chargement des détails');
      setOrderItems([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
    setOrderItems([]);
    setModalError(null);
  };

  useEffect(() => {
    const fetchOrdersAndUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error('Token d\'authentification non trouvé');

        // Fetch ALL users first
        const usersMap = await fetchUsers();
        setUsers(usersMap);

        // Then fetch orders
        const response = await fetch('http://localhost:4000/api/orders', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error(`Échec de la récupération des commandes: ${response.status}`);

        const data: OrdersResponse = await response.json();
        if (!data.success) throw new Error(data.message || 'Échec de la récupération des commandes');

        console.log('📦 [fetchOrdersAndUsers] Processing orders:', data.orders);

        const transformedTransactions: Transaction[] = data.orders.map(order => {
          const user = usersMap.get(order.user_id);
          
          // Debug logging
          console.log(`🔄 [fetchOrdersAndUsers] Order ${order.id} - User ID: ${order.user_id}, Found user:`, user);
          
          // Use actual user name or fallback
          const cashierName = user ? user.name : `Utilisateur ${order.user_id}`;
          
          console.log(`✅ [fetchOrdersAndUsers] Order ${order.id} - Cashier name: ${cashierName}`);
          
          return {
            id: `T${order.id.toString().padStart(3, '0')}`,
            date: new Date(order.created_at).toLocaleString('fr-FR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            cashier: cashierName,
            total_amount: `${order.total.toFixed(3)} DT`,
            paid_amount: `${order.paid_amount.toFixed(3)} DT`,
            change_amount: `${order.change_amount.toFixed(3)} DT`,
            payment_method: order.payment_method === 'cash' ? 'Espèces' : 
                           order.payment_method === 'card' ? 'Carte' : 
                           order.payment_method || 'Autre',
            status: 'Complétée',
            original_id: order.id,
            user_id: order.user_id,
            note: order.note
          };
        });

        setTransactions(transformedTransactions);
        setFilteredTransactions(transformedTransactions);
        
        console.log('🎉 [fetchOrdersAndUsers] Successfully transformed transactions');
      } catch (err) {
        console.error('❌ [fetchOrdersAndUsers] Erreur lors de la récupération des commandes:', err);
        setError(err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des transactions');
        setTransactions([]);
        setFilteredTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersAndUsers();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
      setCurrentPage(1);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = transactions.filter(transaction => 
      transaction.id.toLowerCase().includes(lowercasedSearch) ||
      transaction.cashier.toLowerCase().includes(lowercasedSearch) ||
      transaction.total_amount.toLowerCase().includes(lowercasedSearch) ||
      transaction.paid_amount.toLowerCase().includes(lowercasedSearch) ||
      transaction.payment_method.toLowerCase().includes(lowercasedSearch) ||
      transaction.original_id.toString().includes(lowercasedSearch) ||
      transaction.user_id.toString().includes(lowercasedSearch)
    );

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [searchTerm, transactions]);

  useEffect(() => {
    const indexOfLastTransaction = currentPage * transactionsPerPage;
    const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
    setCurrentTransactions(filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction));
  }, [currentPage, filteredTransactions, transactionsPerPage]);

  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const handlePrevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  useEffect(() => { setCurrentPage(1); }, [filteredTransactions]);

  if (loading) return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Historique des Transactions</h3>
      </div>
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="text-gray-600 mt-2">Chargement des transactions...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Historique des Transactions</h3>
      </div>
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">Réessayer</button>
      </div>
    </div>
  );

  return (
    <>
      <div dir='ltr' className="bg-white border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-2xl font-bold text-gray-900">Historique des Transactions</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par numéro de transaction, caissier, montant..."
                value={searchTerm}
                onChange={handleSearch}
                className="pl-10 pr-4 py-4 border border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-transparent w-full sm:w-64 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handlePrevPage} disabled={currentPage===1} className="p-4 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                <FiChevronLeft className="w-5 h-5" />
               
              </button>
              <div className="text-sm text-gray-600 min-w-20 text-center">Page {currentPage} sur {totalPages}</div>
              <button onClick={handleNextPage} disabled={currentPage===totalPages || totalPages===0} className="p-4 border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                 <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full">
            <thead className="bg-gray-50">
              <tr>{tableHeaders.map((header,index)=><th key={index} className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>)}</tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentTransactions.map((transaction,index)=>(
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">{transaction.id}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{transaction.date}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{transaction.cashier}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{transaction.total_amount}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{transaction.paid_amount}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{transaction.change_amount}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{transaction.payment_method}</td>
                  <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap"><span className="inline-flex px-4 py-4 text-xs font-semibold bg-green-100 text-black">{transaction.status}</span></td>
                  <td className="px-4 sm:px-6 py-4 text-sm whitespace-nowrap">
                    <button onClick={()=>handleTicketClick(transaction)} className="flex items-center gap-1 px-4 py-4 bg-zinc-800 text-white hover:bg-zinc-900 transition-colors text-xs" title="Voir les détails de la transaction"><FiFileText className="w-3 h-3" />Ticket</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length===0 && <div className="text-center py-8"><p className="text-gray-500">{searchTerm ? 'Aucune transaction correspondant à votre recherche' : 'Aucune transaction'}</p></div>}

          {filteredTransactions.length>0 && <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">Affichage de {(currentPage-1)*transactionsPerPage+1} à {Math.min(currentPage*transactionsPerPage, filteredTransactions.length)} sur {filteredTransactions.length} transaction{filteredTransactions.length>1 ? 's' : ''}</p>
          </div>}
        </div>
      </div>
      <TransactionDetailsModal isOpen={!!selectedTransaction} onClose={handleCloseModal} transaction={selectedTransaction} orderItems={orderItems} />

      {modalLoading && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto"></div><p className="text-gray-600 mt-2">Chargement des détails...</p></div></div>}

      {modalError && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center"><div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h3 className="text-lg font-semibold text-gray-900 mb-2">Information</h3><p className="text-gray-600 mb-4">{modalError}</p><button onClick={handleCloseModal} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">Fermer</button></div></div>}
    </>
  );
};

export default TransactionsTable;