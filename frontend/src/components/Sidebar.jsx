const links = [
  { nombre: "Turnos",           path: "/" },
  { nombre: "Clientes",         path: "/clientes" },
  { nombre: "Servicios",        path: "/servicios" },
  { nombre: "Cuenta corriente", path: "/cuenta" },
]

function Sidebar({ paginaActual }) {
  return (
    <div style={{
      width: "168px",
      flexShrink: 0,
      background: "#111",
      borderRight: "0.5px solid #2a2a2a",
      padding: "1.5rem 0",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
    }}>
      <div style={{ padding: "0 1rem 1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "50%",
          background: "#CC0000", display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ width: "12px", height: "3px", background: "white", borderRadius: "2px", transform: "rotate(-30deg)" }} />
        </div>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "#f0f0f0" }}>Peluquería</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {links.map(link => {
          const activo = paginaActual === link.path
          return (
            <div
              key={link.path}
              style={{
                padding: "9px 1rem",
                fontSize: "13px",
                cursor: "pointer",
                borderLeft: activo ? "2px solid #CC0000" : "2px solid transparent",
                background: activo ? "#1e0606" : "transparent",
                color: activo ? "#CC0000" : "#888",
                fontWeight: activo ? 500 : 400,
              }}
              onClick={() => window.location.hash = link.path}
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