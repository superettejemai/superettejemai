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
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [autoUpdateStatus, setAutoUpdateStatus] = useState<string>('');

  // Function to trigger auto-update via backend
  const triggerAutoUpdate = async () => {
    try {
      setAutoUpdateStatus('updating');
      console.log('🕐 Triggering auto-update via backend...');
      
      const response = await fetch('https://superettejemai.onrender.com/api/database/auto-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Auto-update successful:', result);
        
        // Update both state and localStorage
        const currentTime = Date.now();
        setLastUpdateTime(currentTime);
        localStorage.setItem('lastupdate', currentTime.toString());
        
        setAutoUpdateStatus('success');
        
        // Clear status after 5 seconds
        setTimeout(() => setAutoUpdateStatus(''), 5000);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Backend update failed');
      }
      
    } catch (error) {
      console.error('❌ Auto-update failed:', error);
      setAutoUpdateStatus('error');
      
      // Clear error status after 10 seconds
      setTimeout(() => setAutoUpdateStatus(''), 10000);
    }
  };

  // Function to check if update is needed based on localStorage
  const checkAndUpdateDatabase = async () => {
    try {
      const storedLastUpdate = localStorage.getItem('lastupdate');
      const currentTime = Date.now();
      
      // If no previous update or difference is more than 1 hour (3600000 ms)
      if (!storedLastUpdate || (currentTime - parseInt(storedLastUpdate)) > 300000) {
        console.log(`🕐 Update needed. Last update: ${storedLastUpdate ? new Date(parseInt(storedLastUpdate)).toLocaleString() : 'never'}`);
        await triggerAutoUpdate();
      } else {
        console.log(`⏰ No update needed. Last update: ${new Date(parseInt(storedLastUpdate)).toLocaleString()}`);
        // Update the state with the stored time
        setLastUpdateTime(parseInt(storedLastUpdate));
      }
    } catch (error) {
      console.error('Error checking update status:', error);
    }
  };

  // Check if auto-update is available
  const checkAutoUpdateAvailability = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/database/check-auto-update');
      if (response.ok) {
        const result = await response.json();
        console.log('Auto-update check:', result);
      }
    } catch (error) {
      console.log('Auto-update endpoint not available');
    }
  };

  // Initialize lastUpdateTime from localStorage on component mount
  useEffect(() => {
    const storedLastUpdate = localStorage.getItem('lastupdate');
    if (storedLastUpdate) {
      setLastUpdateTime(parseInt(storedLastUpdate));
    }
  }, []);

  // Set up interval to check every minute
  useEffect(() => {
    checkAutoUpdateAvailability(); // Check on mount
    checkAndUpdateDatabase(); // Check immediately on mount
    
    const interval = setInterval(() => {
      checkAndUpdateDatabase();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);
  
  // Original access control logic
useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem("authToken");

      try {
        // **Check device license via backend endpoint**
       /*  const deviceRes = await axios.get("http://localhost:4000/api/device/check");
        if (!deviceRes.data.valid) {
          router.replace("/auth");
          return;
        }
 */
        // Check auth token
        if (!token) {
          router.replace("/auth/connexion");
          return;
        }

        // Verify token and get user data
        const res = await axios.get("http://localhost:4000/api/auth/verify-token", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.data.valid) {
          router.replace("/auth/connexion");
          return;
        }

        // Get current user data including role
        const userRes = await axios.get("http://localhost:4000/api/users/me", {
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
