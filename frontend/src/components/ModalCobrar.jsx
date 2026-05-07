import { useState } from "react"
import api from "../api"
import { TEMA } from "../theme"

const METODOS_PAGO = ["efectivo", "transferencia"]

function formatPeso(valor) {
  return `$${Number(valor).toLocaleString("es-AR")}`
}

function ModalCobrar({ deuda, onCerrar, onCobrado }) {
  const [metodo,       setMetodo]       = useState("")
  const [cargando,     setCargando]     = useState(false)
  const [error,        setError]        = useState(null)
  const [tipoRecargo,  setTipoRecargo]  = useState("ninguno")
  const [valorRecargo, setValorRecargo] = useState("")

  const montoBase = Number(deuda.saldo_pendiente)

  const montoFinal = (() => {
    if (tipoRecargo === "monto") {
      const v = Number(valorRecargo)
      return v > 0 ? montoBase + v : montoBase
    }
    if (tipoRecargo === "porcentaje") {
      const p = Number(valorRecargo)
      if (p > 0 && p <= 100) return Math.round(montoBase * (1 + p / 100))
    }
    return montoBase
  })()

  const hayRecargo = montoFinal > montoBase

  async function cobrar() {
    if (!metodo) return setError("Seleccioná un método de pago")
    setCargando(true)
    setError(null)
    try {
      await api.post(`/deudas/${deuda.deuda_id}/pagar`, {
        monto:       montoFinal,
        metodo_pago: metodo,
      })
      onCobrado()
      onCerrar()
    } catch(e) {
      setError(e.response?.data?.detail || "Error al cobrar")
    } finally { setCargando(false) }
  }

  return (
    <div
      onClick={onCerrar}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"340px" }}
      >
        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
              Registrar pago
            </p>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>
              Deuda original: {formatPeso(montoBase)}
            </p>
          </div>
          <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Recargo por mora */}
        <div style={{ background:"#1a1a1a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"12px" }}>
          <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 8px" }}>
            Recargo por mora <span style={{ fontSize:"11px", color: TEMA.textoTerciario }}>(opcional)</span>
          </p>
          <div style={{ display:"flex", gap:"6px", marginBottom:"8px" }}>
            {["ninguno", "monto", "porcentaje"].map(tipo => (
              <button key={tipo}
                onClick={() => { setTipoRecargo(tipo); setValorRecargo("") }}
                style={{
                  flex:1, padding:"5px", borderRadius:"6px", fontSize:"11px", cursor:"pointer",
                  border:     tipoRecargo === tipo ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
                  background: tipoRecargo === tipo ? TEMA.primarioBg : TEMA.superficie,
                  color:      tipoRecargo === tipo ? TEMA.primarioHover : TEMA.textoSecundario,
                }}>
                {tipo === "ninguno" ? "Sin recargo" : tipo === "monto" ? "$ Monto" : "% Porcentaje"}
              </button>
            ))}
          </div>

          {tipoRecargo !== "ninguno" && (
            <input
              value={valorRecargo}
              onChange={e => setValorRecargo(e.target.value.replace(/\D/g, ""))}
              placeholder={tipoRecargo === "monto" ? "Ej: 500" : "Ej: 10"}
              inputMode="numeric"
              style={{ width:"100%", padding:"8px 10px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"13px", boxSizing:"border-box" }}
            />
          )}

          {hayRecargo && (
            <div style={{ marginTop:"8px", display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
              <span style={{ color: TEMA.textoTerciario }}>Recargo:</span>
              <span style={{ color: TEMA.primarioHover, fontWeight:500 }}>+{formatPeso(montoFinal - montoBase)}</span>
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div style={{ marginBottom:"12px" }}>
          <label style={{ fontSize:"13px", color: TEMA.textoSecundario, marginBottom:"6px", display:"block" }}>
            Método de pago
          </label>
          <select
            value={metodo}
            onChange={e => setMetodo(e.target.value)}
            style={{ width:"100%", padding:"10px 12px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px" }}
          >
            <option value="">Seleccioná método</option>
            {METODOS_PAGO.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Total a cobrar */}
        <div style={{ background: hayRecargo ? TEMA.primarioBg : "#0a1a0a", border:`0.5px solid ${hayRecargo ? TEMA.primarioBorder : "#1a5a1a"}`, borderRadius:"6px", padding:"10px 12px", marginBottom:"12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Total a cobrar:</span>
          <span style={{ fontSize:"16px", fontWeight:500, color: hayRecargo ? TEMA.primarioHover : "#44cc44" }}>
            {formatPeso(montoFinal)}
          </span>
        </div>

        {error && (
          <p style={{ fontSize:"12px", color: TEMA.primarioHover, marginTop:"8px" }}>{error}</p>
        )}

        <div style={{ display:"flex", gap:"8px", marginTop:"1.25rem" }}>
          <button
            onClick={onCerrar}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor:"pointer" }}
          >
            Cancelar
          </button>
          <button
            onClick={cobrar}
            disabled={cargando}
            style={{ flex:2, padding:"10px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1 }}
          >
            {cargando ? "Cobrando..." : `Cobrar ${formatPeso(montoFinal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalCobrar