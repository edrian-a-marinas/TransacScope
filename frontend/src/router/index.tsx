import { Routes, Route } from "react-router-dom"

// Pages
import Dashboard from "../pages/dashboard/Dashboard"
// import Login from "../pages/auth/Login"
// import Register from "../pages/auth/Register"
// import Transactions from "../pages/dashboard/Transactions"
// import Categories from "../pages/dashboard/Categories"
// import Reports from "../pages/dashboard/Reports"

export default function Router() {
  return (
    <Routes>
      {/* === Prototyping homepage/dashboard === */}
      <Route path="/" element={<Dashboard />} />

      {/* === Auth pages === */}
      {/* <Route path="/login" element={<Login />} /> */}
      {/* <Route path="/register" element={<Register />} /> */}

      {/* === Dashboard sub-pages (commented for now) === */}
      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      {/* <Route path="/transactions" element={<Transactions />} /> */}
      {/* <Route path="/categories" element={<Categories />} /> */}
      {/* <Route path="/reports" element={<Reports />} /> */}
    </Routes>
  )
}
