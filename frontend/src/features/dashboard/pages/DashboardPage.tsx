// DashboardPagge.tsx starting, not finish yet
import { useState, useContext } from "react"
import { AuthContext } from "../../auth/AuthContext"
import Transactions from "./TransactionPage"
import Reports from "./ReportPage"
import ManageUsers from "./ManageUserPage"
import ManageCategories from "../components/ManageCategoriesModal"

export default function DashboardPage() {
  const { logout, user } = useContext(AuthContext)

  if (!user) return <p>Loading...</p> 
  
  const userID = user!.id
  const userRole = user!.role_id

  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "transactions" | "reports" | "users" | "manageCategories" | "manageUsers"
  >("dashboard"
  )

  const handleLogout = () => {
    logout()
  }

  const handleMenuClick = (menu: typeof selectedMenu) => {
    setSelectedMenu(menu)
  }

  return (

    <div style={{ display: "flex", minHeight: "100vh" }}>
      <title>TransacScope Overview</title>
      <nav
        style={{
          width: 200,
          borderRight: "1px solid #ccc",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <img
          src="../../../../../src/assets/vite.svg"
          alt="TransacScope"
            style={{
              cursor: "pointer",
              width: "75px",  
              height: "auto",
              marginBottom: "1rem",
            }}
          onClick={() => setSelectedMenu("dashboard")}
        />
        <div>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <button onClick={() => handleMenuClick("transactions")}>Transactions</button>
            </li>
            <li>
              <button onClick={() => handleMenuClick("reports")}>Reports</button>
            </li>
            {userRole === 1 && (

              <li>
                <button onClick={() => handleMenuClick("manageCategories")}>Manage Categories</button>
                <button onClick={() => handleMenuClick("manageUsers")}>Manage Users</button>

              </li>
            )}

          </ul>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </nav>

      <main style={{ flex: 1, padding: "1rem" }}>
        {selectedMenu === "dashboard" && (
          <>
            <h1>Dashboard Overview</h1>
            <p>Welcome, {(userRole === 1 && userID === 1) ? "Super Admin": (userRole === 1 && userID !== 1) ? "Admin": "Standard"}!</p>
          </>
        )}
        {selectedMenu === "transactions" && <Transactions /> }
        {selectedMenu === "reports" && <Reports />}

        {selectedMenu === "manageCategories" && userRole === 1 && <ManageCategories onClose={() => setSelectedMenu("dashboard")} />}

        {selectedMenu === "manageUsers" && userRole === 1 && <ManageUsers />}
      </main>
    </div>
  )
}