import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App'
import Login from './pages/Login'
import Register from './pages/Register'
import Demo from './pages/Demo'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import SplashScreen from './pages/SplashScreen'
import { AppProvider } from "@/context/AppContext";

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/splash" element={<SplashScreen />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  </AppProvider>,
)
