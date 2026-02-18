import { AuthContext } from "../contexts/AuthContext"
import { useContext } from "react"

import { Routes, Route, Navigate } from "react-router-dom"

// Pages
import Dashboard from "../pages/dashboard/Dashboard"
import Login from "../pages/auth/Login"
import Register from "../pages/auth/Register"
// import Transactions from "../pages/dashboard/Transactions"
// import Categories from "../pages/dashboard/Categories"
// import Reports from "../pages/dashboard/Reports"

function RootController() {
  const { isLoggedIn } = useContext(AuthContext)

  return isLoggedIn ? <Dashboard /> : <Login /> 
}


export default function Router() {
  const { isLoggedIn } = useContext(AuthContext)

  return (
    <Routes>
      <Route path="/" element={<RootController />} />

      <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <Login />} /> 
      <Route path="/register" element={isLoggedIn ? <Navigate to="/" /> : <Register />} />  

      {/* === Dashboard sub-pages (commented for now) === */}
      {/* <Route path="/transactions" element={<Transactions />} /> */}
      {/* <Route path="/categories" element={<Categories />} /> */}
      {/* <Route path="/reports" element={<Reports />} /> */}
    </Routes>
  )
}
