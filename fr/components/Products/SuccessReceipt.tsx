"use client";
import { BsPrinter } from "react-icons/bs";
import { useState, useEffect, useRef } from "react";

interface CartItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  stock: number;
  barcode?: string;
  category?: string;
}

interface TemplateData {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  tax_number: string;
  thank_you_message: string;
  return_policy: string;
  logo_url?: string;
  logo_path?: string;
}

interface SuccessReceiptProps {
  order: any;
  cartItems: CartItem[];
  onPrintTicket: () => void;
  onCancelOperation: () => void;
}

export default function SuccessReceipt({
  order,
  cartItems,
  onPrintTicket,
}: SuccessReceiptProps) {
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(2);
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null); // Separate error for printing
  const printExecutedRef = useRef(false);

  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString("fr-FR");
  const formattedTime = currentDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Load template data
  useEffect(() => {
    loadTemplate();
  }, []);

  // Auto-print countdown - ONLY ONCE
  useEffect(() => {
    if (hasPrinted || printExecutedRef.current) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoPrint();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [hasPrinted]);

  // 🖨️ REAL PRINT FUNCTION - WITH BETTER ERROR HANDLING
  const handleAutoPrint = async () => {
    if (hasPrinted || printExecutedRef.current) {
      console.log('🛑 Print already executed, skipping');
      return;
    }

    printExecutedRef.current = true;
    setIsPrinting(true);
    setHasPrinted(true);
    setPrintError(null); // Clear previous print errors
    
    try {
      console.log('🖨️ Sending print request...');
      console.log('📦 Cart items:', cartItems);
      console.log('💰 Order:', order);

      const response = await fetch("https://superettejemai.onrender.com/api/print", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          order: order || {}, 
          cartItems: cartItems || []
        }),
      });

      const result = await response.json();
      console.log('📄 Print response:', result);
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Print failed');
      }

      console.log('✅ Print request successful');
      
      // Success - close immediately
      onPrintTicket();
      
    } catch (err) {
      console.error("❌ Error printing receipt:", err);
      const errorMessage = err instanceof Error ? err.message : 'Printing failed';
      setPrintError(errorMessage);
    } finally {
      setIsPrinting(false);
    }
  };

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token =
        localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
      if (!token) {
        setError("Authentication required");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        "https://superettejemai.onrender.com/api/templates/current",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const templateData: TemplateData = await response.json();
        setTemplate(templateData);
      } else {
        console.warn('No template found, using default');
        setTemplate(getDefaultTemplate());
      }
    } catch (error) {
      console.error("Failed to load template:", error);
      setTemplate(getDefaultTemplate());
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultTemplate = (): TemplateData => ({
    business_name: "Nom de l'entreprise",
    address: "Adresse Line",
    phone: "+216 28-888-XXX",
    email: "",
    website: "",
    tax_number: "",
    thank_you_message: "Merci pour votre achat !",
    return_policy:
      "Retours acceptés dans un délai d'un jour avec le reçu original.",
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal;
  const paidAmount = order?.paid_amount || total;
  const change = paidAmount - total;

  const getLogoUrl = () => {
    if (template?.logo_url) return template.logo_url;
    if (template?.logo_path) return `https://superettejemai.onrender.com/${template.logo_path}`;
    return null;
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white shadow rounded p-4 h-full flex justify-center items-center">
        <div className="text-lg animate-pulse">
          Chargement du template...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow rounded p-4 h-full flex flex-col relative">
      {isPrinting && (
        <div className="absolute inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
              <BsPrinter className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Impression en cours...
            </h3>
            <p className="text-sm text-gray-600">
              Veuillez patienter pendant l'impression du ticket
            </p>
          </div>
        </div>
      )}


      {/* SUCCESS ICON */}
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          Paiement Réussi !
        </h1>
        <p className="text-sm text-gray-500">Transaction traitée avec succès</p>
      </div>

      {/* RECEIPT PREVIEW */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="w-12 h-12 border border-gray-200 rounded-md mb-2 bg-gray-50 overflow-hidden flex items-center justify-center mx-auto">
              {getLogoUrl() ? (
                <img
                  src={getLogoUrl() || ""}
                  alt="Logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <BsPrinter />
                </div>
              )}
            </div>
            <p className="font-semibold text-sm">
              {template?.business_name || "Nom de l'entreprise"}
            </p>
            <p className="text-xs text-gray-600">
              {template?.address && <>{template.address}<br/></>}
              {template?.phone && <>{template.phone}<br/></>}
              {template?.email && <>{template.email}<br/></>}
              {template?.website && <>{template.website}<br/></>}
            </p>
          </div>

          <hr className="my-3 border-gray-300" />

          {/* Products */}
          {cartItems.map((item, i) => (
            <div key={i} className="flex justify-between text-xs mb-2">
              <div>
                {item.name} x{item.quantity}
              </div>
              <div>{(item.price * item.quantity).toFixed(3)} DT</div>
            </div>
          ))}

          <hr className="my-3 border-gray-300" />
<div className="text-xs space-y-1">
  <div className="flex justify-between">
    <span>Total:</span>
    <span>{total.toFixed(3)} DT</span>
  </div>
  <div className="flex justify-between">
    <span>Montant reçu:</span> {/* Fixed from "Reçu" */}
    <span>{paidAmount.toFixed(3)} DT</span>
  </div>
  <div className="flex justify-between font-semibold">
    <span>Monnaie rendue:</span> {/* Fixed from "Monnaie" */}
    <span
      className={change >= 0 ? "text-green-600" : "text-red-600"}
    >
      {change.toFixed(3)} DT
    </span>
  </div>
</div>

          {/* Footer */}
          <div className="mt-4 text-center text-xs text-gray-700 italic">
            {template?.thank_you_message || "Merci pour votre achat !"}
            <br />
            {template?.return_policy ||
              "Retours acceptés dans un délai d'un jour avec le reçu original."}
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="text-center mt-4 text-sm text-gray-600">
        {countdown > 0 && !hasPrinted
          ? `Impression automatique dans ${countdown} seconde${
              countdown !== 1 ? "s" : ""
            }...`
          : isPrinting
          ? "Impression en cours..."
          : printError
          ? "Erreur d'impression"
          : "Impression terminée"}
      </div>

      {/* Manual close button if there's an error */}
      {printError && (
        <button
          onClick={onPrintTicket}
          className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Fermer
        </button>
      )}
    </div>
  );
}