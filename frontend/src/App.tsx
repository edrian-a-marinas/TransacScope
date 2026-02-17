import { BrowserRouter } from "react-router-dom"
import Router from "./router"
import './styles/dashboard.css'
//import './styles/login.css'
//import './styles/register.css'

function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  )
}

export default App