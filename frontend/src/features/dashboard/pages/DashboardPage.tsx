// DashboardPagge.tsx starting, not finish yet
import { useState, useContext } from "react"
import { AuthContext } from "../../auth/AuthContext"
import Transactions from "./TransactionPage"
import Reports from "./ReportPage"

export default function DashboardPage() {
  const { logout, user } = useContext(AuthContext)

  if (!user) return <p>Loading...</p> 
  
  const userID = user!.id
  const userRole = user!.role_id

  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "transactions" | "reports" | "users" | "logHistory"
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
            <li>
              <button onClick={() => handleMenuClick("logHistory")}>Log History</button>
            </li>

            {userRole === 1 && (
              <li>
                <button onClick={() => handleMenuClick("users")}>Manage Users</button>
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
            <p>Welcome, {userRole === 1 ? "Admin" : "Standard"}!</p>
          </>
        )}
        {selectedMenu === "transactions" && <Transactions /> }
        {selectedMenu === "reports" && <Reports />}
        {selectedMenu === "logHistory" && <p>Log History placeholder</p>}
        {selectedMenu === "users" && userID === 1 && <p>Users management placeholder</p>}
      </main>
    </div>
  )
}