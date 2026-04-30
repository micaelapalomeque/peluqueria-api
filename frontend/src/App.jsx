import Sidebar from "./components/Sidebar"
import Turnos from "./pages/Turnos"

function App() {
  const pagina = window.location.hash.replace("#", "") || "/"

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#1a1a1a" }}>
      <Sidebar paginaActual={pagina} />
      {pagina === "/" || pagina === "" ? <Turnos /> : (
        <div style={{ flex:1, padding:"2rem", color:"#888", fontSize:"14px" }}>
          Pantalla en construcción...
        </div>
      )}
    </div>
  )
}

export default App