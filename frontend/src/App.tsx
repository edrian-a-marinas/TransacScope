import { ServerStatus } from "./services/useHealthCheck"
import { BrowserRouter } from "react-router-dom"
import Router from "./router"

import { AuthProvider } from "./features/auth/AuthContext"

//import './styles/dashboard.css'
//import './styles/login.css'
//import './styles/register.css'

function App() {

  return (
    <ServerStatus>
      <AuthProvider>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </AuthProvider>
    </ServerStatus> 
  )
}

export default App