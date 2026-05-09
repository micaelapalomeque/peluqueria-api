import { useState, useEffect } from "react"
import { TEMA } from "../theme"
import api from "../api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const secciones = [
  { key: "financiero", label: "Reportes financieros", icono: "/icono_financiero.png" },
  { key: "turnos",     label: "Reportes turnos",      icono: "/icono_turnos.png" },
  { key: "clientes",  label: "Reportes clientes",    icono: "/icono_clientes.png" },
  { key: "servicios", label: "Reportes servicios",   icono: "/icono_servicios.png" },
]

function getLunes(offset = 0) {
  const hoy = new Date()
  const dia = hoy.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() + diff + offset * 7)
  return lunes
}

function formatFechaISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function formatPeso(valor) {
  return `$${Number(valor).toLocaleString("es-AR")}`
}

function TooltipCustom({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:"#1e1e1e", border:"0.5px solid #444", borderRadius:"6px", padding:"8px 12px" }}>
        <p style={{ fontSize:"12px", color:"#888", margin:"0 0 2px" }}>{label}</p>
        <p style={{ fontSize:"14px", fontWeight:500, color:"#44cc44", margin:0 }}>
          {formatPeso(payload[0].value)}
        </p>
      </div>
    )
  }
  return null
}

function ReporteFinanciero() {
  const [offsetSemana, setOffsetSemana] = useState(0)
  const [datos,        setDatos]        = useState([])
  const [cargando,     setCargando]     = useState(false)
  const [fechaManual,  setFechaManual]  = useState("")
  const [errorFecha,   setErrorFecha]   = useState("")

  const lunes      = getLunes(offsetSemana)
  const sabado     = new Date(lunes); sabado.setDate(lunes.getDate() + 5)
  const labelSemana = `${lunes.toLocaleDateString("es-AR", { day:"numeric", month:"short" })} — ${sabado.toLocaleDateString("es-AR", { day:"numeric", month:"short" })}`

  function cargarDatos(fechaISO) {
    setCargando(true)
    api.get(`/pagos/reporte/semana?fecha_inicio=${fechaISO}`)
      .then(res => setDatos(res.data))
      .catch(console.error)
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarDatos(formatFechaISO(lunes))
  }, [offsetSemana])

  function buscarFechaManual() {
    if (!fechaManual) return
    const fecha = new Date(fechaManual + "T00:00:00")
    const diaSemana = fecha.getDay() // 0=Dom, 1=Lun, 6=Sáb
    
    if (diaSemana === 0 || diaSemana === 6) {
      setErrorFecha("Seleccioná un día de lunes a viernes para ver esa semana")
      return
    }
    
    // Calcular el lunes de esa semana
    const diff   = 1 - diaSemana
    const lunesManual = new Date(fecha)
    lunesManual.setDate(fecha.getDate() + diff)
    
    setErrorFecha("")
    setOffsetSemana(null) // desactivar offset
    cargarDatos(formatFechaISO(lunesManual))
    
    // Actualizar label
    const sabadoManual = new Date(lunesManual)
    sabadoManual.setDate(lunesManual.getDate() + 5)
  }

  const totalSemana = datos.reduce((acc, d) => acc + d.total, 0)

  return (
    <div>
      <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 1rem" }}>
        Ingresos por día
      </p>

      {/* Selector de semana con flechas */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px", flexWrap:"wrap" }}>
        <button
          onClick={() => { setOffsetSemana(p => (p ?? 0) - 1); setFechaManual(""); setErrorFecha("") }}
          disabled={offsetSemana !== null && offsetSemana <= -4}
          style={{ padding:"6px 12px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: offsetSemana !== null && offsetSemana <= -4 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: offsetSemana !== null && offsetSemana <= -4 ? "not-allowed" : "pointer", fontSize:"13px" }}
        >←</button>
        <span style={{ fontSize:"13px", color: TEMA.textoPrimario, fontWeight:500 }}>
          {labelSemana}
        </span>
        <button
          onClick={() => { setOffsetSemana(p => Math.min(0, (p ?? 0) + 1)); setFechaManual(""); setErrorFecha("") }}
          disabled={offsetSemana === 0 || offsetSemana === null}
          style={{ padding:"6px 12px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: offsetSemana === 0 || offsetSemana === null ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: offsetSemana === 0 || offsetSemana === null ? "not-allowed" : "pointer", fontSize:"13px" }}
        >→</button>
        <button
          onClick={() => { setOffsetSemana(0); setFechaManual(""); setErrorFecha("") }}
          style={{ padding:"6px 12px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: TEMA.textoSecundario, cursor:"pointer", fontSize:"13px" }}
        >Hoy</button>
      </div>

      {/* Buscador manual */}
      <div style={{ display:"flex", gap:"8px", alignItems:"center", marginBottom:"4px" }}>
        <input
          type="date"
          value={fechaManual}
          onChange={e => { setFechaManual(e.target.value); setErrorFecha("") }}
          style={{ padding:"6px 10px", background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"12px", cursor:"pointer" }}
        />
        <button
          onClick={buscarFechaManual}
          disabled={!fechaManual}
          style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: !fechaManual ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: !fechaManual ? "not-allowed" : "pointer", fontSize:"12px" }}
        >
          Ver semana
        </button>
      </div>
      {errorFecha && (
        <p style={{ fontSize:"11px", color: TEMA.primarioHover, margin:"0 0 12px" }}>{errorFecha}</p>
      )}
      {!errorFecha && <div style={{ marginBottom:"12px" }} />}

      {/* Total semana */}
      <div style={{ background:"#0a1f0a", border:"0.5px solid #1a5a1a", borderRadius:"8px", padding:"12px 16px", marginBottom:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Total cobrado esta semana</span>
        <span style={{ fontSize:"18px", fontWeight:500, color:"#44cc44" }}>{formatPeso(totalSemana)}</span>
      </div>

      {/* Gráfico */}
      {cargando ? (
        <p style={{ color: TEMA.textoSecundario, fontSize:"13px" }}>Cargando...</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datos} margin={{ top:10, right:10, left:10, bottom:5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
            <XAxis
  dataKey="dia"
  tickFormatter={(value, index) => {
    const item = datos[index]
    if (!item) return value
    const fecha = new Date(item.fecha + "T00:00:00")
    const dia   = fecha.getDate()
    const mes   = fecha.getMonth() + 1
    return `${value} ${dia}/${mes}`
  }}
  tick={{ fill: TEMA.textoSecundario, fontSize:11 }}
  axisLine={{ stroke:"#333" }}
  tickLine={false}
/>
            <YAxis
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              tick={{ fill: TEMA.textoSecundario, fontSize:11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TooltipCustom />} cursor={{ fill:"rgba(255,255,255,0.05)" }} />
            <Bar dataKey="total" fill="#CC0000" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function Reportes() {
  const [abierto, setAbierto] = useState(null)

  function toggle(key) {
    setAbierto(prev => prev === key ? null : key)
  }

  return (
    <div style={{ flex:1, padding:"1.5rem", background: TEMA.fondo, overflowY:"auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>Reportes</p>
        <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>Estadísticas y análisis del negocio</p>
      </div>

      {/* Grid de botones 2x2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"1.25rem" }}>
        {secciones.map(sec => (
          <button key={sec.key}
            onClick={() => toggle(sec.key)}
            style={{
              padding:"16px",
              borderRadius:"8px",
              border: abierto === sec.key ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
              background: abierto === sec.key ? TEMA.primarioBg : TEMA.superficie,
              color: abierto === sec.key ? TEMA.primarioHover : TEMA.textoSecundario,
              fontSize:"14px",
              fontWeight:500,
              cursor:"pointer",
              textAlign:"left",
              display:"flex",
              alignItems:"center",
              gap:"10px",
              transition:"all 0.2s",
            }}
          >
            <img src={sec.icono} alt={sec.label}
  style={{ width:"32px", height:"32px", objectFit:"contain" }} />
            <span>{sec.label}</span>
            <span style={{ marginLeft:"auto", fontSize:"12px" }}>
              {abierto === sec.key ? "▲" : "▼"}
            </span>
          </button>
        ))}
      </div>

      {/* Acordeón */}
      {abierto && (
        <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", padding:"1.5rem" }}>

          {abierto === "financiero" && (
            <div>
              <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 1rem" }}>Reportes financieros</p>
              <p style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Próximamente — gráficos de ingresos, métodos de pago y comparativas mensuales.</p>
              {abierto === "financiero" && <ReporteFinanciero />}
            </div>
          )}

          {abierto === "turnos" && (
            <div>
              <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 1rem" }}>Reportes de turnos</p>
              <p style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Próximamente — turnos por día, hora pico y tasa de asistencia.</p>
            </div>
          )}

          {abierto === "clientes" && (
            <div>
              <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 1rem" }}>Reportes de clientes</p>
              <p style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Próximamente — clientes nuevos por mes, frecuencia y ausencias.</p>
            </div>
          )}

          {abierto === "servicios" && (
            <div>
              <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 1rem" }}>Reportes de servicios</p>
              <p style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Próximamente — servicios más solicitados e ingresos por servicio.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default Reportes