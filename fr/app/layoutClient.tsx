"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Navbar from "../constants/Navbar";
import axios from "axios";

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hideNavbar = pathname.includes("/auth");
  const [checking, setChecking] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem("authToken");

      try {
        // **Check device license via backend endpoint**
        const deviceRes = await axios.get("https://superettejemai.onrender.com/api/device/check");
        if (!deviceRes.data.valid) {
          router.replace("/auth");
          return;
        }

        // Check auth token
        if (!token) {
          router.replace("/auth/connexion");
          return;
        }

        // Verify token and get user data
        const res = await axios.get("https://superettejemai.onrender.com/api/auth/verify-token", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data.valid) {
          router.replace("/auth/connexion");
          return;
        }

        // Get current user data including role
        const userRes = await axios.get("https://superettejemai.onrender.com/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = userRes.data.user;
        setUserRole(userData.role);

        // Check role-based access for specific routes
        if (pathname.includes("/gestion/edit") && userData.role === "worker") {
          router.replace("/403");
          return;
        }

      } catch (error) {
        console.error("Access check error:", error);
        router.replace("/auth/connexion");
      } finally {
        setChecking(false);
      }
    };

    if (!hideNavbar) checkAccess();
  }, [pathname, router, hideNavbar]);

  // Add route protection for client-side navigation
  useEffect(() => {
    if (
      userRole === "worker" &&
      (
        pathname.includes("/gestion") ||
        pathname.includes("/parametres")
      )
    ) {
      router.replace("/403");
    }
  }, [pathname, userRole, router]);

  if (!hideNavbar && checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main className={`min-h-full w-full mx-auto ${!hideNavbar ? "pt-16" : ""}`}>
        {children}
      </main>
    </>
  );
}
