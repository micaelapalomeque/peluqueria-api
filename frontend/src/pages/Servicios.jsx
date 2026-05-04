import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import ModalServicio from "../components/ModalServicio"

function Servicios() {
  const [servicios,      setServicios]      = useState([])
  const [cargando,       setCargando]       = useState(true)
  const [modalServicio,  setModalServicio]  = useState(null)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  function cargarServicios() {
    setCargando(true)
    api.get("/servicios/")
      .then(res => setServicios(res.data))
      .catch(() => setServicios([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarServicios() }, [])

  async function toggleActivo(servicio) {
    try {
      if (servicio.activo) {
        await api.patch(`/servicios/${servicio.id}/baja`)
      } else {
        await api.patch(`/servicios/${servicio.id}/alta`)
      }
      cargarServicios()
    } catch(e) { console.error(e) }
  }

  const serviciosFiltrados = servicios
    .filter(s => mostrarInactivos ? true : s.activo)

  return (
    <div style={{ flex:1, padding:"1.5rem", background: TEMA.fondo, overflowY:"auto" }}>

      {/* Encabezado */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
        <div>
          <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>Servicios</p>
          <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>
            {servicios.filter(s => s.activo).length} activos
          </p>
        </div>
        <button onClick={() => setModalServicio(false)}
          style={{ padding:"8px 16px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor:"pointer" }}>
          + Nuevo servicio
        </button>
      </div>

      {/* Toggle inactivos */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
        <input type="checkbox" id="inactivos" checked={mostrarInactivos} onChange={e => setMostrarInactivos(e.target.checked)} />
        <label htmlFor="inactivos" style={{ fontSize:"13px", color: TEMA.textoSecundario, cursor:"pointer" }}>
          Mostrar servicios inactivos
        </label>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: TEMA.textoSecundario, fontSize:"14px" }}>Cargando...</p>
      ) : (
        <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>

          <div style={{ display:"flex", padding:"10px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"12px", color: TEMA.textoTerciario }}>
            <span style={{ flex:3 }}>Servicio</span>
            <span style={{ flex:1, textAlign:"center" }}>Duración</span>
            <span style={{ flex:1, textAlign:"center" }}>Precio</span>
            <span style={{ flex:1, textAlign:"center" }}>Seña</span>
            <span style={{ flex:1, textAlign:"center" }}>Estado</span>
            <span style={{ flex:1, textAlign:"right" }}>Acciones</span>
          </div>

          {serviciosFiltrados.length === 0 ? (
            <p style={{ padding:"1.5rem", textAlign:"center", color: TEMA.textoTerciario, fontSize:"14px" }}>
              No hay servicios
            </p>
          ) : serviciosFiltrados.map(servicio => (
            <div key={servicio.id}
              style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, gap:"12px" }}
              onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ flex:3 }}>
                <p style={{ fontSize:"14px", fontWeight:500, color: servicio.activo ? TEMA.textoPrimario : TEMA.textoTerciario, margin:0 }}>
                  {servicio.nombre}
                </p>
              </div>

              <span style={{ flex:1, textAlign:"center", fontSize:"13px", color: TEMA.textoSecundario }}>
                {servicio.duracion} min
              </span>

              <span style={{ flex:1, textAlign:"center", fontSize:"13px", color: TEMA.textoPrimario, fontWeight:500 }}>
                ${Number(servicio.precio_total).toLocaleString("es-AR")}
              </span>

              <span style={{ flex:1, textAlign:"center", fontSize:"13px", color: TEMA.estados.reservado.color }}>
                ${Number(servicio.monto_senia).toLocaleString("es-AR")}
              </span>

              <div style={{ flex:1, textAlign:"center" }}>
                <span style={{
                  fontSize:"11px", padding:"3px 8px", borderRadius:"20px",
                  background: servicio.activo ? "#0a1f0a" : TEMA.superficie,
                  color:      servicio.activo ? "#44cc44" : TEMA.textoTerciario,
                  border:     `0.5px solid ${servicio.activo ? "#1a5a1a" : TEMA.borde}`,
                }}>
                  {servicio.activo ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div style={{ flex:1, display:"flex", justifyContent:"flex-end", gap:"8px" }}>
                <button onClick={() => setModalServicio(servicio)}
                  style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"12px", cursor:"pointer" }}>
                  Editar
                </button>
                <button onClick={() => toggleActivo(servicio)}
                  style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${servicio.activo ? TEMA.primarioBorder : "#1a5a1a"}`, color: servicio.activo ? TEMA.primarioHover : "#44cc44", fontSize:"12px", cursor:"pointer" }}>
                  {servicio.activo ? "Dar baja" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalServicio !== null && (
        <ModalServicio
          servicio={modalServicio || null}
          onCerrar={() => setModalServicio(null)}
          onGuardado={cargarServicios}
        />
      )}
    </div>
  )
}

export default Servicios