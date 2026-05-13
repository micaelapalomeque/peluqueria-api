import { useState } from "react"
import api from "../api"
import { TEMA } from "../theme"
import Swal from "sweetalert2"

const COLORES_ESTADO = TEMA.estados
const METODOS_PAGO = ["efectivo", "transferencia"]

function Btn({ children, onClick, variante = "gray", disabled = false }) {
  const estilos = {
    red:   { background: TEMA.primario,   color:"white",  border:"none" },
    green: { background:"#1a4d1a",        color:"#5aaa5a", border:"0.5px solid #2a5a2a" },
    amber: { background:"#2a2010",        color:"#cc9933", border:"0.5px solid #3d3020" },
    gray:  { background:"transparent",    color: TEMA.textoSecundario, border:`0.5px solid ${TEMA.borde}` },
    dark:  { background: TEMA.superficie, color: TEMA.textoTerciario,  border:`0.5px solid ${TEMA.bordeSuave}` },
  }
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width:"100%", padding:"9px", borderRadius:"6px", fontSize:"13px", fontWeight:500, marginBottom:"8px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, ...estilos[variante] }}>
      {children}
    </button>
  )
}

function InfoRow({ label, valor, colorValor }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", padding:"6px 0", borderBottom:`0.5px solid ${TEMA.bordeSuave}` }}>
      <span style={{ color: TEMA.textoTerciario }}>{label}</span>
      <span style={{ color: colorValor || TEMA.textoPrimario }}>{valor}</span>
    </div>
  )
}

function SelectorMetodo({ valor, onChange }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ fontSize:"12px", color: TEMA.textoSecundario, marginBottom:"4px", display:"block" }}>Método de pago</label>
      <select value={valor} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", padding:"8px 10px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px" }}>
        <option value="">Seleccioná método</option>
        {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}

function StepIndicator({ pasoActual, pasos }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"1.25rem" }}>
      {pasos.map((p, i) => {
        const estado = pasoActual > i + 1 ? "done" : pasoActual === i + 1 ? "active" : "pending"
        return (
          <>
            <div key={p} style={{ width:"24px", height:"24px", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"11px", fontWeight:500,
              background: estado === "done" ? "#1a4d1a" : estado === "active" ? TEMA.primarioBg : TEMA.superficie,
              border: estado === "done" ? "0.5px solid #2a5a2a" : estado === "active" ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.bordeSuave}`,
              color: estado === "done" ? "#5aaa5a" : estado === "active" ? TEMA.primarioHover : TEMA.textoTerciario,
            }}>
              {estado === "done" ? "✓" : i + 1}
            </div>
            {i < pasos.length - 1 && <div key={`line-${i}`} style={{ flex:1, height:"0.5px", background: TEMA.bordeSuave }} />}
          </>
        )
      })}
    </div>
  )
}

function FlujoPago({ turno, onCompletado, onError }) {
  const [paso,           setPaso]           = useState(1)
  const [metodo,         setMetodo]         = useState("")
  const [cargando,       setCargando]       = useState(false)
  const [tipoDescuento,  setTipoDescuento]  = useState("ninguno")
  const [valorDescuento, setValorDescuento] = useState("")
  const [modoDeuda,      setModoDeuda]      = useState(false)
  const [propina,        setPropina]        = useState("")

  const montoOriginal = turno.estado_senia === "abonada"
    ? Number(turno.monto_total) - Number(turno.monto_senia)
    : Number(turno.monto_total)

  const montoFinal = (() => {
    if (tipoDescuento === "monto") {
      const v = Number(valorDescuento)
      return v > 0 && v <= montoOriginal ? v : montoOriginal
    }
    if (tipoDescuento === "porcentaje") {
      const p = Number(valorDescuento)
      if (p > 0 && p <= 100) return Math.round(montoOriginal * (1 - p / 100))
    }
    return montoOriginal
  })()

  const hayDescuento = montoFinal < montoOriginal

  async function cobrarYCompletar() {
    if (!metodo) return onError("Seleccioná un método de pago")
    setCargando(true)
    try {
      if (hayDescuento) {
        await api.patch(`/turnos/${turno.turno_id}/monto_cobrado`, { monto_cobrado: montoFinal })
      }

      const { data: deudas } = await api.get(`/deudas/cliente/${turno.cliente_id}`)
      const deuda = deudas.find(d =>
        Number(d.turno_id) === Number(turno.turno_id) && d.estado !== "saldada"
      )

      if (deuda) {
        await api.post(`/deudas/${deuda.deuda_id}/pagar`, {
          monto:       montoFinal,
          metodo_pago: metodo,
        })
      }

      await new Promise(resolve => setTimeout(resolve, 300))
      await api.patch(`/turnos/${turno.turno_id}/completar`)

      if (propina && Number(propina) > 0) {
        await api.post("/pagos/", {
          turno_id:    turno.turno_id,
          cliente_id:  turno.cliente_id,
          monto:       Number(propina),
          metodo_pago: metodo,
          tipo_pago:   "propina",
          estado_pago: "pagado",
          descripcion: `Propina turno #${turno.turno_id}`,
        })
      }

      setPaso(3)
      onCompletado()
    } catch(e) {
      onError(e.response?.data?.detail || "Error al cobrar")
    } finally { setCargando(false) }
  }

  async function registrarDeuda() {
    setPaso(3)
    setModoDeuda(true)
    onCompletado()
  }

  if (paso === 3) {
    return (
      <div style={{ textAlign:"center", padding:"1rem 0" }}>
        <div style={{ width:"48px", height:"48px", borderRadius:"50%", background: modoDeuda ? "#2a2010" : "#1a4d1a", border:`0.5px solid ${modoDeuda ? "#5a4a10" : "#2a5a2a"}`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:"20px" }}>
          {modoDeuda ? "📋" : "✓"}
        </div>
        <p style={{ fontSize:"15px", fontWeight:500, color: modoDeuda ? "#cc9933" : "#5aaa5a", margin:"0 0 4px" }}>
          {modoDeuda ? "Deuda registrada" : "Turno completado"}
        </p>
        <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:0 }}>
          {modoDeuda ? `${turno.cliente?.nombre} quedó con deuda pendiente` : `${turno.cliente?.nombre} · ${turno.servicio?.nombre}`}
        </p>
      </div>
    )
  }

  return (
    <>
      <StepIndicator pasoActual={paso} pasos={["Info", "Pago"]} />

      {paso === 1 && (
        <>
          <p style={{ fontSize:"13px", color: TEMA.textoSecundario, margin:"0 0 1.25rem" }}>
            Turno asistido. ¿Cómo abono el corte?
          </p>
          <Btn variante="green" onClick={() => setPaso(2)}>Registrar pago del saldo</Btn>
          <Btn variante="amber" onClick={registrarDeuda} disabled={cargando}>Se va sin pagar — registrar deuda</Btn>
        </>
      )}

      {paso === 2 && (
        <>
          <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:"0 0 4px" }}>
            ¿Cómo pagó {turno.cliente?.nombre}?
          </p>
          <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 1.25rem" }}>
            Saldo original: <span style={{ color: TEMA.primarioHover }}>${montoOriginal.toLocaleString("es-AR")}</span>
          </p>

          {/* Descuento */}
          <div style={{ background:"#1a1a1a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"12px" }}>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 8px" }}>
              Descuento <span style={{ color: TEMA.textoTerciario, fontSize:"11px" }}>(opcional)</span>
            </p>
            <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
              {["ninguno", "monto", "porcentaje"].map(tipo => (
                <button key={tipo} onClick={() => { setTipoDescuento(tipo); setValorDescuento("") }}
                  style={{ flex:1, padding:"5px", borderRadius:"6px", fontSize:"11px", cursor:"pointer",
                    border:     tipoDescuento === tipo ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
                    background: tipoDescuento === tipo ? TEMA.primarioBg : TEMA.superficie,
                    color:      tipoDescuento === tipo ? TEMA.primarioHover : TEMA.textoSecundario,
                  }}>
                  {tipo === "ninguno" ? "Sin descuento" : tipo === "monto" ? "$ Monto" : "% Porcentaje"}
                </button>
              ))}
            </div>
            {tipoDescuento !== "ninguno" && (
              <input value={valorDescuento} onChange={e => setValorDescuento(e.target.value.replace(/\D/g, ""))}
                placeholder={tipoDescuento === "monto" ? "Ej: 8000" : "Ej: 20"} inputMode="numeric"
                style={{ width:"100%", padding:"8px 10px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px", boxSizing:"border-box" }}
              />
            )}
            {hayDescuento && (
              <div style={{ marginTop:"8px", display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                <span style={{ color: TEMA.textoTerciario }}>Monto con descuento:</span>
                <span style={{ color:"#44cc44", fontWeight:500 }}>${montoFinal.toLocaleString("es-AR")}</span>
              </div>
            )}
          </div>

          {/* Propina */}
          <div style={{ background:"#1a1a1a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"12px" }}>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 8px" }}>
              Propina <span style={{ color: TEMA.textoTerciario, fontSize:"11px" }}>(opcional)</span>
            </p>
            <input value={propina} onChange={e => setPropina(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 500" inputMode="numeric"
              style={{ width:"100%", padding:"8px 10px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px", boxSizing:"border-box" }}
            />
            {propina && Number(propina) > 0 && (
              <div style={{ marginTop:"8px", display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                <span style={{ color: TEMA.textoTerciario }}>Propina:</span>
                <span style={{ color:"#44cc44", fontWeight:500 }}>${Number(propina).toLocaleString("es-AR")}</span>
              </div>
            )}
          </div>

          <SelectorMetodo valor={metodo} onChange={setMetodo} />

          {/* Resumen */}
          {(hayDescuento || (propina && Number(propina) > 0)) && (
            <div style={{ background:"#1a1a1a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", marginBottom:"4px" }}>
                <span style={{ color: TEMA.textoTerciario }}>Corte:</span>
                <span style={{ color: TEMA.textoPrimario }}>${montoFinal.toLocaleString("es-AR")}</span>
              </div>
              {propina && Number(propina) > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"12px", marginBottom:"4px" }}>
                  <span style={{ color: TEMA.textoTerciario }}>Propina:</span>
                  <span style={{ color:"#44cc44" }}>${Number(propina).toLocaleString("es-AR")}</span>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", fontWeight:500, borderTop:`0.5px solid ${TEMA.bordeSuave}`, paddingTop:"6px", marginTop:"4px" }}>
                <span style={{ color: TEMA.textoSecundario }}>Total a cobrar:</span>
                <span style={{ color:"#44cc44" }}>${(montoFinal + (Number(propina) || 0)).toLocaleString("es-AR")}</span>
              </div>
            </div>
          )}

          <Btn variante="red" onClick={cobrarYCompletar} disabled={!metodo || cargando}>
            {cargando ? "Procesando..." : `Cobrar $${(montoFinal + (Number(propina) || 0)).toLocaleString("es-AR")} y completar`}
          </Btn>
          <Btn variante="gray" onClick={() => setPaso(1)} disabled={cargando}>Volver</Btn>
        </>
      )}
    </>
  )
}

function AccionesReservado({ turno, cargando, onRegistrarSenia, onAccion, onWhatsApp }) {
  const [metodo, setMetodo] = useState("")
  return (
    <>
      <SelectorMetodo valor={metodo} onChange={setMetodo} />
      <Btn variante="red"   onClick={() => onRegistrarSenia(metodo)} disabled={!metodo || cargando}>Registrar seña</Btn>
      <Btn variante="green" onClick={() => onAccion("confirmar_sin_senia")} disabled={cargando}>Confirmar sin seña</Btn>
      <Btn variante="green" onClick={onWhatsApp}>Enviar seña por WhatsApp</Btn>
      <Btn variante="dark"  onClick={() => onAccion("cancelar", "¿Cancelar este turno?")} disabled={cargando}>Cancelar turno</Btn>
    </>
  )
}

function ModalTurno({ turno: turnoInicial, onCerrar, onActualizado }) {
  const [turno,    setTurno]    = useState(turnoInicial)
  const [error,    setError]    = useState(null)
  const [cargando, setCargando] = useState(false)

  const estado = turno.estado?.toLowerCase()
  const c      = COLORES_ESTADO[estado] || COLORES_ESTADO.cancelado

  const saldoRestante = turno.estado_senia === "abonada"
    ? Number(turno.monto_total) - Number(turno.monto_senia)
    : Number(turno.monto_total)

  async function recargarTurno() {
    try {
      const { data } = await api.get(`/turnos/${turno.turno_id}`)
      setTurno(data)
      setError(null)
      if (["confirmado", "completado", "cancelado", "ausente"].includes(data.estado)) {
        onActualizado()
      }
    } catch(e) {
      setError("Error al recargar el turno")
    }
  }

  async function accion(endpoint, confirmMsg) {
    if (confirmMsg) {
      const result = await Swal.fire({
        title: confirmMsg, icon: "warning", showCancelButton: true,
        confirmButtonColor: "#CC0000", cancelButtonColor: "#333",
        confirmButtonText: "Sí, confirmar", cancelButtonText: "Cancelar",
        background: "#1e1e1e", color: "#f0f0f0",
      })
      if (!result.isConfirmed) return
    }
    setCargando(true)
    setError(null)
    try {
      await api.patch(`/turnos/${turno.turno_id}/${endpoint}`)
      await recargarTurno()
    } catch(e) {
      setError(e.response?.data?.detail || "Error")
    } finally { setCargando(false) }
  }

  async function registrarSenia(metodo) {
    if (!metodo) return setError("Seleccioná un método de pago")
    setCargando(true)
    setError(null)
    try {
      await api.patch(`/turnos/${turno.turno_id}/seniar?metodo_pago=${metodo}`)
      await recargarTurno()
    } catch(e) {
      setError(e.response?.data?.detail || "Error al registrar seña")
    } finally { setCargando(false) }
  }

  function abrirWhatsApp() {
    const celularLimpio = turno.cliente?.celular?.replace(/\D/g, "")
    const numero = celularLimpio.startsWith("54") ? celularLimpio : `54${celularLimpio}`
    const fecha  = new Date(turno.fecha_hora_inicio).toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })
    const hora   = turno.fecha_hora_inicio?.split("T")[1]?.slice(0, 5)
    const mensaje = encodeURIComponent(
      `Hola ${turno.cliente?.nombre}, \n` +
      `Tu turno está reservado para el ${fecha} a las ${hora}hs.\n` +
      `Valor de Seña: $${turno.monto_senia}\n\n` +
      `Por favor abonala para confirmar tu lugar. ¡Gracias! \n\n` +
      `Alias: isa.acosta \n` +
      `A nombre de Isaura Mercedes Acosta\n`
    )
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank")
  }

  return (
    <div onClick={onCerrar}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"360px", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
              {turno.cliente?.nombre || `Cliente #${turno.cliente_id}`}
            </p>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>
              {turno.servicio?.nombre} · {turno.fecha_hora_inicio?.replace(" ", "T").split("T")[1]?.slice(0,5)}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"20px", background:c.bg, border:`0.5px solid ${c.border}`, color:c.color, textTransform:"capitalize" }}>
              {estado}
            </span>
            <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
          </div>
        </div>

        {/* Info financiera */}
        <div style={{ marginBottom:"1.25rem" }}>
          <InfoRow label="Seña"           valor={turno.estado_senia === "exenta" ? "Sin seña" : `$${turno.monto_senia}`} />
          <InfoRow label="Total"          valor={`$${turno.monto_total}`} />
          <InfoRow label="Saldo restante" valor={`$${saldoRestante}`} colorValor={saldoRestante > 0 ? TEMA.primarioHover : "#5aaa5a"} />
          <InfoRow label="Estado seña"    valor={turno.estado_senia} />
          {turno.observacion && (
            <div style={{ marginTop:"8px", padding:"8px 10px", background: TEMA.estados.reservado.bg, border:`0.5px solid ${TEMA.estados.reservado.border}`, borderRadius:"6px" }}>
              <p style={{ fontSize:"11px", color: TEMA.estados.reservado.color, margin:"0 0 2px" }}>Observación</p>
              <p style={{ fontSize:"12px", color: TEMA.textoPrimario, margin:0 }}>{turno.observacion}</p>
            </div>
          )}
        </div>

        {estado === "reservado" && (
          <AccionesReservado turno={turno} cargando={cargando} onRegistrarSenia={registrarSenia} onAccion={accion} onWhatsApp={abrirWhatsApp} />
        )}

        {estado === "confirmado" && (
          <>
            <Btn variante="green" onClick={() => accion("asistido")} disabled={cargando}>Marcar asistido</Btn>
            <Btn variante="dark"  onClick={() => accion("ausente", "¿Marcar al cliente como ausente?")} disabled={cargando}>Marcar ausente</Btn>
            <Btn variante="dark"  onClick={() => accion("cancelar", "¿Cancelar este turno?")} disabled={cargando}>Cancelar turno</Btn>
          </>
        )}

        {estado === "asistido" && (
          <FlujoPago turno={turno} onCompletado={onActualizado} onError={setError} />
        )}

        {["completado", "cancelado", "ausente"].includes(estado) && (
          <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", padding:"8px 0" }}>
            Turno cerrado — sin acciones disponibles
          </p>
        )}

        {error && (
          <p style={{ fontSize:"12px", color: TEMA.primarioHover, marginTop:"8px", textAlign:"center" }}>{error}</p>
        )}
      </div>
    </div>
  )
}

export default ModalTurno