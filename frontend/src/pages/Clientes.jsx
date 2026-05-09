import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import ModalCliente from "../components/ModalCliente"
import Swal from "sweetalert2"
import BtnExportar from "../components/BtnExportar"

const CLIENTES_POR_PAGINA   = 10
const FRECUENTES_POR_PAGINA = 10

function iniciales(nombre) {
  return nombre?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"
}

function Clientes() {
  const [clientes,         setClientes]         = useState([])
  const [cargando,         setCargando]         = useState(true)
  const [busqueda,         setBusqueda]         = useState("")
  const [pestaña,          setPestaña]          = useState("lista")
  const [modalCliente,     setModalCliente]     = useState(null)
  const [clientesBaja,     setClientesBaja]     = useState(false)
  const [frecuentes,       setFrecuentes]       = useState([])
  const [paginaClientes,   setPaginaClientes]   = useState(1)
  const [paginaFrecuentes, setPaginaFrecuentes] = useState(1)

  function cargarClientes() {
    setCargando(true)
    api.get("/clientes/")
      .then(res => setClientes(res.data.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))))
      .catch(() => setClientes([]))
      .finally(() => setCargando(false))
    api.get("/clientes/ranking/frecuentes")
      .then(res => setFrecuentes(res.data))
      .catch(() => setFrecuentes([]))
  }

  useEffect(() => { cargarClientes() }, [])

  async function toggleActivo(cliente) {
    const result = await Swal.fire({
      title: cliente.activo ? `¿Dar de baja a ${cliente.nombre}?` : `¿Activar a ${cliente.nombre}?`,
      text:  cliente.activo ? "El cliente no aparecerá en el buscador de nuevos turnos." : "El cliente volverá a estar disponible para nuevos turnos.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#CC0000",
      cancelButtonColor: "#333",
      confirmButtonText: cliente.activo ? "Sí, dar de baja" : "Sí, activar",
      cancelButtonText: "Cancelar",
      background: "#1e1e1e",
      color: "#f0f0f0",
    })
    if (!result.isConfirmed) return
    try {
      if (cliente.activo) {
        await api.patch(`/clientes/${cliente.id}/baja`)
      } else {
        await api.patch(`/clientes/${cliente.id}/alta`)
      }
      cargarClientes()
    } catch(e) { console.error(e) }
  }

  const clientesFiltrados      = clientes
    .filter(c => clientesBaja ? true : c.activo)
    .filter(c =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.celular.includes(busqueda)
    )

  const totalPaginasClientes   = Math.ceil(clientesFiltrados.length / CLIENTES_POR_PAGINA)
  const clientesPagina         = clientesFiltrados.slice(
    (paginaClientes - 1) * CLIENTES_POR_PAGINA,
    paginaClientes * CLIENTES_POR_PAGINA
  )
  const totalPaginasFrecuentes = Math.ceil(frecuentes.length / FRECUENTES_POR_PAGINA)
  const frecuentesPagina       = frecuentes.slice(
    (paginaFrecuentes - 1) * FRECUENTES_POR_PAGINA,
    paginaFrecuentes * FRECUENTES_POR_PAGINA
  )

  return (
    <div style={{ flex:1, padding:"1.5rem", background: TEMA.fondo, overflowY:"auto" }}>

      {/* Encabezado */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
        <div>
          <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>Clientes</p>
          <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>
            {clientes.filter(c => c.activo).length} activos
          </p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          <BtnExportar
            nombreArchivo="clientes_peluqueria"
            titulo="Listado de Clientes"
            columnas={["Nombre", "Celular", "Estado", "Fecha alta", "Observacion"]}
            filas={clientesFiltrados.map(c => [
              c.nombre,
              c.celular,
              c.activo ? "Activo" : "Inactivo",
              new Date(c.fecha_alta).toLocaleDateString("es-AR"),
              c.observacion || "",
            ])}
          />
          <button onClick={() => setModalCliente(false)}
            style={{ padding:"8px 16px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor:"pointer" }}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* Pestañas */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"1.25rem" }}>
        {["lista", "frecuentes"].map(tab => (
          <button key={tab} onClick={() => setPestaña(tab)}
            style={{
              padding:"6px 14px", borderRadius:"6px", fontSize:"13px", cursor:"pointer",
              border:     pestaña === tab ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
              background: pestaña === tab ? TEMA.primarioBg : TEMA.superficie,
              color:      pestaña === tab ? TEMA.primarioHover : TEMA.textoSecundario,
            }}>
            {tab === "lista" ? "Lista" : "Más frecuentes"}
          </button>
        ))}
      </div>

      {/* ── LISTA ── */}
      {pestaña === "lista" && (
        <>
          <div style={{ position:"relative", marginBottom:"12px" }}>
            <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color: TEMA.textoTerciario, fontSize:"14px", pointerEvents:"none" }}>🔍</span>
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPaginaClientes(1) }}
              placeholder="Buscá por nombre o celular..."
              style={{ width:"100%", padding:"10px 12px 10px 36px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px", boxSizing:"border-box" }}
            />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"12px" }}>
            <input type="checkbox" id="inactivos" checked={clientesBaja} onChange={e => { setClientesBaja(e.target.checked); setPaginaClientes(1) }} />
            <label htmlFor="inactivos" style={{ fontSize:"13px", color: TEMA.textoSecundario, cursor:"pointer" }}>
              Mostrar clientes inactivos
            </label>
          </div>

          {cargando ? (
            <p style={{ color: TEMA.textoSecundario, fontSize:"14px" }}>Cargando...</p>
          ) : (
            <>
              <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
                <div style={{ display:"flex", padding:"10px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"12px", color: TEMA.textoTerciario }}>
                  <span style={{ flex:3 }}>Cliente</span>
                  <span style={{ flex:2 }}>Celular</span>
                  <span style={{ flex:1, textAlign:"center" }}>Estado</span>
                  <span style={{ flex:1, textAlign:"right" }}>Acciones</span>
                </div>

                {clientesPagina.length === 0 ? (
                  <p style={{ padding:"1.5rem", textAlign:"center", color: TEMA.textoTerciario, fontSize:"14px" }}>
                    No se encontraron clientes
                  </p>
                ) : clientesPagina.map(cliente => (
                  <div key={cliente.id}
                    style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, gap:"12px" }}
                    onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ flex:3, display:"flex", alignItems:"center", gap:"10px" }}>
                      <div style={{
                        width:"36px", height:"36px", borderRadius:"50%", flexShrink:0,
                        background: cliente.activo ? TEMA.primarioBg : TEMA.superficie,
                        border: `0.5px solid ${cliente.activo ? TEMA.primarioBorder : TEMA.borde}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:"12px", fontWeight:500,
                        color: cliente.activo ? TEMA.primarioHover : TEMA.textoTerciario,
                      }}>
                        {iniciales(cliente.nombre)}
                      </div>
                      <div>
                        <p style={{ fontSize:"14px", fontWeight:500, color: cliente.activo ? TEMA.textoPrimario : TEMA.textoTerciario, margin:0 }}>
                          {cliente.nombre}
                        </p>
                        {cliente.observacion && (
                          <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:0 }}>
                            {cliente.observacion.slice(0, 30)}{cliente.observacion.length > 30 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    <span style={{ flex:2, fontSize:"13px", color: TEMA.textoSecundario }}>{cliente.celular}</span>

                    <div style={{ flex:1, textAlign:"center" }}>
                      <span style={{
                        fontSize:"11px", padding:"3px 8px", borderRadius:"20px",
                        background: cliente.activo ? "#0a1f0a" : TEMA.superficie,
                        color:      cliente.activo ? "#44cc44" : TEMA.textoTerciario,
                        border:     `0.5px solid ${cliente.activo ? "#1a5a1a" : TEMA.borde}`,
                      }}>
                        {cliente.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div style={{ flex:1, display:"flex", justifyContent:"flex-end", gap:"8px" }}>
                      <button onClick={() => setModalCliente(cliente)}
                        style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"12px", cursor:"pointer" }}>
                        Editar
                      </button>
                      <button onClick={() => toggleActivo(cliente)}
                        style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${cliente.activo ? TEMA.primarioBorder : "#1a5a1a"}`, color: cliente.activo ? TEMA.primarioHover : "#44cc44", fontSize:"12px", cursor:"pointer" }}>
                        {cliente.activo ? "Dar baja" : "Activar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación lista */}
              {totalPaginasClientes > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"1rem" }}>
                  <button
                    onClick={() => setPaginaClientes(p => Math.max(1, p - 1))}
                    disabled={paginaClientes === 1}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaClientes === 1 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaClientes === 1 ? "not-allowed" : "pointer", fontSize:"13px" }}
                  >←</button>
                  <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>
                    Página <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{paginaClientes}</span> de <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{totalPaginasClientes}</span>
                  </span>
                  <button
                    onClick={() => setPaginaClientes(p => Math.min(totalPaginasClientes, p + 1))}
                    disabled={paginaClientes === totalPaginasClientes}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaClientes === totalPaginasClientes ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaClientes === totalPaginasClientes ? "not-allowed" : "pointer", fontSize:"13px" }}
                  >→</button>
                </div>
              )}
              <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", marginTop:"8px" }}>
                {clientesFiltrados.length} clientes en total
              </p>
            </>
          )}
        </>
      )}

      {/* ── FRECUENTES ── */}
      {pestaña === "frecuentes" && (
        <>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
            <p style={{ fontSize:"13px", color: TEMA.textoSecundario, margin:"0 0 4px" }}>
              Clientes con más turnos completados
            </p>
            {frecuentesPagina.map((cliente, i) => (
              <div key={cliente.id}
                style={{ background: TEMA.superficie, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
                <span style={{ fontSize:"18px", fontWeight:500, color: i === 0 ? "#f0b429" : i === 1 ? "#aaaaaa" : i === 2 ? "#cd7f32" : TEMA.textoTerciario, minWidth:"28px" }}>
                  {(paginaFrecuentes - 1) * FRECUENTES_POR_PAGINA + i + 1}
                </span>
                <div style={{ width:"36px", height:"36px", borderRadius:"50%", background: TEMA.primarioBg, border:`0.5px solid ${TEMA.primarioBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:500, color: TEMA.primarioHover, flexShrink:0 }}>
                  {iniciales(cliente.nombre)}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>{cliente.nombre}</p>
                  <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:0 }}>{cliente.celular}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.primarioHover, margin:0 }}>{cliente.total_turnos}</p>
                  <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:0 }}>turnos</p>
                </div>
                <button onClick={() => setModalCliente(cliente)}
                  style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"12px", cursor:"pointer" }}>
                  Editar
                </button>
              </div>
            ))}
          </div>

          {/* Paginación frecuentes */}
          {totalPaginasFrecuentes > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"1rem" }}>
              <button
                onClick={() => setPaginaFrecuentes(p => Math.max(1, p - 1))}
                disabled={paginaFrecuentes === 1}
                style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaFrecuentes === 1 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaFrecuentes === 1 ? "not-allowed" : "pointer", fontSize:"13px" }}
              >←</button>
              <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>
                Página <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{paginaFrecuentes}</span> de <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{totalPaginasFrecuentes}</span>
              </span>
              <button
                onClick={() => setPaginaFrecuentes(p => Math.min(totalPaginasFrecuentes, p + 1))}
                disabled={paginaFrecuentes === totalPaginasFrecuentes}
                style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaFrecuentes === totalPaginasFrecuentes ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaFrecuentes === totalPaginasFrecuentes ? "not-allowed" : "pointer", fontSize:"13px" }}
              >→</button>
            </div>
          )}
          <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", marginTop:"8px" }}>
            {frecuentes.length} clientes en total
          </p>
        </>
      )}

      {/* Modal */}
      {modalCliente !== null && (
        <ModalCliente
          cliente={modalCliente || null}
          onCerrar={() => setModalCliente(null)}
          onGuardado={cargarClientes}
        />
      )}
    </div>
  )
}

export default Clientes