"use client"
import { useState, useEffect } from "react";
import { BsBox2, BsDatabaseAdd, BsDatabaseDown, BsPeople, BsPersonGear, BsPrinter, BsTranslate, BsCloudUpload } from "react-icons/bs";
import { useRouter } from 'next/navigation';

const allTables = [
  { key: "users", label: "Utilisateurs", dependencies: ["orders", "factures"] },
  { key: "products", label: "Produits", dependencies: ["product_images", "order_items", "facture_items"] },
  { key: "orders", label: "Commandes", dependencies: ["order_items"] },
  { key: "factures", label: "Factures", dependencies: ["facture_items"] },
  { key: "templates", label: "Templates", dependencies: [] },
  { key: "audit_logs", label: "Logs d'audit", dependencies: [] },
];

export default function Page() {
  const router = useRouter();
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [tables, setTables] = useState(allTables);
  const [isUploading, setIsUploading] = useState(false);

useEffect(() => {
  setTables(allTables);
}, []);

  const toggleTable = (key: string) => {
    setSelectedTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  // Backup
  const handleBackup = async () => {
    if (!selectedTables.length) return alert("Sélectionnez au moins une table !");
    try {
      const res = await fetch('http://localhost:4000/api/backup', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: selectedTables }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup.json";
      a.click();
      setShowBackupModal(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde !");
    }
  };

  // Restore
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('http://localhost:4000/api/restore', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error("Erreur lors de la restauration");
      alert("Restauration terminée !");
      setShowRestoreModal(false);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la restauration !");
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedTables.length) return alert("Sélectionnez au moins une table !");
    try {
      const res = await fetch('http://localhost:4000/api/delete', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: selectedTables }),
      });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      alert("Suppression terminée !");
      setShowDeleteModal(false);
      setSelectedTables([]);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression !");
    }
  };

  // Upload database file
  const handleUploadDatabase = async () => {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      // Check if it's a .db file
      if (!file.name.endsWith('.db')) {
        alert("Veuillez sélectionner un fichier de base de données (.db)");
        return;
      }
      
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('database', file);
        
        const res = await fetch('https://superettejemai.onrender.com/api/change-db', {
          method: 'POST',
          body: formData,
        });
        
        if (!res.ok) throw new Error("Erreur lors de l'upload de la base de données");
        
        const result = await res.json();
        alert("Base de données mise à jour avec succès !");
        console.log("Upload result:", result);
      } catch (err) {
        console.error(err);
        alert("Erreur lors de l'upload de la base de données !");
      } finally {
        setIsUploading(false);
      }
    };
    
    input.click();
  };

  return (
    <div className="min-h-full max-w-full mx-auto">
      <div className="min-h-full bg-white p-6 text-gray-900">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-full mx-auto">
          {/* Left Side */}
          <div className="space-y-6">
            {/* Template Reçu */}
            <div className="p-5">
              <h3 className="font-bold text-lg mb-3">Template Recu</h3>
              <button
                onClick={() => router.push('/parametres/template')}
                className="w-full flex items-center justify-center bg-gray-600 text-white py-4 font-medium hover:bg-gray-700 transition space-x-2"
              >
                <BsPrinter className="w-4 h-4" />
                <span>Modifier format reçu</span>
              </button>
            </div>

            {/* Profile */}
            <div className="p-5">
              <h3 className="font-bold text-lg mb-3">Profile</h3>
              <button
                onClick={() => router.push('/parametres/update')}
                className="w-full flex items-center justify-center bg-gray-600 text-white py-4 font-medium hover:bg-gray-700 transition space-x-2"
              >
                <BsPersonGear className="w-4 h-4" />
                <span>Modifier le profile</span>
              </button>
            </div>

            {/* Utilisateur */}
            <div className="p-5">
              <h3 className="font-bold text-lg mb-3">Espace Utilisateur</h3>
              <button
                onClick={() => router.push('/parametres/users')}
                className="w-full flex items-center justify-center bg-gray-600 text-white py-4 font-medium hover:bg-gray-700 transition space-x-2"
              >
                <BsPeople className="w-4 h-4" />
                <span>Management des utilisateurs</span>
              </button>
            </div>
          </div>

          {/* Right Side */}
          <div className="space-y-8">
            {/* Contrôles de la base de données */}
            <div className="bg-gray-50 p-5">
              <h2 className="text-lg font-bold mb-4">Contrôles de la base de données</h2>
              <div className="space-y-3">
                <button
                  className="w-full flex items-center justify-center border border-gray-300 py-4 px-3 hover:bg-gray-100 transition space-x-2"
                  onClick={() => setShowBackupModal(true)}
                >
                  <BsDatabaseDown className="w-4 h-4" />
                  <span>Sauvegarder la base de données locale</span>
                </button>

                <button
                  className="w-full flex items-center justify-center border border-gray-300 py-4 px-3 hover:bg-gray-100 transition space-x-2"
                  onClick={() => setShowRestoreModal(true)}
                >
                  <BsDatabaseAdd className="w-4 h-4" />
                  <span>Restaurer la base de données locale</span>
                </button>

                <button
                  className="w-full flex items-center justify-center border border-gray-300 py-4 px-3 hover:bg-gray-100 transition space-x-2"
                  onClick={() => setShowDeleteModal(true)}
                >
                  <BsDatabaseAdd className="w-4 h-4" />
                  <span>Supprimer des tables locales</span>
                </button>

                {/* New Upload Database Button */}
               <button
                  className="w-full flex items-center justify-center border border-gray-300 py-4 px-3 hover:bg-gray-100 transition space-x-2 disabled:opacity-50"
                  onClick={handleUploadDatabase}
                  disabled={isUploading}
                >
                  <BsCloudUpload className="w-4 h-4" />
                  <span>
                    {isUploading ? "Upload en cours..." : "Mettre à jour la base de données distante"}
                  </span>
                </button> 
              </div>

              {/* Langue */}
              <div className="mt-6">
                <h3 className="font-bold mb-2">Langue</h3>
                <div className="flex items-center space-x-2">
                  <BsTranslate className="w-4 h-4" />
                  <select className="border border-gray-300 py-4 px-3 w-full text-sm focus:outline-none">
                    <option>Français</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Backup Modal */}
        {showBackupModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Confirmer la sauvegarde</h2>
              <p className="mb-3 text-base text-gray-700">
                Sélectionnez les tables à sauvegarder. Les dépendances seront incluses automatiquement.
              </p>
              <div className="max-h-60 overflow-y-auto space-y-4 mb-4">
                {tables.map(t => (
                  <label key={t.key} className="flex items-center gap-4">
                    <input type="checkbox" className="w-8 h-8" checked={selectedTables.includes(t.key)} onChange={() => toggleTable(t.key)} />
                    <span className="text-lg">{t.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-6 py-4 bg-gray-300" onClick={() => setShowBackupModal(false)}>Annuler</button>
                <button className="px-6 py-4 bg-green-700 text-white" onClick={handleBackup}>Sauvegarder</button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Modal */}
        {showRestoreModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">Confirmer la restauration</h2>
              <p className="mb-3 text-sm text-red-600 font-medium">
                ⚠️ Attention : Cette opération peut écraser des données existantes.
              </p>
              <input type="file" className="border p-2 w-full mb-4" accept=".json" onChange={handleRestore} />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-4 bg-gray-300" onClick={() => setShowRestoreModal(false)}>Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
            <div className="bg-white p-6 w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Confirmer la suppression</h2>
              <p className="mb-3 text-base text-red-600 font-medium">
                ⚠️ Attention : Cette opération supprimera définitivement les données sélectionnées !
              </p>
<div className="max-h-60 overflow-y-auto space-y-6 mb-4">
  {tables
    .filter(t => t.key !== "orders" && t.key !== "factures")
    .map(t => (
      <label key={t.key} className="flex items-center gap-4">
        <input
          type="checkbox"
           className="w-8 h-8"
          checked={selectedTables.includes(t.key)}
          onChange={() => toggleTable(t.key)}
        />
        <span className="text-lg">{t.label}</span>
      </label>
    ))}
</div>

              <div className="flex justify-end gap-2">
                <button className="px-6 py-4 bg-gray-300" onClick={() => setShowDeleteModal(false)}>Annuler</button>
                <button className="px-6 py-4 bg-red-600 text-white" onClick={handleDelete}>Supprimer</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}