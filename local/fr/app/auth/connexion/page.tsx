"use client";

import { useState, useEffect, useRef, FC } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  BsEnvelope,
  BsEyeSlash,
  BsEye,
  BsShieldLock,
  BsArrowRight,
  BsPerson,
  BsArrowLeft
} from "react-icons/bs";
import { motion, AnimatePresence, Variants } from "framer-motion";
import Image from "next/image";
import aevelogo from "../../../assets/AEVELOGO.png";

interface Worker {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

const LoginPage: FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [error, setError] = useState("");
  const [uiState, setUiState] = useState<"overlay" | "video" | "form">("overlay");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workersLoading, setWorkersLoading] = useState(false);

  // Fetch workers when form state is active
  useEffect(() => {
    if (uiState === "form") {
      fetchWorkers();
    }
  }, [uiState]);

  const fetchWorkers = async () => {
    try {
      setWorkersLoading(true);
      const response = await axios.get("http://localhost:4000/api/auth/workers");
      
      if (response.data && Array.isArray(response.data)) {
        setWorkers(response.data);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error("Failed to fetch workers", err);
      setWorkers([]);
    } finally {
      setWorkersLoading(false);
    }
  };

  // Vérifier le token au montage
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        await axios.get("http://localhost:4000/api/auth/verify-token", {
          headers: { Authorization: `Bearer ${token}` },
        });
        router.replace("/");
      } catch {
        localStorage.removeItem("authToken");
      }
    };
    verifyToken();
  }, [router]);

  // Masquer la vidéo après 8 secondes
  useEffect(() => {
    if (uiState !== "video") return;
    const timer = setTimeout(() => setUiState("form"), 8000);
    return () => clearTimeout(timer);
  }, [uiState]);

  // Activer le son sur interaction utilisateur
  useEffect(() => {
    if (uiState !== "video") return;

    const handleUserInteraction = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
      }
      ["mousemove", "click", "keydown", "touchstart"].forEach((event) =>
        window.removeEventListener(event, handleUserInteraction)
      );
    };

    ["mousemove", "click", "keydown", "touchstart"].forEach((event) =>
      window.addEventListener(event, handleUserInteraction)
    );

    return () => {
      ["mousemove", "click", "keydown", "touchstart"].forEach((event) =>
        window.removeEventListener(event, handleUserInteraction)
      );
    };
  }, [uiState]);

  const startVideo = () => {
    setUiState("video");
    videoRef.current?.play().catch((err) => console.error(err));
  };

  // Déclencher la vidéo via clavier pour overlay
  useEffect(() => {
    if (uiState !== "overlay") return;
    const handleKeyPress = () => startVideo();
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [uiState]);

  const handleVideoEnd = () => setUiState("form");

  const handleWorkerClick = (worker: Worker) => {
    setSelectedWorker(worker);
    setWorkerPassword("");
    setError("");
  };

  const handleBackToWorkers = () => {
    setSelectedWorker(null);
    setWorkerPassword("");
    setError("");
  };

  const handleWorkerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerPassword || !selectedWorker) return;

    setWorkerLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:4000/api/auth/login",
        { 
          email: selectedWorker.email,
          password: workerPassword
        }
      );
      const { token, user } = response.data;
      
      if (user.role !== 'worker') {
        throw new Error("La connexion est réservée aux employés");
      }
      
      localStorage.setItem("authToken", token);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      
      router.push("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Mot de passe incorrect. Veuillez réessayer.");
      } else {
        setError(err.response?.data?.message || "Erreur de connexion");
      }
    } finally {
      setWorkerLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:4000/api/auth/login",
        { email, password }
      );
      const { token, user } = response.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("userName", user.name);
      localStorage.setItem("userRole", user.role);
      router.push("/");
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError(
          err.response.data.message === "email"
            ? "Email non trouvé"
            : "Mot de passe incorrect"
        );
      } else {
        setError("Erreur de connexion, veuillez réessayer plus tard");
      }
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const overlayVariants: Variants = {
    initial: { opacity: 1 },
    exit: { opacity: 0, transition: { duration: 1.2, ease: "easeInOut" } },
  };

  const overlayContentVariants: Variants = {
    initial: { opacity: 1, x: 0, scale: 1 },
    exit: {
      opacity: 0,
      x: 300,
      scale: 0.8,
      transition: { duration: 1.5, ease: "easeInOut", staggerChildren: 0.1 },
    },
  };

  const overlayItemVariants: Variants = {
    initial: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -30, transition: { duration: 0.8, ease: "easeInOut" } },
  };

  const videoContainerVariants: Variants = {
    initial: { opacity: 0, x: -300, scale: 1.1 },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: { duration: 1.5, ease: "easeInOut", delay: 0.2 },
    },
    exit: { opacity: 0, scale: 1.1, transition: { duration: 1.2, ease: "easeInOut" } },
  };

  const formContainerVariants: Variants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1, 
      transition: { 
        duration: 1.2, 
        ease: "easeInOut",
        when: "beforeChildren",
        staggerChildren: 0.1
      } 
    },
    exit: { opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } },
  };

  const formVariants: Variants = {
    initial: { opacity: 0, y: 50 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeInOut", staggerChildren: 0.1 },
    },
  };

  const formItemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeInOut" 
      } 
    },
  };

  const workerGridVariants: Variants = {
    initial: { opacity: 0, x: -50 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { 
        duration: 0.8, 
        ease: "easeInOut", 
        staggerChildren: 0.15,
        when: "beforeChildren"
      },
    },
  };

  const workerItemVariants: Variants = {
    initial: { opacity: 0, scale: 0.9, y: 30 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { 
        duration: 0.6, 
        ease: "easeInOut" 
      } 
    },
  };

  const workerFormVariants: Variants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      transition: { 
        duration: 0.5, 
        ease: "easeInOut" 
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { 
        duration: 0.3, 
        ease: "easeInOut" 
      } 
    },
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence mode="wait">
        {uiState === "overlay" && (
          <motion.div
            key="overlay"
            className="fixed inset-0 w-full h-full bg-linear-to-br from-white via-slate-100 via-slate-300 via-slate-400 via-slate-300 via-slate-100 to-white flex items-center justify-center z-50 cursor-pointer"
            onClick={startVideo}
            initial="initial"
            exit="exit"
            variants={overlayVariants}
          >
            <motion.div
              className="text-center text-black"
              variants={overlayContentVariants}
            >
<motion.h1
  className=" text-black font-black mb-8 tracking-wider bg-linear-to-r "
  variants={overlayItemVariants}
>
  <Image src={aevelogo} alt="AEVE Logo" className="inline-block w-96 h-auto" />
</motion.h1>
              <motion.p
                className="text-2xl font-light opacity-90 mb-4 tracking-widest"
                variants={overlayItemVariants}
              >
                SYSTÈME POINT DE VENTE
              </motion.p>
              <motion.p
                className="text-lg opacity-80 tracking-wide mb-12"
                variants={overlayItemVariants}
              >
                L'avenir du commerce de détail
              </motion.p>
              <motion.div className="opacity-70" variants={overlayItemVariants}>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="flex flex-col items-center space-y-2"
                >
                  <BsArrowRight className="w-8 h-8 text-white" />
                  <p className="text-sm text-white font-meduim tracking-wider">
                    CLIQUEZ OU APPUYEZ SUR UNE TOUCHE
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video */}
      <AnimatePresence mode="wait">
        {uiState === "video" && (
          <motion.div
            key="video"
            className="fixed inset-0 w-full h-full bg-black flex items-center justify-center z-40"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={videoContainerVariants}
          >
            <video
              ref={videoRef}
              className="w-full h-screen object-cover"
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnd}
            >
              <source src="/Comp.mp4" type="video/mp4" />
              Votre navigateur ne supporte pas la balise vidéo.
            </video>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence mode="wait">
        {uiState === "form" && (
          <motion.div
            key="form"
            className="min-h-screen flex flex-col lg:flex-row bg-white overflow-hidden"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={formContainerVariants}
          >
            {/* Left Side - Workers Grid (2/3 width) */}
            <motion.div
              className="w-full lg:w-2/3 bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8 overflow-y-auto"
              variants={workerGridVariants}
            >
              <div className="max-w-7xl mx-auto h-full flex flex-col">
                
                {/* Header */}
                <motion.div className="text-start px-8 mb-8" variants={workerItemVariants}>
                  <h1 className="text-4xl font-bold text-slate-800 mb-4 tracking-tight">
                    Connexion Personnel
                  </h1>
                  <p className="text-slate-600 text-xl font-light tracking-wide">
                    Sélectionnez votre profil pour vous connecter
                  </p>
                </motion.div>

                {/* Workers Grid or Password Form */}
                <div className="flex-1 flex items-start justify-center">
                  {workersLoading ? (
                    <motion.div 
                      className="text-center"
                      variants={workerItemVariants}
                    >
                      <div className="w-20 h-20 mx-auto border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-6"></div>
                      <p className="text-slate-600 text-lg">Chargement des employés...</p>
                    </motion.div>
                  ) : selectedWorker ? (
                    /* Password Input Form - Integrated in the worker panel */
                    <motion.div
                      className="w-full max-w-2xl bg-white shadow-sm p-8 border-2 border-slate-200"
                      variants={workerFormVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {/* Back Button */}
                      <button
                        onClick={handleBackToWorkers}
                        className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors mb-8 group"
                      >
                        <BsArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Retour aux employés</span>
                      </button>

                      <div className="flex items-center space-x-6 mb-8">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shadow-inner">
                          <BsPerson className="w-12 h-12 text-slate-600" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-slate-800 mb-2">
                            {selectedWorker.name}
                          </h2>
                          <p className="text-slate-500 text-lg">Entrez votre mot de passe pour vous connecter</p>
                        </div>
                      </div>

                      <form onSubmit={handleWorkerLogin} className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase">
                            MOT DE PASSE
                          </label>
                          <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                              <BsShieldLock className="w-5 h-5" />
                            </span>
                            <input
                              type={showWorkerPassword ? "text" : "password"}
                              value={workerPassword}
                              onChange={(e) => setWorkerPassword(e.target.value)}
                              className="w-full border-2 border-slate-300 pl-12 pr-12 py-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all duration-300 bg-white group-hover:bg-slate-50 text-base"
                              placeholder="••••••••"
                              required
                              autoFocus
                            />
                            <span
                              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                              onClick={() => setShowWorkerPassword(!showWorkerPassword)}
                            >
                              {showWorkerPassword ? <BsEye className="w-5 h-5" /> : <BsEyeSlash className="w-5 h-5" />}
                            </span>
                          </div>
                        </div>

                        {error && (
                          <motion.p
                            className="text-red-500 text-lg text-center font-semibold bg-red-50 py-4 px-6 border-2 border-red-200"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            {error}
                          </motion.p>
                        )}

                        <button
                          type="submit"
                          disabled={workerLoading || workerPassword.length === 0}
                          className="w-full py-5 px-6 bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg tracking-wide shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {workerLoading ? (
                            <span className="flex items-center justify-center space-x-3">
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                              />
                              <span>VÉRIFICATION...</span>
                            </span>
                          ) : (
                            "SE CONNECTER"
                          )}
                        </button>
                      </form>
                    </motion.div>
                  ) : workers && workers.length > 0 ? (
                    /* Workers Grid */
                    <motion.div
                      className="w-full"
                      variants={workerGridVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {workers.map((worker) => (
                          <motion.div
                            key={worker.id}
                            className="bg-white  p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-slate-200 hover:border-slate-300 group"
                            onClick={() => handleWorkerClick(worker)}
                            variants={workerItemVariants}
                            whileHover={{ 
                              scale: 1.03, 
                              y: -5,
                              transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex flex-col items-center text-center">
                              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mb-4 shadow-inner group-hover:from-slate-300 group-hover:to-slate-400 transition-all duration-300">
                                <BsPerson className="w-8 h-8 text-slate-600" />
                              </div>
                              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                                {worker.name}
                              </h3>
                              <h3 className="text-sm font-semibold text-slate-800 mb-2 group-hover:text-slate-900 transition-colors">
                               Utilisateur {worker.id}
                              </h3>
                              <p className="text-sm text-slate-500 bg-slate-100 px-4 py-2  font-medium mb-3">
                                Employé/e
                              </p>
                              <div className="flex items-center space-x-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                                <BsShieldLock className="w-4 h-4" />
                                <span className="text-xs">Cliquez pour vous connecter</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="text-center"
                      variants={workerItemVariants}
                    >
                      <div className="w-32 h-32 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-6">
                        <BsPerson className="w-16 h-16 text-slate-500" />
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-600 mb-4">
                        Aucun employé trouvé
                      </h3>
                      <p className="text-slate-500 text-lg">
                        Aucun compte employé n'est disponible pour le moment.
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right Side - Email/Password Form (1/3 width) */}
            <motion.div
              className="w-full lg:w-1/3 flex items-center justify-center p-8 bg-gradient-to-br from-white to-slate-50 relative border-l border-slate-200"
              variants={formVariants}
            >
              {/* Logo positioned top right */}
              <motion.div
                className="absolute top-8 "
                variants={formItemVariants}
              >
                <div className="w-32 h-32   flex items-center justify-center ">
                  <Image
                    src={aevelogo.src}
                    width={50}
                    height={50}
                    alt="Logo Afek Plus"
                    className="w-auto h-auto"
                  />
                </div>
              </motion.div>

              <div className="max-w-sm w-full">
                {/* Title */}
                <motion.div className="text-center mb-10" variants={formItemVariants}>
                  <h1 className="text-3xl font-bold text-slate-800 mb-4 tracking-tight">
                    Connexion Admin
                  </h1>
                  <p className="text-slate-600 text-lg font-light tracking-wide">
                    Accédez au panneau d'administration
                  </p>
                </motion.div>

                {/* Email/Password Form */}
                <motion.form
                  onSubmit={handleEmailLogin}
                  className="space-y-6"
                  variants={formVariants}
                >
                  {/* Email Field */}
                  <motion.div variants={formItemVariants}>
                    <label
                      htmlFor="email"
                      className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase"
                    >
                      ADRESSE E-MAIL
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                        <BsEnvelope className="w-5 h-5" />
                      </span>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border-2 border-slate-300 pl-12 pr-4 py-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all duration-300 bg-white group-hover:bg-slate-50 text-base"
                        placeholder="admin@entreprise.fr"
                        required
                      />
                    </div>
                  </motion.div>

                  {/* Password Field */}
                  <motion.div variants={formItemVariants}>
                    <label
                      htmlFor="password"
                      className="block text-sm font-bold text-slate-700 mb-3 tracking-wide uppercase"
                    >
                      MOT DE PASSE
                    </label>
                    <div className="relative group">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                        <BsShieldLock className="w-5 h-5" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border-2 border-slate-300  pl-12 pr-12 py-4 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent transition-all duration-300 bg-white group-hover:bg-slate-50 text-base"
                        placeholder="••••••••"
                        required
                      />
                      <span
                        className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <BsEye className="w-5 h-5" /> : <BsEyeSlash className="w-5 h-5" />}
                      </span>
                    </div>
                  </motion.div>

                  {/* Error Message */}
                  {error && (
                    <motion.p
                      className="text-red-500 text-base text-center font-semibold tracking-wide bg-red-50 py-3 px-4 border-2 border-red-200"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {error}
                    </motion.p>
                  )}

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 px-6 shadow-xl text-base font-bold text-white bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-400 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:scale-[1.02] active:scale-[0.98]"
                    variants={formItemVariants}
                  >
                    <span className="flex items-center justify-center space-x-3">
                      {loading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent "
                          />
                          <span>CONNEXION...</span>
                        </>
                      ) : (
                        <>
                          <span>SE CONNECTER</span>
                          <BsArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </span>
                  </motion.button>
                </motion.form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginPage;