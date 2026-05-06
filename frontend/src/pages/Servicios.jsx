import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import ModalServicio from "../components/ModalServicio"

const SERVICIOS_POR_PAGINA = 10

function Servicios() {
  const [servicios,        setServicios]        = useState([])
  const [cargando,         setCargando]         = useState(true)
  const [modalServicio,    setModalServicio]    = useState(null)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [paginaServicios,  setPaginaServicios]  = useState(1)
  const [busqueda,         setBusqueda]         = useState("")

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

  const serviciosFiltrados    = servicios
    .filter(s => mostrarInactivos ? true : s.activo)
    .filter(s => s.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  const totalPaginasServicios = Math.ceil(serviciosFiltrados.length / SERVICIOS_POR_PAGINA)
  const serviciosPagina       = serviciosFiltrados.slice(
    (paginaServicios - 1) * SERVICIOS_POR_PAGINA,
    paginaServicios * SERVICIOS_POR_PAGINA
  )

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

      {/* Buscador */}
      <div style={{ position:"relative", marginBottom:"12px" }}>
        <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color: TEMA.textoTerciario, fontSize:"14px", pointerEvents:"none" }}>🔍</span>
        <input
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPaginaServicios(1) }}
          placeholder="Buscá por nombre de servicio..."
          style={{ width:"100%", padding:"10px 12px 10px 36px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px", boxSizing:"border-box" }}
        />
      </div>

      {/* Toggle inactivos */}
      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
        <input type="checkbox" id="inactivos" checked={mostrarInactivos} onChange={e => { setMostrarInactivos(e.target.checked); setPaginaServicios(1) }} />
        <label htmlFor="inactivos" style={{ fontSize:"13px", color: TEMA.textoSecundario, cursor:"pointer" }}>
          Mostrar servicios inactivos
        </label>
      </div>

      {/* Tabla */}
      {cargando ? (
        <p style={{ color: TEMA.textoSecundario, fontSize:"14px" }}>Cargando...</p>
      ) : (
        <>
          <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
            <div style={{ display:"flex", padding:"10px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"12px", color: TEMA.textoTerciario }}>
              <span style={{ flex:3 }}>Servicio</span>
              <span style={{ flex:1, textAlign:"center" }}>Duración</span>
              <span style={{ flex:1, textAlign:"center" }}>Precio</span>
              <span style={{ flex:1, textAlign:"center" }}>Seña</span>
              <span style={{ flex:1, textAlign:"center" }}>Estado</span>
              <span style={{ flex:1, textAlign:"right" }}>Acciones</span>
            </div>

            {serviciosPagina.length === 0 ? (
              <p style={{ padding:"1.5rem", textAlign:"center", color: TEMA.textoTerciario, fontSize:"14px" }}>
                No hay servicios
              </p>
            ) : serviciosPagina.map(servicio => (
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
                <span style={{ flex:1, textAlign:"center", fontSize:"13px", color:"#f0b429" }}>
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

          {/* Paginación */}
          {totalPaginasServicios > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"1rem" }}>
              <button
                onClick={() => setPaginaServicios(p => Math.max(1, p - 1))}
                disabled={paginaServicios === 1}
                style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaServicios === 1 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaServicios === 1 ? "not-allowed" : "pointer", fontSize:"13px" }}
              >←</button>
              <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>
                Página <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{paginaServicios}</span> de <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{totalPaginasServicios}</span>
              </span>
              <button
                onClick={() => setPaginaServicios(p => Math.min(totalPaginasServicios, p + 1))}
                disabled={paginaServicios === totalPaginasServicios}
                style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaServicios === totalPaginasServicios ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaServicios === totalPaginasServicios ? "not-allowed" : "pointer", fontSize:"13px" }}
              >→</button>
            </div>
          )}
          <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", marginTop:"8px" }}>
            {serviciosFiltrados.length} servicios en total
          </p>
        </>
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