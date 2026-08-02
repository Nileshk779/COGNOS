import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-white flex items-center justify-center p-[20px]">

      {/* 🔥 BACKGROUND IMAGE WRAPPER */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden">

        {/* 🖼 BACKGROUND IMAGE */}
        <img
          src="/home_back.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* 🔵 GLOW BLOBS */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-purple-400/20 rounded-full blur-3xl" />

        {/* 🔥 CENTER CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6"
        >

          {/* LOGO */}
          <img src="/logo.png" className="h-20 mb-6" />

          {/* HEADING */}
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
            Understand the learner,
            <br />
            <span className="text-gray-500">
              not just the score
            </span>
          </h1>

          {/* SUBTEXT */}
          <p className="mt-4 text-gray-600 max-w-md text-sm md:text-base">
            Replace one-size-fits-all courses with an AI that understands your goals,
            evaluates real understanding, and adapts your learning journey until you actually master it.
          </p>

          {/* 🔥 BUTTONS */}
          <div className="mt-8 flex gap-4">

            {/* LOGIN */}
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-6 py-3 rounded-xl text-white font-medium
              bg-blue-500
              shadow-lg shadow-blue-500/20
              hover:scale-105 hover:shadow-blue-500/60
              transition-all duration-300"
            >
              Login
            </button>

            {/* REGISTER */}
            <button
              onClick={() => (window.location.href = "/register")}
              className="px-6 py-3 rounded-xl text-white font-medium
              bg-purple-500
              shadow-lg shadow-purple-500/20
              hover:shadow-purple-500/60 hover:scale-105
              transition-all duration-300"
            >
              Register
            </button>

          </div>

        </motion.div>
      </div>
    </div>
  );
}