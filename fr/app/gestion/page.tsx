"use client"
import React, { useState } from "react";
import Produit from "./Produit"
import Facture from "./Facture"
import { BsFiles } from "react-icons/bs";



const LocalPage: React.FC = () => {
  const [active, setActive] = useState<"produit" | "facture">("produit");

  const togglePage = () => {
    setActive((prev) => (prev === "produit" ? "facture" : "produit"));
  };

  return (
    <div className="">
      {/* Header */}
      <header className="flex items-center py-4 bg-white">

            <button 
            onClick={togglePage}
            className="flex items-center gap-2 px-6 py-4 mx-5 font-normal text-sm bg-transparent text-gray-500 border border-gray-500 hover:bg-gray-100 transition">
<BsFiles className="w-5 h-5" />

            {active === "produit" ? "Facture" : "Produit"}
            </button>
      </header>

      {/* Main content */}
      <main className="">
        {active === "produit" ? <Produit /> : <Facture />}
      </main>
    </div>
  );
};

export default LocalPage;
