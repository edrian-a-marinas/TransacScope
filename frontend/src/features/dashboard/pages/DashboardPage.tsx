import { useState, useContext } from "react"
import { AuthContext } from "../../auth/AuthContext"

export default function DashboardPage() {
  const { logout, user } = useContext(AuthContext)

  if (!user) return <p>Loading...</p> 
  
  const userID = user!.id
  const userRole = user!.role_id

  const [selectedMenu, setSelectedMenu] = useState<
    "dashboard" | "transactions" | "categories" | "reports" | "users"
  >("dashboard"
  )

  const handleLogout = () => {
    logout()
  }

  const handleMenuClick = (menu: typeof selectedMenu) => {
    setSelectedMenu(menu)
    console.log("Selected menu:", menu)
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
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
        <div>
          <h2>TransacScope</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            <li>
              <button onClick={() => handleMenuClick("dashboard")}>Dashboard Overview</button>
            </li>
            <li>
              <button onClick={() => handleMenuClick("transactions")}>Transactions</button>
            </li>
            <li>
              <button onClick={() => handleMenuClick("categories")}>Categories</button>
            </li>
            <li>
              <button onClick={() => handleMenuClick("reports")}>Reports</button>
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
            <button onClick={() => console.log("Transaction button clicked")}>
              New Transaction (prototype)
            </button>
          </>
        )}
        {selectedMenu === "transactions" && <p>Transactions page placeholder</p>}
        {selectedMenu === "categories" && <p>Categories page placeholder</p>}
        {selectedMenu === "reports" && <p>Reports page placeholder</p>}
        {selectedMenu === "users" && userID === 1 && <p>Users management placeholder</p>}
      </main>
    </div>
  )
}