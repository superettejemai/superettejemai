"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../assets/AEVE.png";
import userAvatar from "../assets/user.png"
import Image from "next/image";
const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userInitials, setUserInitials] = useState("JD"); // Default initials
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Get user info from localStorage on component mount
useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);

        // ✅ Handle both name or firstName + lastName
        let initials = "JD";
        if (user.firstName || user.lastName) {
          const first = user.firstName ? user.firstName.charAt(0) : "";
          const last = user.lastName ? user.lastName.charAt(0) : "";
          initials = (first + last).toUpperCase();
        } else if (user.name) {
          // Fallback if the object has a "name" key instead
          initials = user.name
            .split(" ")
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);
        }

        setUserInitials(initials);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  // Function to check if a link is active
  const isActiveLink = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    // For other paths, check if the current path starts with the link path
    return pathname.startsWith(path);
  };

  // Function to get link styles based on active state
  const getLinkStyles = (path: string) => {
    const isActive = isActiveLink(path);
    return `${
      isActive
        ? "text-gray-600 font-bold"
        : "text-gray-500 hover:text-gray-600 font-normal"
    }`;
  };

  // Logout function
  const handleLogout = () => {
    // Remove auth token and user data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('cart'); // Optional: clear cart on logout
    
    // Close menus
    setUserMenu(false);
    setOpen(false);
    
    // Redirect to login page
    router.push('/auth/connexion');
  };

  return (
    <nav
      className={`fixed top-0 left-0 w-full border-b border-gray-300 px-4 sm:px-8 py-2 z-50 transition-all duration-300 ${
        scrolled ? "shadow-md bg-gray-100/95 backdrop-blur-sm" : "bg-gray-100"
      }`}
    >
      <div className="max-w-full mx-auto flex items-center justify-between">
        {/* Left: Logo */}
       <a href="/" className="font-bold font-mono text-gray-800">
  <Image src={Logo} alt="POS System Logo" className="w-20 h-auto" /><span className="text-[9px] ">Powered by AFEKPLUS Technologies</span>
</a>


        {/* Desktop & Tablet Links */}
        <div className="hidden sm:flex space-x-8">
          <a
            href="/"
            className={getLinkStyles("/")}
          >
          Ventes
          </a>
          <a
            href="/gestion"
            className={getLinkStyles("/gestion")}
          >
            Gestion
          </a>
          <a
            href="/rapports"
            className={getLinkStyles("/rapports")}
          >
            Rapports
          </a>
          <a
            href="/parametres"
            className={getLinkStyles("/parametres")}
          >
            Paramètres
          </a>
        </div>

        {/* Right: Aide + Avatar */}
        <div className="hidden sm:flex items-center space-x-6 relative">
          {/* Aide */}
          <a
             href="/aide"
            className={getLinkStyles("/parametres") + " flex items-center gap-1"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582
                      8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"
              />
            </svg>
            <span>Aide</span>
          </a>

          {/* Avatar Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserMenu((prev) => !prev)}
              className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-500"
              aria-haspopup="true"
              aria-expanded={userMenu}
            >
               <Image
    src={userAvatar.src}
    alt="شعار مستخدم نقاط البيع"
    fill
    className="object-cover rounded-full"
  />
            </button>

            {userMenu && (
              <div
                className="origin-top-right absolute right-0 mt-3.5 w-48 shadow-lg bg-white ring-1 ring-gray-500 ring-opacity-5 z-20 rounded-md"
                onMouseLeave={() => setUserMenu(false)}
              >
                <a
                  href="/parametres/update"
                  className="block px-4 py-4 text-gray-700 hover:bg-gray-100 border-b border-gray-100 rounded-t-md"
                >
                  Profil
                </a>
                <a
                  href="/parametres"
                  className="block px-4 py-4 text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                >
                  Paramètres
                </a>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-4 text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors rounded-b-md"
                >
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="sm:hidden text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          {!open ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="sm:hidden mt-3 border-t border-gray-200 pt-3 space-y-3">
          <div className="flex flex-col space-y-2 text-left">
            <a
              href="/"
              className={`block px-2 ${
                isActiveLink("/")
                  ? "text-black font-bold"
                  : "text-gray-500 hover:text-black font-medium"
              }`}
              onClick={() => setOpen(false)}
            >
              Accueil
            </a>
            <a
              href="/gestion"
              className={`block px-2 ${
                isActiveLink("/gestion")
                  ? "text-black font-bold"
                  : "text-gray-500 hover:text-black font-medium"
              }`}
              onClick={() => setOpen(false)}
            >
              Gestion de produits
            </a>
            <a
              href="/rapports"
              className={`block px-2 ${
                isActiveLink("/rapports")
                  ? "text-black font-bold"
                  : "text-gray-500 hover:text-black font-medium"
              }`}
              onClick={() => setOpen(false)}
            >
              Rapports
            </a>
            <a
              href="/parametres"
              className={`block px-2 ${
                isActiveLink("/parametres")
                  ? "text-black font-bold"
                  : "text-gray-500 hover:text-black font-medium"
              }`}
              onClick={() => setOpen(false)}
            >
              Paramètres
            </a>
          </div>

          <div className="flex justify-between items-center mt-4 px-2">
            {/* Aide */}
            <button
              className="flex items-center text-gray-700 hover:text-blue-600 font-medium gap-1"
              type="button"
              aria-label="Aide"
            >
              <span>Aide</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582
                      8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z"
                />
              </svg>
            </button>

            {/* Avatar */}
            <div className="relative">
              <button
                onClick={() => setUserMenu((prev) => !prev)}
                className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-gray-500"
                aria-haspopup="true"
                aria-expanded={userMenu}
              >
   <Image
    src={userAvatar.src}
    alt="شعار مستخدم نقاط البيع"
    fill
    className="object-cover rounded-full"
  />              </button>

              {userMenu && (
                <div
                  className="origin-top-right absolute right-0 mt-4 w-48 shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 rounded-md"
                  onMouseLeave={() => setUserMenu(false)}
                >
                  <a
                    href="#"
                    className="block px-4 py-4 text-gray-700 hover:bg-gray-100 border-b border-gray-100 rounded-t-md"
                    onClick={() => setUserMenu(false)}
                  >
                    Profil
                  </a>
                  <a
                    href="/parametres"
                    className="block px-4 py-4 text-gray-700 hover:bg-gray-100 border-b border-gray-100"
                    onClick={() => {
                      setUserMenu(false);
                      setOpen(false);
                    }}
                  >
                    Paramètres
                  </a>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-4 text-gray-700 hover:bg-gray-100 hover:text-red-600 transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;