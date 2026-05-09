import { useState, useEffect } from "react"
import { TEMA } from "../theme"

const links = [
  { nombre: "Turnos",           path: "",          icono: "📅" },
  { nombre: "Clientes",         path: "clientes",  icono: "👤" },
  { nombre: "Servicios",        path: "servicios", icono: "✂️" },
  { nombre: "Cuenta corriente", path: "cuenta",    icono: "💰" },
  { nombre: "Reportes",         path: "reportes",  icono: "📊" },
]

function Sidebar({ paginaActual, onNavegar }) {
  const [esMobile, setEsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    function handleResize() {
      setEsMobile(window.innerWidth <= 768)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  if (esMobile) {
    return (
      <div style={{
        position:"fixed", bottom:0, left:0, right:0,
        background: TEMA.sidebar, borderTop:`0.5px solid ${TEMA.bordeSuave}`,
        display:"flex", zIndex:50,
      }}>
        {links.map(link => {
          const activo = paginaActual === link.path
          return (
            <div
              key={link.path}
              onClick={() => onNavegar(link.path)}
              style={{
                flex:1, padding:"10px 4px 14px",
                display:"flex", flexDirection:"column", alignItems:"center", gap:"4px",
                cursor:"pointer",
                color:      activo ? TEMA.primario : TEMA.textoTerciario,
                borderTop:  activo ? `2px solid ${TEMA.primario}` : "2px solid transparent",
                background: activo ? TEMA.primarioBg : "transparent",
              }}
            >
              <span style={{ fontSize:"18px" }}>{link.icono}</span>
              <span style={{ fontSize:"10px", fontWeight: activo ? 500 : 400 }}>
                {link.nombre === "Cuenta corriente" ? "Cuenta" : link.nombre}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{
      width:"168px", flexShrink:0, background: TEMA.sidebar,
      borderRight:`0.5px solid ${TEMA.bordeSuave}`, padding:"1.5rem 0",
      display:"flex", flexDirection:"column", minHeight:"100vh",
    }}>
      <div style={{ padding:"0 1rem 1.5rem", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <img src="/logo_peluqueria.png" alt="Peluquería Isa"
          style={{ width:"110px", height:"110px", objectFit:"contain" }} />
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
        {links.map(link => {
          const activo = paginaActual === link.path
          return (
            <div
              key={link.path}
              onClick={() => onNavegar(link.path)}
              style={{
                padding:"9px 1rem", fontSize:"13px", cursor:"pointer",
                borderLeft: activo ? `2px solid ${TEMA.primario}` : "2px solid transparent",
                background: activo ? TEMA.primarioBg : "transparent",
                color:      activo ? TEMA.primario : TEMA.textoSecundario,
                fontWeight: activo ? 500 : 400,
              }}
            >
              {link.nombre}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Sidebar