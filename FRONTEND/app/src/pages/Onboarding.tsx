import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Onboarding() {
  useEffect(() => {
    const token = localStorage.getItem("token");

    if(!token){
        window.location.replace("/login");
    }
  },[]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f8fafc] to-[#eef2ff]">

      {/* LEFT */}
      <div className="w-full lg:w-[52%] px-16 py-14 flex flex-col justify-center">

        {/* HEADER */}
        <div className="mb-10">
          <img src="/logo.png" className="h-20 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900">
            Welcome to COGNOS
          </h1>
          <p className="text-gray-500 mt-2">
            Help us understand how you better before we personalize your journey.
            <br></br>
            This short AI interview helps build your Adaptive Learner Profile.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg space-y-6"
        >
              <button
                onClick={() => { window.location.href="/interview"; }}
                className="w-full p-5 rounded-xl bg-black text-white text-lg hover:scale-[1.02] transition"
              >
                Complete onboarding interview
              </button>

              <button
                onClick={() => { sessionStorage.setItem("skippedOnboarding","true"); window.location.href="/dashboard";  }}
                className="w-full p-5 rounded-xl border text-lg hover:bg-gray-50 transition"
              >
                Skip for now
              </button>
        </motion.div>
      </div>

      {/* RIGHT */}
      <div className="hidden lg:block w-[48%] relative">
        <img src="/onboarding.png" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/10" />
      </div>
    </div>
  );
}