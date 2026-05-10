import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

function formatPeso(valor) {
  return `$${Number(valor).toLocaleString("es-AR")}`
}

function formatFecha(fecha) {
  if (!fecha) return ""
  return new Date(fecha).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long"
  })
}

function formatHora(fecha) {
  if (!fecha) return ""
  const f = fecha.replace(" ", "T")
  return f.split("T")[1]?.slice(0, 5)
}

function ModalCuentaCliente({ cliente, onCerrar, onExportarPDF }) {
  const [turnos,   setTurnos]   = useState([])
  const [pagos,    setPagos]    = useState([])
  const [deudas,   setDeudas]   = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    setCargando(true)
    Promise.all([
      api.get(`/turnos/?cliente_id=${cliente.id}`),
      api.get(`/pagos/`),
      api.get(`/deudas/cliente/${cliente.id}?solo_pendientes=false`),
    ]).then(([turnosRes, pagosRes, deudasRes]) => {
      const turnosCliente = turnosRes.data
        .filter(t => !["cancelado", "reservado"].includes(t.estado))
        .sort((a, b) => new Date(b.fecha_hora_inicio) - new Date(a.fecha_hora_inicio))
        .slice(0, 50)

      const pagosCliente = pagosRes.data
        .filter(p => p.cliente_id === cliente.id && p.estado_pago === "pagado")
        .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago))

      setTurnos(turnosCliente)
      setPagos(pagosCliente)
      setDeudas(deudasRes.data)
    }).catch(console.error)
      .finally(() => setCargando(false))
  }, [cliente.id])

  const totalDeuda = deudas
    .filter(d => d.estado !== "saldada")
    .reduce((acc, d) => acc + Number(d.saldo_pendiente), 0)

  function pagosDelTurno(turno_id) {
    return pagos.filter(p => p.turno_id === turno_id)
  }

  function deudaDelTurno(turno_id) {
    return deudas.find(d => d.turno_id === turno_id && d.estado !== "saldada")
  }

  function badgeTurno(turno) {
    const deuda = deudaDelTurno(turno.turno_id)
    if (turno.estado === "completado" && !deuda) {
      return { label: "Pagado", bg: "#0a1f0a", color: "#44cc44", border: "#1a5a1a" }
    }
    if (deuda) {
      return { label: "Sin pagar", bg: TEMA.primarioBg, color: TEMA.primarioHover, border: TEMA.primarioBorder }
    }
    if (turno.estado === "asistido") {
      return { label: "Asistido", bg: "#0a1f0a", color: "#44cc44", border: "#1a5a1a" }
    }
    return { label: turno.estado, bg: TEMA.superficie, color: TEMA.textoSecundario, border: TEMA.borde }
  }
  async function exportarPDF() {
        const doc = new jsPDF()
        doc.setFontSize(18)
        doc.setTextColor(204, 0, 0)
        doc.text("Peluqueria Isa", 14, 18)
        doc.setFontSize(12)
        doc.setTextColor(80, 80, 80)
        doc.text(`Estado de cuenta - ${cliente.nombre}`, 14, 26)
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")}`, 14, 32)
        doc.setFontSize(11)
        doc.setTextColor(0, 0, 0)
        doc.text(`Deuda pendiente total: $${totalDeuda.toLocaleString("es-AR")}`, 14, 42)

        const filas = turnos.map(turno => {
            const pagosTurno   = pagos.filter(p => p.turno_id === turno.turno_id)
            const deuda        = deudas.find(d => d.turno_id === turno.turno_id && d.estado !== "saldada")
            const fecha        = new Date(turno.fecha_hora_inicio.replace(" ", "T"))
            const fechaStr     = fecha.toLocaleDateString("es-AR", { day:"numeric", month:"short", year:"numeric" })
            const horaStr      = turno.fecha_hora_inicio.replace(" ", "T").split("T")[1]?.slice(0, 5)
            const servicio     = turno.servicio?.nombre || `Servicio #${turno.servicio_id}`
            const estado       = deuda ? "Sin pagar" : turno.estado === "completado" ? "Pagado" : turno.estado
            const monto        = deuda
            ? `-$${Number(deuda.saldo_pendiente).toLocaleString("es-AR")}`
            : pagosTurno.length > 0
                ? `$${pagosTurno.reduce((acc, p) => acc + Number(p.monto), 0).toLocaleString("es-AR")}`
                : "-"
            const pagosDetalle = pagosTurno.map(p =>
            `${p.tipo_pago === "senia" ? "Sena" : "Saldo"} $${Number(p.monto).toLocaleString("es-AR")} · ${new Date(p.fecha_pago).toLocaleDateString("es-AR")} · ${p.metodo_pago}`
            ).join(" / ")

            return [fechaStr + " " + horaStr + "hs", servicio, estado, monto, pagosDetalle]
        })

        autoTable(doc, {
            startY: 48,
            head: [["Fecha y hora", "Servicio", "Estado", "Monto", "Detalle pagos"]],
            body: filas,
            styles:             { fontSize:8, cellPadding:3 },
            headStyles:         { fillColor:[204, 0, 0], textColor:255, fontStyle:"bold" },
            alternateRowStyles: { fillColor:[245, 245, 245] },
            columnStyles: {
            0: { cellWidth:30 },
            1: { cellWidth:35 },
            2: { cellWidth:22 },
            3: { cellWidth:22 },
            4: { cellWidth:60 },
            }
        })

        doc.save(`cuenta_${cliente.nombre.replace(/ /g, "_")}.pdf`)
        }

  return (
    <div
      onClick={onCerrar}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"500px", maxHeight:"85vh", overflowY:"auto" }}
      >
        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>{cliente.nombre}</p>
            <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>Estado de cuenta corriente</p>
          </div>
          <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Tarjeta deuda */}
        {totalDeuda > 0 && (
          <div style={{ background:"#1f1a0a", border:`0.5px solid ${TEMA.estados.reservado.border}`, borderRadius:"8px", padding:"10px 14px", marginBottom:"1.25rem" }}>
            <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 2px" }}>Deuda pendiente</p>
            <p style={{ fontSize:"16px", fontWeight:500, color:"#f0b429", margin:0 }}>{formatPeso(totalDeuda)}</p>          </div>
        )}

        {totalDeuda === 0 && (
          <div style={{ background:"#0a1f0a", border:"0.5px solid #1a5a1a", borderRadius:"8px", padding:"10px 14px", marginBottom:"1.25rem" }}>
            <p style={{ fontSize:"13px", fontWeight:500, color:"#44cc44", margin:0 }}>Al día — sin deudas pendientes</p>
          </div>
        )}

        <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"0 0 8px" }}>Últimos movimientos</p>

        {cargando ? (
          <p style={{ color: TEMA.textoSecundario, fontSize:"13px", textAlign:"center", padding:"1rem" }}>Cargando...</p>
        ) : turnos.length === 0 ? (
          <p style={{ color: TEMA.textoTerciario, fontSize:"13px", textAlign:"center", padding:"1rem" }}>Sin movimientos</p>
        ) : (
          <div style={{ border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
            {turnos.map((turno, i) => {
              const badge       = badgeTurno(turno)
              const pagosTurno  = pagosDelTurno(turno.turno_id)
              const deuda       = deudaDelTurno(turno.turno_id)
              const montoMostrar = turno.monto_cobrado || turno.monto_total

              return (
                <div key={turno.turno_id}
                  style={{ padding:"12px 14px", borderBottom: i < turnos.length - 1 ? `0.5px solid ${TEMA.bordeSuave}` : "none" }}
                >
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: pagosTurno.length > 0 ? "6px" : 0 }}>
                    <div>
                      <p style={{ fontSize:"13px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
                        {turno.servicio?.nombre || `Servicio #${turno.servicio_id}`}
                      </p>
                      <p style={{ fontSize:"11px", color: TEMA.textoSecundario, margin:"2px 0 0", textTransform:"capitalize" }}>
                        {formatFecha(turno.fecha_hora_inicio)} · {formatHora(turno.fecha_hora_inicio)}hs
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontSize:"13px", fontWeight:500, color: deuda ? TEMA.primarioHover : "#44cc44", margin:"0 0 3px" }}>
                        {deuda ? `-${formatPeso(deuda.saldo_pendiente)}` : formatPeso(montoMostrar)}
                      </p>
                      <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"20px", background: badge.bg, color: badge.color, border:`0.5px solid ${badge.border}` }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>

                  {/* Pagos del turno */}
                  {pagosTurno.length > 0 && (
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginTop:"6px" }}>
                      {pagosTurno.map(pago => (
                        <span key={pago.pago_id} style={{ fontSize:"10px", color: TEMA.textoTerciario }}>
                          {pago.tipo_pago === "senia" ? "Seña" : "Saldo"} {formatPeso(pago.monto)} · {new Date(pago.fecha_pago).toLocaleDateString("es-AR")} · {pago.metodo_pago}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
      )}

        <div style={{ display:"flex", gap:"8px", marginTop:"1rem" }}>
          <button
            onClick={exportarPDF}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor:"pointer" }}>
             Descargar PDF
            </button>
          <button
            onClick={onCerrar}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor:"pointer" }}>
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalCuentaCliente