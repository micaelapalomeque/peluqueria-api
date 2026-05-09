import { useState, useEffect } from "react"
import Sidebar from "./components/Sidebar"
import Turnos from "./pages/Turnos"
import Clientes from "./pages/Clientes"
import Servicios from "./pages/Servicios"
import CuentaCorriente from "./pages/CuentaCorriente"
import Reportes from "./pages/Reportes"

function App() {
  const [pagina, setPagina] = useState(
    window.location.hash.replace("#", "") || ""
  )
  const [esMobile, setEsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    function handleHash() {
      setPagina(window.location.hash.replace("#", "") || "")
    }
    window.addEventListener("hashchange", handleHash)
    return () => window.removeEventListener("hashchange", handleHash)
  }, [])

  useEffect(() => {
    function handleResize() { setEsMobile(window.innerWidth <= 768) }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  function navegar(path) {
    window.location.hash = path
    setPagina(path)
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#1a1a1a" }}>
      <Sidebar paginaActual={pagina} onNavegar={navegar} />
      <div style={{ flex:1, paddingBottom:"70px" }} className="main-content">

        {esMobile && (
          <div style={{
            display:"flex", alignItems:"center", gap:"10px",
            padding:"12px 1.5rem", borderBottom:"0.5px solid #2a2a2a",
            background:"#111",
          }}>
            <img src="/logo_peluqueria.png" alt="Peluquería Isa"
              style={{ width:"40px", height:"40px", objectFit:"contain" }} />
            <span style={{ fontSize:"15px", fontWeight:500, color:"#f0f0f0" }}>
              Peluquería Isa
            </span>
          </div>
        )}

        {pagina === "" || pagina === "/" ? <Turnos />          :
         pagina === "clientes"           ? <Clientes />        :
         pagina === "servicios"          ? <Servicios />       :
         pagina === "cuenta"             ? <CuentaCorriente /> :
         pagina === "reportes"           ? <Reportes />        :
         (
          <div style={{ padding:"2rem", color:"#888", fontSize:"14px" }}>
            Pantalla en construcción...
          </div>
         )
        }
      </div>
    </div>
  )
}

export default App