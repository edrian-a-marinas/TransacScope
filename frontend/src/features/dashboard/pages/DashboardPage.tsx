import { useState, useContext } from "react"
import reactLogo from "../../../assets/react.svg"
import viteLogo from "../../../assets/vite.svg"
import { AuthContext } from "../../auth/AuthContext"

export default function Dashboard() {
  const [count, setCount] = useState(0)
  const { logout } = useContext(AuthContext)

  const handleLogout = () => {
    logout()
  }

  return (
    <>
      <div>
        <title>Dashboard</title>
     
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/pages/dashboard/Dashboard.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>

      <button onClick={handleLogout}>
        Logout
      </button>

    </>
  )
}
