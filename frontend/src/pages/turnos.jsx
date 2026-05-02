import { useState, useEffect, useRef } from "react"
import api from "../api"
import ModalTurno from "../components/ModalTurno"
import { TEMA } from "../theme"

const HORARIOS = [
  "08:00","08:30","09:00","09:30","10:00","10:30",
  "11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30",
  "17:00","17:30","18:00","18:30","19:00","19:30",
  "20:00","20:30","21:00","21:30","22:00",
]

const COLORES_ESTADO = TEMA.estados

function generarDias(offset = 0) {
  const nombres = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
  const hoy = new Date()
  const hoyStr = (() => {
    const h = new Date()
    return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,"0")}-${String(h.getDate()).padStart(2,"0")}`
  })()

  return Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(hoy)
    fecha.setDate(hoy.getDate() + offset * 7 + i)
    const year  = fecha.getFullYear()
    const month = String(fecha.getMonth() + 1).padStart(2, "0")
    const day   = String(fecha.getDate()).padStart(2, "0")
    const fechaStr = `${year}-${month}-${day}`
    return {
      label:    nombres[fecha.getDay()],
      numero:   fecha.getDate(),
      fecha:    fechaStr,
      titulo:   fecha.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" }),
      esHoy:    fechaStr === hoyStr,
      esPasado: fecha < new Date(new Date().setHours(0,0,0,0)),
    }
  })
}

function Buscador({ label, placeholder, items, onSeleccionar, campoSecundario, textoSecundario }) {
  const [query, setQuery]               = useState("")
  const [abierto, setAbierto]           = useState(false)
  const [seleccionado, setSeleccionado] = useState(null)
  const ref = useRef(null)

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
        <div style={{ display:"flex", alignItems:"center", gap:"6px", background:"#2a0a0a", border:"0.5px solid #5a1010", borderRadius:"6px", padding:"6px 10px" }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:500, color:"#ff3333" }}>{seleccionado.nombre}</div>
            {campoSecundario && (
              <div style={{ fontSize:"11px", color:"#aa4444" }}>{seleccionado[campoSecundario]}</div>
            )}
          </div>
          <span onClick={limpiar} style={{ color:"#555", cursor:"pointer", fontSize:"16px" }}>✕</span>
        </div>
      ) : (
        <div ref={ref} style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"#555", fontSize:"13px", pointerEvents:"none" }}>🔍</span>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setAbierto(true) }}
            onFocus={() => setAbierto(true)}
            placeholder={placeholder}
            style={{ width:"100%", padding:"8px 10px 8px 30px", background:"#2a2a2a", border:"0.5px solid #444", borderRadius:"6px", color:"#f0f0f0", fontSize:"13px", boxSizing:"border-box" }}
          />
          {abierto && (
            <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#2a2a2a", border:"0.5px solid #444", borderRadius:"6px", zIndex:10, maxHeight:"160px", overflowY:"auto" }}>
              {filtrados.length === 0 ? (
                <div style={{ padding:"10px 12px", fontSize:"12px", color:"#555" }}>Sin resultados</div>
              ) : filtrados.map(item => (
                <div
                  key={item.id}
                  onClick={() => elegir(item)}
                  style={{ padding:"8px 12px", fontSize:"13px", cursor:"pointer", borderBottom:"0.5px solid #333" }}
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

function ModalNuevoTurno({ horario, dia, onCerrar, onCreado }) {
  const [clienteSeleccionado,  setClienteSeleccionado]  = useState(null)
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null)
  const [observacion,          setObservacion]          = useState("")
  const [cargando,             setCargando]             = useState(false)
  const [error,                setError]                = useState(null)
  const [clientes,             setClientes]             = useState([])
  const [servicios,            setServicios]            = useState([])

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
      onCreado()
      onCerrar()
    } catch (e) {
      setError(e.response?.data?.detail || "Error al crear el turno")
    } finally {
      setCargando(false)
    }
  }

  const listo = clienteSeleccionado && servicioSeleccionado

  return (
    <div onClick={onCerrar} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1e1e1e", border:"0.5px solid #333", borderRadius:"12px", padding:"1.5rem", width:"360px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color:"#f0f0f0", margin:0 }}>Nuevo turno</p>
            <p style={{ fontSize:"12px", color:TEMA.primario, margin:"2px 0 0", textTransform:"capitalize" }}>
              {dia.titulo} · {horario}
            </p>
          </div>
          <span onClick={onCerrar} style={{ color:"#555", cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <Buscador label="Cliente" placeholder="Buscá por nombre o celular..." items={clientes} campoSecundario="celular" textoSecundario={c => c.celular} onSeleccionar={setClienteSeleccionado} />
          <Buscador label="Servicio" placeholder="Buscá por nombre..." items={servicios} campoSecundario="precio_total" textoSecundario={s => `$${s.precio_total} · ${s.duracion}min`} onSeleccionar={setServicioSeleccionado} />
          <div>
            <label style={{ fontSize:"12px", color:"#888", marginBottom:"4px", display:"block" }}>Observación (opcional)</label>
            <input value={observacion} onChange={e => setObservacion(e.target.value)} placeholder="Ej: viene con su hijo también"
              style={{ width:"100%", padding:"8px 10px", background:"#2a2a2a", border:"0.5px solid #444", borderRadius:"6px", color:"#f0f0f0", fontSize:"13px", boxSizing:"border-box" }}
            />
          </div>
        </div>
        {error && <p style={{ fontSize:"12px", color:TEMA.primarioHover, marginTop:"10px" }}>{error}</p>}
        <div style={{ marginTop:"1.25rem" }}>
          <button onClick={confirmar} disabled={!listo || cargando}
            style={{ width:"100%", padding:"9px", borderRadius:"6px", background: listo ? TEMA.primario : TEMA.primarioBorder, border:"none", color: listo ? "white" : "#888", fontSize:"13px", fontWeight:500, cursor: listo ? "pointer" : "not-allowed" }}>
            {cargando ? "Creando..." : "Confirmar turno"}
          </button>
          <button onClick={onCerrar}
            style={{ width:"100%", padding:"9px", borderRadius:"6px", background:"transparent", border:"0.5px solid #444", color:"#888", fontSize:"13px", cursor:"pointer", marginTop:"8px" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function Turnos() {
  const [offsetSemana,      setOffsetSemana]      = useState(0)
  const dias                                       = generarDias(offsetSemana)
  const [diaSeleccionado,   setDiaSeleccionado]   = useState(dias[0])
  const [turnos,            setTurnos]            = useState([])
  const [cargando,          setCargando]          = useState(false)
  const [modalHorario,      setModalHorario]      = useState(null)
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null)

  function cargarTurnos() {
    setCargando(true)
    api.get("/turnos/")
      .then(res => setTurnos(res.data))
      .catch(() => setTurnos([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarTurnos() }, [diaSeleccionado])

  function turnoDeEsteHorario(horario) {
    const estadosOcultos = ["cancelado", "ausente"]
    return turnos.find(t => {
      const fechaHora  = t.fecha_hora_inicio.replace(" ", "T")
      const fechaTurno = fechaHora.split("T")[0]
      const horaTurno  = fechaHora.split("T")[1]?.slice(0, 5)
      return (
        fechaTurno === diaSeleccionado.fecha &&
        horaTurno  === horario &&
        !estadosOcultos.includes(t.estado)
      )
    })
  }

  function irAOffset(nuevoOffset) {
    setOffsetSemana(nuevoOffset)
    setDiaSeleccionado(generarDias(nuevoOffset)[0])
  }

  return (
    <div style={{ flex:1, padding:"1.5rem", background:TEMA.fondo, overflowY:"auto" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <p style={{ fontSize:"16px", fontWeight:500, color:TEMA.textoPrimario, margin:0, textTransform:"capitalize" }}>
            {diaSeleccionado.titulo}
          </p>
          <p style={{ fontSize:"12px", color:TEMA.textoSecundario, margin:"2px 0 0" }}>Turnos del día</p>
        </div>
        <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
          <button onClick={() => irAOffset(0)}
            style={{ padding:"6px 12px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background:TEMA.superficie, color:TEMA.textoSecundario, fontSize:"12px", cursor:"pointer" }}>
            Hoy
          </button>
          <input type="date"
            onChange={e => {
              const val = e.target.value
              if (!val) return
              const f = new Date(val + "T00:00:00")
              const hoy = new Date()
              hoy.setHours(0,0,0,0)
              const diffDias = Math.floor((f - hoy) / (1000 * 60 * 60 * 24))
              const nuevoOffset = Math.floor(diffDias / 7)
              const year  = f.getFullYear()
              const month = String(f.getMonth() + 1).padStart(2, "0")
              const day   = String(f.getDate()).padStart(2, "0")
              const fechaStr = `${year}-${month}-${day}`
              setOffsetSemana(nuevoOffset)
              const diasNuevos = generarDias(nuevoOffset)
              const diaEncontrado = diasNuevos.find(d => d.fecha === fechaStr) || diasNuevos[0]
              setDiaSeleccionado(diaEncontrado)
            }}
            style={{ padding:"6px 10px", background:TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color:TEMA.textoPrimario, fontSize:"12px", cursor:"pointer" }}
          />
        </div>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"1.25rem" }}>
        <button onClick={() => irAOffset(offsetSemana - 1)}
          style={{ padding:"6px 10px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background:TEMA.superficie, color:TEMA.textoSecundario, cursor:"pointer", flexShrink:0 }}>←</button>

        <div style={{ display:"flex", gap:"6px", flex:1, justifyContent:"center" }}>
          {dias.map(dia => {
            const activo = dia.fecha === diaSeleccionado.fecha
            return (
              <button key={dia.fecha} onClick={() => setDiaSeleccionado(dia)}
                style={{
                  padding:"8px 12px", borderRadius:"8px", minWidth:"64px",
                  border:      activo ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
                  background:  activo ? TEMA.primarioBg : TEMA.superficie,
                  color:       activo ? TEMA.primarioHover : dia.esPasado ? TEMA.textoTerciario : TEMA.textoSecundario,
                  cursor:"pointer", textAlign:"center",
                  opacity: dia.esPasado ? 0.7 : 1,
                }}>
                <div style={{ fontSize:"11px" }}>{dia.label}</div>
                <div style={{ fontSize:"15px", fontWeight:500 }}>{dia.numero}</div>
                {dia.esHoy && <div style={{ fontSize:"9px", color:TEMA.primario }}>hoy</div>}
              </button>
            )
          })}
        </div>

        <button onClick={() => irAOffset(offsetSemana + 1)}
          style={{ padding:"6px 10px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background:TEMA.superficie, color:TEMA.textoSecundario, cursor:"pointer", flexShrink:0 }}>→</button>
      </div>

      {cargando ? (
        <p style={{ color:TEMA.textoSecundario, fontSize:"13px" }}>Cargando...</p>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(138px, 1fr))", gap:"10px" }}>
          {HORARIOS.map(horario => {
            const turno = turnoDeEsteHorario(horario)

            if (!turno) {
              const fechaHorario = new Date(diaSeleccionado.fecha + "T" + horario + ":00")
              const esPasado = fechaHorario < new Date()
              return (
                <div key={horario}
                  onClick={() => !esPasado && setModalHorario(horario)}
                  style={{ borderRadius:"8px", border:`0.5px solid ${TEMA.bordeSuave}`, padding:"12px", background: esPasado ? TEMA.fondo : TEMA.superficie, cursor: esPasado ? "not-allowed" : "pointer", opacity: esPasado ? 0.4 : 1 }}
                  onMouseEnter={e => { if (!esPasado) { e.currentTarget.style.borderColor = TEMA.primario; e.currentTarget.style.background = TEMA.primarioBg } }}
                  onMouseLeave={e => { if (!esPasado) { e.currentTarget.style.borderColor = TEMA.bordeSuave; e.currentTarget.style.background = TEMA.superficie } }}
                >
                 <p style={{ fontSize:"15px", fontWeight:500, color: esPasado ? TEMA.textoDeshabilitado : TEMA.textoTerciario, margin:"0 0 4px" }}>{horario}</p>
                 <p style={{ fontSize:"13px", color: esPasado ? TEMA.textoDeshabilitado : "#444", margin:0 }}>{esPasado ? "Pasado" : "Libre"}</p>
                </div>
              )
            }

            const c = COLORES_ESTADO[turno.estado] || COLORES_ESTADO.cancelado
            return (
              <div key={horario}
                onClick={async () => {
                  const { data } = await api.get(`/turnos/${turno.turno_id}`)
                  setTurnoSeleccionado(data)
                }}
                style={{ borderRadius:"8px", border:`0.5px solid ${c.border}`, padding:"12px", background:c.bg, cursor:"pointer" }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >
                <p style={{ fontSize:"15px", fontWeight:500, color:c.hora, margin:"0 0 4px" }}>{horario}</p>
                <p style={{ fontSize:"14px", fontWeight:500, color:TEMA.textoPrimario, margin:"0 0 2px" }}>
                  {turno.cliente?.nombre || `Cliente #${turno.cliente_id}`}
                </p>
               <p style={{ fontSize:"13px", color:TEMA.textoSecundario, margin:"0 0 7px" }}>
                  {turno.servicio?.nombre || `Servicio #${turno.servicio_id}`}
              </p>
              <span style={{ fontSize:"12px", padding:"3px 10px", borderRadius:"20px", background:c.badge, color:c.texto, border:`0.5px solid ${c.badgeBorder}`, textTransform:"capitalize" }}>
                {turno.estado}
              </span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop:"1.25rem", display:"flex", gap:"8px", flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:TEMA.textoTerciario }}>Estados:</span>
        {Object.entries(COLORES_ESTADO).map(([estado, c]) => (
          <span key={estado} style={{ fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:c.bg, border:`0.5px solid ${c.border}`, color:c.texto, textTransform:"capitalize" }}>
            {estado}
          </span>
        ))}
      </div>

      {modalHorario && (
        <ModalNuevoTurno horario={modalHorario} dia={diaSeleccionado} onCerrar={() => setModalHorario(null)} onCreado={cargarTurnos} />
      )}

      {turnoSeleccionado && (
        <ModalTurno
          turno={turnoSeleccionado}
          onCerrar={() => setTurnoSeleccionado(null)}
          onActualizado={() => { cargarTurnos(); setTurnoSeleccionado(null) }}
        />
      )}
    </div>
  )
}

export default Turnos