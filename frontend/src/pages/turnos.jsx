import { useState, useEffect, useRef } from "react"
import api from "../api"

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00",
]

const COLORES_ESTADO = {
  reservado:  { bg:"#1f1a0a", border:"#3d3520", hora:"#cc9933", badge:"#2a2010", badgeBorder:"#3d3020", texto:"#cc9933" },
  confirmado: { bg:"#2a0a0a", border:"#5a1010", hora:"#ff3333", badge:"#3d0f0f", badgeBorder:"#5a1010", texto:"#ff3333" },
  asistido:   { bg:"#0f1f0f", border:"#2a3d2a", hora:"#5aaa5a", badge:"#1a3a1a", badgeBorder:"#2a5a2a", texto:"#5aaa5a" },
  completado: { bg:"#0f1f0f", border:"#2a3d2a", hora:"#5aaa5a", badge:"#1a3a1a", badgeBorder:"#2a5a2a", texto:"#5aaa5a" },
  ausente:    { bg:"#1e1e1e", border:"#333",    hora:"#777",    badge:"#2a2a2a", badgeBorder:"#444",    texto:"#777"    },
  cancelado:  { bg:"#1e1e1e", border:"#333",    hora:"#555",    badge:"#2a2a2a", badgeBorder:"#444",    texto:"#555"    },
}

// ─────────────────────────────────────────────
// HELPER — genera los próximos 7 días
// ─────────────────────────────────────────────

function generarDias() {
  const nombres = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
  const hoy = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + i)
    return {
      label:  nombres[fecha.getDay()],
      numero: fecha.getDate(),
      fecha:  fecha.toISOString().split("T")[0],
      titulo: fecha.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" }),
    }
  })
}

// ─────────────────────────────────────────────
// COMPONENTE — Buscador con dropdown
// ─────────────────────────────────────────────

function Buscador({ label, placeholder, items, onSeleccionar, campoSecundario, textoSecundario }) {
  const [query, setQuery]           = useState("")
  const [abierto, setAbierto]       = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const ref = useRef(null)

  // Cierra el dropdown si hacés clic afuera
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtrados = items.filter(item =>
    item.nombre.toLowerCase().includes(query.toLowerCase()) ||
    (campoSecundario && item[campoSecundario]?.toString().includes(query))
  )

  function elegir(item) {
    setSeleccionado(item)
    setAbierto(false)
    setQuery("")
    onSeleccionar(item)
  }

  function limpiar() {
    setSeleccionado(null)
    setQuery("")
    onSeleccionar(null)
  }

  return (
    <div>
      <label style={{ fontSize:"12px", color:"#888", marginBottom:"4px", display:"block" }}>{label}</label>

      {seleccionado ? (
        // Badge del ítem seleccionado
        <div style={{
          display:"flex", alignItems:"center", gap:"6px",
          background:"#2a0a0a", border:"0.5px solid #5a1010",
          borderRadius:"6px", padding:"6px 10px",
        }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#ff3333" }}>{seleccionado.nombre}</div>
            {campoSecundario && (
              <div style={{ fontSize:"11px", color:"#aa4444" }}>{seleccionado[campoSecundario]}</div>
            )}
          </div>
          <span onClick={limpiar} style={{ color:"#555", cursor:"pointer", fontSize:"16px" }}>✕</span>
        </div>
      ) : (
        // Input de búsqueda
        <div ref={ref} style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"#555", fontSize:"13px", pointerEvents:"none" }}>🔍</span>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setAbierto(true) }}
            onFocus={() => setAbierto(true)}
            placeholder={placeholder}
            style={{
              width:"100%", padding:"8px 10px 8px 30px",
              background:"#2a2a2a", border:"0.5px solid #444",
              borderRadius:"6px", color:"#f0f0f0", fontSize:"13px",
              boxSizing:"border-box",
            }}
          />
          {abierto && (
            <div style={{
              position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
              background:"#2a2a2a", border:"0.5px solid #444",
              borderRadius:"6px", zIndex:10, maxHeight:"160px", overflowY:"auto",
            }}>
              {filtrados.length === 0 ? (
                <div style={{ padding:"10px 12px", fontSize:"12px", color:"#555" }}>Sin resultados</div>
              ) : filtrados.map(item => (
                <div
                  key={item.id}
                  onClick={() => elegir(item)}
                  style={{
                    padding:"8px 12px", fontSize:"13px", cursor:"pointer",
                    borderBottom:"0.5px solid #333",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#3a0a0a"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ fontWeight:500, color:"#f0f0f0" }}>{item.nombre}</div>
                  {campoSecundario && (
                    <div style={{ fontSize:"11px", color:"#666" }}>{textoSecundario(item)}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE — Modal para crear turno
// ─────────────────────────────────────────────

function ModalNuevoTurno({ horario, dia, onCerrar, onCreado }) {
  const [clienteSeleccionado,  setClienteSeleccionado]  = useState(null)
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null)
  const [observacion,          setObservacion]          = useState("")
  const [cargando,             setCargando]             = useState(false)
  const [error,                setError]                = useState(null)
  const [clientes,             setClientes]             = useState([])
  const [servicios,            setServicios]            = useState([])

  // Carga clientes y servicios al abrir el modal
  useEffect(() => {
    api.get("/clientes/").then(res => setClientes(res.data.filter(c => c.activo)))
    api.get("/servicios/").then(res => setServicios(res.data.filter(s => s.activo)))
  }, [])

  async function confirmar() {
    if (!clienteSeleccionado || !servicioSeleccionado) return
    setCargando(true)
    setError(null)
    try {
      const fechaHora = `${dia.fecha}T${horario}:00`
      await api.post("/turnos/", {
        cliente_id:        clienteSeleccionado.id,
        servicio_id:       servicioSeleccionado.id,
        fecha_hora_inicio: fechaHora,
        observacion:       observacion || null,
      })
      onCreado()  // avisa al padre que se creó el turno
      onCerrar()
    } catch (e) {
      setError(e.response?.data?.detail || "Error al crear el turno")
    } finally {
      setCargando(false)
    }
  }

  const listo = clienteSeleccionado && servicioSeleccionado

  return (
    // Overlay oscuro de fondo
    <div
      onClick={onCerrar}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
        display:"flex", alignItems:"center", justifyContent:"center", zIndex:100,
      }}
    >
      {/* El onClick del modal no propaga al overlay */}
      <div onClick={e => e.stopPropagation()} style={{
        background:"#1e1e1e", border:"0.5px solid #333",
        borderRadius:"12px", padding:"1.5rem", width:"360px",
      }}>

        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color:"#f0f0f0", margin:0 }}>Nuevo turno</p>
            <p style={{ fontSize:"12px", color:"#CC0000", margin:"2px 0 0", textTransform:"capitalize" }}>
              {dia.titulo} · {horario}
            </p>
          </div>
          <span onClick={onCerrar} style={{ color:"#555", cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Formulario */}
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <Buscador
            label="Cliente"
            placeholder="Buscá por nombre o celular..."
            items={clientes}
            campoSecundario="celular"
            textoSecundario={c => c.celular}
            onSeleccionar={setClienteSeleccionado}
          />
          <Buscador
            label="Servicio"
            placeholder="Buscá por nombre..."
            items={servicios}
            campoSecundario="precio_total"
            textoSecundario={s => `$${s.precio_total} · ${s.duracion}min`}
            onSeleccionar={setServicioSeleccionado}
          />
          <div>
            <label style={{ fontSize:"12px", color:"#888", marginBottom:"4px", display:"block" }}>
              Observación (opcional)
            </label>
            <input
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              placeholder="Ej: viene con su hijo también"
              style={{
                width:"100%", padding:"8px 10px", background:"#2a2a2a",
                border:"0.5px solid #444", borderRadius:"6px",
                color:"#f0f0f0", fontSize:"13px", boxSizing:"border-box",
              }}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize:"12px", color:"#ff3333", marginTop:"10px" }}>{error}</p>
        )}

        {/* Botones */}
        <div style={{ marginTop:"1.25rem" }}>
          <button
            onClick={confirmar}
            disabled={!listo || cargando}
            style={{
              width:"100%", padding:"9px", borderRadius:"6px",
              background: listo ? "#CC0000" : "#5a1010",
              border:"none", color: listo ? "white" : "#888",
              fontSize:"13px", fontWeight:500,
              cursor: listo ? "pointer" : "not-allowed",
            }}
          >
            {cargando ? "Creando..." : "Confirmar turno"}
          </button>
          <button
            onClick={onCerrar}
            style={{
              width:"100%", padding:"9px", borderRadius:"6px",
              background:"transparent", border:"0.5px solid #444",
              color:"#888", fontSize:"13px", cursor:"pointer", marginTop:"8px",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// COMPONENTE PRINCIPAL — Turnos
// ─────────────────────────────────────────────

function Turnos() {
  const dias = generarDias()
  const [diaSeleccionado, setDiaSeleccionado] = useState(dias[0])
  const [turnos,          setTurnos]          = useState([])
  const [cargando,        setCargando]        = useState(false)
  const [modalHorario,    setModalHorario]    = useState(null) // null = cerrado

  function cargarTurnos() {
    setCargando(true)
    api.get("/turnos/")
      .then(res => setTurnos(res.data))
      .catch(() => setTurnos([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarTurnos() }, [diaSeleccionado])

  function turnoDeEsteHorario(horario) {
    return turnos.find(t => {
      const fechaTurno = t.fecha_hora_inicio.split("T")[0]
      const horaTurno  = t.fecha_hora_inicio.split("T")[1]?.slice(0, 5)
      return fechaTurno === diaSeleccionado.fecha && horaTurno === horario
    })
  }

  return (
    <div style={{ flex:1, padding:"1.5rem", background:"#1a1a1a", overflowY:"auto" }}>

      {/* Encabezado */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <p style={{ fontSize:"16px", fontWeight:500, color:"#f0f0f0", margin:0, textTransform:"capitalize" }}>
            {diaSeleccionado.titulo}
          </p>
          <p style={{ fontSize:"12px", color:"#888", margin:"2px 0 0" }}>Turnos del día</p>
        </div>
      </div>

      {/* Selector de días */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"1.25rem", overflowX:"auto", paddingBottom:"4px" }}>
        {dias.map(dia => {
          const activo = dia.fecha === diaSeleccionado.fecha
          return (
            <button
              key={dia.fecha}
              onClick={() => setDiaSeleccionado(dia)}
              style={{
                padding:"8px 12px", borderRadius:"8px", minWidth:"64px",
                border:      activo ? "0.5px solid #CC0000" : "0.5px solid #333",
                background:  activo ? "#2a0a0a" : "#242424",
                color:       activo ? "#ff3333" : "#888",
                cursor:"pointer", textAlign:"center",
              }}
            >
              <div style={{ fontSize:"11px" }}>{dia.label}</div>
              <div style={{ fontSize:"15px", fontWeight:500 }}>{dia.numero}</div>
            </button>
          )
        })}
      </div>

      {/* Grilla de turnos */}
      {cargando ? (
        <p style={{ color:"#888", fontSize:"13px" }}>Cargando...</p>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(138px, 1fr))", gap:"10px" }}>
          {HORARIOS.map(horario => {
            const turno = turnoDeEsteHorario(horario)

            if (!turno) {
              return (
                <div
                  key={horario}
                  onClick={() => setModalHorario(horario)}
                  style={{ borderRadius:"8px", border:"0.5px solid #333", padding:"12px", background:"#242424", cursor:"pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#CC0000"; e.currentTarget.style.background = "#2a0a0a" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#333";    e.currentTarget.style.background = "#242424" }}
                >
                  <p style={{ fontSize:"13px", fontWeight:500, color:"#555", margin:"0 0 4px" }}>{horario}</p>
                  <p style={{ fontSize:"12px", color:"#444", margin:0 }}>Libre</p>
                </div>
              )
            }

            const c = COLORES_ESTADO[turno.estado] || COLORES_ESTADO.cancelado
            return (
              <div key={horario} style={{ borderRadius:"8px", border:`0.5px solid ${c.border}`, padding:"12px", background:c.bg }}>
                <p style={{ fontSize:"13px", fontWeight:500, color:c.hora, margin:"0 0 4px" }}>{horario}</p>
                <p style={{ fontSize:"12px", fontWeight:500, color:"#f0f0f0", margin:"0 0 2px" }}>
                  {turno.cliente?.nombre || `Cliente #${turno.cliente_id}`}
                </p>
                <p style={{ fontSize:"11px", color:"#888", margin:"0 0 7px" }}>
                  {turno.servicio?.nombre || `Servicio #${turno.servicio_id}`}
                </p>
                <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"20px", background:c.badge, color:c.texto, border:`0.5px solid ${c.badgeBorder}`, textTransform:"capitalize" }}>
                  {turno.estado}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Leyenda */}
      <div style={{ marginTop:"1.25rem", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:"#555" }}>Estados:</span>
        {Object.entries(COLORES_ESTADO).map(([estado, c]) => (
          <span key={estado} style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:c.bg, border:`0.5px solid ${c.border}`, color:c.texto, textTransform:"capitalize" }}>
            {estado}
          </span>
        ))}
      </div>

      {/* Modal */}
      {modalHorario && (
        <ModalNuevoTurno
          horario={modalHorario}
          dia={diaSeleccionado}
          onCerrar={() => setModalHorario(null)}
          onCreado={cargarTurnos}
        />
      )}
    </div>
  )
}

export default Turnos