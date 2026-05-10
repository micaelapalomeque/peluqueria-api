import { useState, useEffect } from "react"
import api from "../api"
import { TEMA } from "../theme"
import ModalCobrar from "../components/ModalCobrar"
import ModalCuentaCliente from "../components/ModalCuentaCliente"
import Swal from "sweetalert2"
import BtnExportar from "../components/BtnExportar"


function iniciales(nombre) {
  return nombre?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?"
}

function formatPeso(valor) {
  return `$${Number(valor).toLocaleString("es-AR")}`
}

const PAGOS_POR_PAGINA    = 20
const CLIENTES_POR_PAGINA = 10
const DEUDAS_POR_PAGINA   = 10

function CuentaCorriente() {
  const [pestaña,        setPestaña]        = useState("deudas")
  const [deudas,         setDeudas]         = useState([])
  const [clientes,       setClientes]       = useState([])
  const [pagos,          setPagos]          = useState([])
  const [resumen,        setResumen]        = useState(null)
  const [cargando,       setCargando]       = useState(true)
  const [modalDeuda,     setModalDeuda]     = useState(null)
  const [modalCuenta,    setModalCuenta]    = useState(null)
  const [paginaPagos,    setPaginaPagos]    = useState(1)
  const [paginaClientes, setPaginaClientes] = useState(1)
  const [paginaDeudas,   setPaginaDeudas]   = useState(1)

  function cargarTodo() {
    setCargando(true)
    Promise.all([
      api.get("/deudas/detalle/?estado=pendiente"),
      api.get("/deudas/detalle/?estado=parcial"),
      api.get("/clientes/"),
      api.get("/pagos/"),
      api.get("/clientes/ranking/frecuentes"),
    ]).then(([pendientes, parciales, clientesRes, pagosRes, frecuentesRes]) => {
      setDeudas([...pendientes.data, ...parciales.data])
      setClientes(clientesRes.data.filter(c => c.activo))
      setPagos(
        pagosRes.data
          .filter(p => p.estado_pago === "pagado")
          .sort((a, b) => new Date(b.fecha_pago) - new Date(a.fecha_pago))
      )

      const todasDeudas      = [...pendientes.data, ...parciales.data]
      const totalAdeudado    = todasDeudas.reduce((acc, d) => acc + Number(d.saldo_pendiente), 0)
      const clientesConDeuda = new Set(todasDeudas.map(d => d.cliente_id)).size
      const cobradoEsteMes   = pagosRes.data
        .filter(p => {
          const fechaPago = new Date(p.fecha_pago)
          const hoy = new Date()
          return p.estado_pago === "pagado" &&
            fechaPago.getMonth()    === hoy.getMonth() &&
            fechaPago.getFullYear() === hoy.getFullYear()
        })
        .reduce((acc, p) => acc + Number(p.monto), 0)

      const turnosCompletados = frecuentesRes.data.reduce((acc, c) => acc + (c.total_turnos || 0), 0)
      setResumen({ totalAdeudado, clientesConDeuda, cobradoEsteMes, turnosCompletados })
    }).catch(console.error)
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargarTodo() }, [])

function enviarResumenCliente(cliente) {
  const celular = cliente.celular.replace(/\D/g, "")
  const numero  = celular.startsWith("54") ? celular : `54${celular}`
  const cantidad = cliente.deudasCliente.length
  const total    = cliente.total
  const mensaje = encodeURIComponent(
    `Hola ${cliente.nombre}! \n` +
    `Te recordamos que tenés *${cantidad} corte${cantidad > 1 ? "s" : ""}* pendiente${cantidad > 1 ? "s" : ""} de pago por un total de *${formatPeso(total)}*\n\n` +
    `Cualquier consulta estamos a disposición. ¡Gracias!`
  )

  window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank")
}
  function enviarRecordatorio(deuda) {
    const celular = deuda.cliente_celular.replace(/\D/g, "")
    const numero  = celular.startsWith("54") ? celular : `54${celular}`
    const fecha   = new Date(deuda.fecha_turno).toLocaleDateString("es-AR", {
      weekday:"long", day:"numeric", month:"long"
    })
    const hora = deuda.fecha_turno?.split("T")[1]?.slice(0, 5)
    const mensaje = encodeURIComponent(
      `Hola ${deuda.cliente_nombre}! \n` +
      `Te recordamos que tenés una deuda pendiente de *${formatPeso(deuda.saldo_pendiente)}*\n` +
      `Servicio: ${deuda.servicio_nombre}\n` +
      `Fecha del turno: ${fecha} a las ${hora}hs\n\n` +
      `Cualquier consulta estamos a disposición. ¡Gracias!`
    )
    window.open(`https://wa.me/${numero}?text=${mensaje}`, "_blank")
  }

  function nombreCliente(cliente_id) {
    return clientes.find(c => c.id === cliente_id)?.nombre || `Cliente #${cliente_id}`
  }

  const deudasPorCliente = clientes.map(cliente => {
    const deudasCliente = deudas.filter(d => d.cliente_id === cliente.id)
    const total = deudasCliente.reduce((acc, d) => acc + Number(d.saldo_pendiente), 0)
    return { ...cliente, deudasCliente, total }
  }).sort((a, b) => b.total - a.total)

  const totalPaginas         = Math.ceil(pagos.length / PAGOS_POR_PAGINA)
  const pagosPagina          = pagos.slice((paginaPagos - 1) * PAGOS_POR_PAGINA, paginaPagos * PAGOS_POR_PAGINA)
  const totalPaginasClientes = Math.ceil(deudasPorCliente.length / CLIENTES_POR_PAGINA)
  const clientesPagina       = deudasPorCliente.slice((paginaClientes - 1) * CLIENTES_POR_PAGINA, paginaClientes * CLIENTES_POR_PAGINA)
  const totalPaginasDeudas   = Math.ceil(deudas.length / DEUDAS_POR_PAGINA)
  const deudasPagina         = deudas.slice((paginaDeudas - 1) * DEUDAS_POR_PAGINA, paginaDeudas * DEUDAS_POR_PAGINA)

  return (
    <div style={{ flex:1, padding:"1.5rem", background: TEMA.fondo, overflowY:"auto" }}>

      {/* Encabezado */}
      <div style={{ marginBottom:"1.25rem" }}>
        <p style={{ fontSize:"16px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>Cuenta corriente</p>
        <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>Resumen financiero y deudas</p>
      </div>

      {/* Resumen */}
      {resumen && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:"10px", marginBottom:"1.25rem" }}>
          <div style={{ background:"#1f1a0a", border:`1px solid ${TEMA.estados.reservado.border}`, borderRadius:"8px", padding:"14px 16px" }}>
            <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 4px" }}>Total adeudado</p>
            <p style={{ fontSize:"18px", fontWeight:500, color:"#f0b429", margin:0 }}>{formatPeso(resumen.totalAdeudado)}</p>
          </div>
          <div style={{ background:"#0a1f0a", border:"1px solid #1a5a1a", borderRadius:"8px", padding:"14px 16px" }}>
            <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 4px" }}>Cobrado este mes</p>
            <p style={{ fontSize:"18px", fontWeight:500, color:"#44cc44", margin:0 }}>{formatPeso(resumen.cobradoEsteMes)}</p>
          </div>
          <div style={{ background: TEMA.primarioBg, border:`1px solid ${TEMA.primarioBorder}`, borderRadius:"8px", padding:"14px 16px" }}>
            <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 4px" }}>Clientes con deuda</p>
            <p style={{ fontSize:"18px", fontWeight:500, color: TEMA.primarioHover, margin:0 }}>{resumen.clientesConDeuda}</p>
          </div>
          <div style={{ background:"#1a0a2a", border:"1px solid #5a1a8a", borderRadius:"8px", padding:"14px 16px" }}>
            <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:"0 0 4px" }}>Turnos completados</p>
            <p style={{ fontSize:"18px", fontWeight:500, color:"#cc66ff", margin:0 }}>{resumen.turnosCompletados}</p>
          </div>
        </div>
      )}

      {/* Pestañas */}
      <div style={{ display:"flex", gap:"8px", marginBottom:"1.25rem", flexWrap:"wrap" }}>
        {[
          { key:"deudas",    label:"Deudas pendientes" },
          { key:"clientes",  label:"Por cliente" },
          { key:"historial", label:"Historial de pagos" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setPestaña(tab.key)}
            style={{
              padding:"6px 14px", borderRadius:"6px", fontSize:"13px", cursor:"pointer",
              border:     pestaña === tab.key ? `0.5px solid ${TEMA.primario}` : `0.5px solid ${TEMA.borde}`,
              background: pestaña === tab.key ? TEMA.primarioBg : TEMA.superficie,
              color:      pestaña === tab.key ? TEMA.primarioHover : TEMA.textoSecundario,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <p style={{ color: TEMA.textoSecundario, fontSize:"14px" }}>Cargando...</p>
      ) : (
        <>
          {/* ── DEUDAS PENDIENTES ── */}
            {pestaña === "deudas" && (
            <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
                    Deudas pendientes
                </p>
                <BtnExportar
                    nombreArchivo="deudas_pendientes"
                    titulo="Deudas Pendientes"
                    columnas={["Cliente", "Turno", "Servicio", "Estado", "Monto"]}
                    filas={deudas.map(d => [
                    d.cliente_nombre || nombreCliente(d.cliente_id),
                    `#${d.turno_id}`,
                    d.servicio_nombre || "",
                    d.estado,
                    `$${Number(d.saldo_pendiente).toLocaleString("es-AR")}`,
                    ])}
                />
                </div>

                <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
                <div style={{ display:"flex", padding:"10px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"12px", color: TEMA.textoTerciario }}>
                    <span style={{ flex:2 }}>Cliente</span>
                    <span style={{ flex:2 }}>Turno</span>
                    <span style={{ flex:1, textAlign:"center" }}>Deuda</span>
                    <span style={{ flex:1, textAlign:"right" }}>Acción</span>
                </div>
                {deudasPagina.length === 0 ? (
                    <p style={{ padding:"1.5rem", textAlign:"center", color: TEMA.textoTerciario, fontSize:"14px" }}>
                    Sin deudas pendientes
                    </p>
                ) : deudasPagina.map(deuda => (
                    <div key={deuda.deuda_id}
                    style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, gap:"12px" }}
                    onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                    <div style={{ flex:2 }}>
                        <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
                        {deuda.cliente_nombre || nombreCliente(deuda.cliente_id)}
                        </p>
                        <span style={{ fontSize:"10px", padding:"2px 6px", borderRadius:"20px", background: TEMA.estados.reservado.bg, color: TEMA.estados.reservado.color, border:`0.5px solid ${TEMA.estados.reservado.border}` }}>
                        {deuda.estado}
                        </span>
                    </div>
                    <div style={{ flex:2, fontSize:"12px", color: TEMA.textoSecundario }}>
                        <p style={{ margin:0 }}>Turno #{deuda.turno_id}</p>
                        {deuda.servicio_nombre && (
                        <p style={{ margin:0, fontSize:"11px", color: TEMA.textoTerciario }}>{deuda.servicio_nombre}</p>
                        )}
                    </div>
                    <div style={{ flex:1, textAlign:"center", fontSize:"14px", fontWeight:500, color:"#f0b429" }}>
                        {formatPeso(deuda.saldo_pendiente)}
                    </div>
                    <div style={{ flex:1, textAlign:"right", display:"flex", gap:"6px", justifyContent:"flex-end" }}>
                        <button onClick={() => enviarRecordatorio(deuda)}
                        style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:"0.5px solid #1a5a1a", color:"#44cc44", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Enviar recordatorio
                        </button>
                        <button onClick={() => setModalDeuda(deuda)}
                        style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.primarioBorder}`, color: TEMA.primarioHover, fontSize:"12px", cursor:"pointer" }}>
                        Cobrar
                        </button>
                    </div>
                    </div>
                ))}
                </div>

                {/* Paginación deudas */}
                {totalPaginasDeudas > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"1rem" }}>
                    <button
                    onClick={() => setPaginaDeudas(p => Math.max(1, p - 1))}
                    disabled={paginaDeudas === 1}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaDeudas === 1 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaDeudas === 1 ? "not-allowed" : "pointer", fontSize:"13px" }}
                    >←</button>
                    <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>
                    Página <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{paginaDeudas}</span> de <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{totalPaginasDeudas}</span>
                    </span>
                    <button
                    onClick={() => setPaginaDeudas(p => Math.min(totalPaginasDeudas, p + 1))}
                    disabled={paginaDeudas === totalPaginasDeudas}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaDeudas === totalPaginasDeudas ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaDeudas === totalPaginasDeudas ? "not-allowed" : "pointer", fontSize:"13px" }}
                    >→</button>
                </div>
                )}
                <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", marginTop:"8px" }}>
                {deudas.length} deudas en total
                </p>
            </>
            )}

          {/* ── POR CLIENTE ── */}
          {pestaña === "clientes" && (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                {clientesPagina.map(cliente => (
                  <div key={cliente.id}
                    style={{ background: TEMA.superficieAlta, border:`0.5px solid ${cliente.total > 0 ? TEMA.estados.reservado.border : TEMA.bordeSuave}`, borderRadius:"8px", padding:"14px 16px", display:"flex", alignItems:"center", gap:"12px" }}>
                    <div style={{ width:"36px", height:"36px", borderRadius:"50%", background: TEMA.primarioBg, border:`0.5px solid ${TEMA.primarioBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:500, color: TEMA.primarioHover, flexShrink:0 }}>
                      {iniciales(cliente.nombre)}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>{cliente.nombre}</p>
                      <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:0 }}>
                        {cliente.deudasCliente.length > 0
                          ? `${cliente.deudasCliente.length} deuda${cliente.deudasCliente.length > 1 ? "s" : ""} pendiente${cliente.deudasCliente.length > 1 ? "s" : ""}`
                          : "Sin deudas"}
                      </p>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <p style={{ fontSize:"15px", fontWeight:500, color: cliente.total > 0 ? "#f0b429" : "#44cc44", margin:"0 0 4px" }}>
                        {formatPeso(cliente.total)}
                      </p>
                      <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"20px", background: cliente.total > 0 ? TEMA.estados.reservado.bg : "#0a1f0a", color: cliente.total > 0 ? "#f0b429" : "#44cc44", border:`0.5px solid ${cliente.total > 0 ? TEMA.estados.reservado.border : "#1a5a1a"}` }}>
                        {cliente.total > 0 ? "Con deuda" : "Al día"}
                      </span>
                      <div style={{ marginTop:"6px", display:"flex", gap:"6px", justifyContent:"flex-end" }}>
                        {cliente.deudasCliente.length > 0 && (
                                <button onClick={() => enviarResumenCliente(cliente)}
                                style={{ padding:"5px 10px", borderRadius:"6px", background:"transparent", border:"0.5px solid #1a5a1a", color:"#44cc44", fontSize:"12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                Enviar recordatorio
                                </button>
                        )}
                 

                        <button onClick={() => setModalCuenta(cliente)}
                          style={{ padding:"4px 10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"11px", cursor:"pointer" }}>
                          Ver cuenta
                        </button>
                        
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación clientes */}
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
                {deudasPorCliente.length} clientes en total
              </p>
            </>
          )}

          {/* ── HISTORIAL ── */}
            {pestaña === "historial" && (
            <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
                    Historial de pagos
                </p>
                <BtnExportar
                    nombreArchivo="historial_pagos"
                    titulo="Historial de Pagos"
                    columnas={["Cliente", "Fecha", "Metodo", "Tipo", "Monto"]}
                    filas={pagos.map(p => [
                    nombreCliente(p.cliente_id),
                    new Date(p.fecha_pago).toLocaleDateString("es-AR"),
                    p.metodo_pago,
                    p.tipo_pago,
                    `$${Number(p.monto).toLocaleString("es-AR")}`,
                    ])}
                />
                </div>

                <div style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"8px", overflow:"hidden" }}>
                <div style={{ display:"flex", padding:"10px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, fontSize:"12px", color: TEMA.textoTerciario }}>
                    <span style={{ flex:2 }}>Cliente</span>
                    <span style={{ flex:1, textAlign:"center" }}>Fecha</span>
                    <span style={{ flex:1, textAlign:"center" }}>Método</span>
                    <span style={{ flex:1, textAlign:"right" }}>Monto</span>
                    <span style={{ flexShrink:0, width:"80px" }}></span>
                </div>
                {pagosPagina.length === 0 ? (
                    <p style={{ padding:"1.5rem", textAlign:"center", color: TEMA.textoTerciario, fontSize:"14px" }}>
                    Sin historial de pagos
                    </p>
                ) : pagosPagina.map(pago => (
                    <div key={pago.pago_id}
                    style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`0.5px solid ${TEMA.bordeSuave}`, gap:"12px" }}
                    onMouseEnter={e => e.currentTarget.style.background = TEMA.superficie}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                    <div style={{ flex:2 }}>
                        <p style={{ fontSize:"14px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
                        {nombreCliente(pago.cliente_id)}
                        </p>
                        <p style={{ fontSize:"11px", color: TEMA.textoTerciario, margin:0, textTransform:"capitalize" }}>
                        {pago.tipo_pago}
                        </p>
                    </div>
                    <div style={{ flex:1, textAlign:"center", fontSize:"12px", color: TEMA.textoSecundario }}>
                        {new Date(pago.fecha_pago).toLocaleDateString("es-AR")}
                    </div>
                    <div style={{ flex:1, textAlign:"center", fontSize:"12px", color: TEMA.textoSecundario, textTransform:"capitalize" }}>
                        {pago.metodo_pago}
                    </div>
                    <div style={{ flex:1, textAlign:"right", fontSize:"14px", fontWeight:500, color:"#44cc44" }}>
                        {formatPeso(pago.monto)}
                    </div>
                    <div style={{ flexShrink:0, width:"80px", textAlign:"right" }}>
                        <button
                        onClick={async () => {
                            const result = await Swal.fire({
                            title: "¿Borrar este pago?",
                            text: "Se reabrirá la deuda automáticamente.",
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonColor: "#CC0000",
                            cancelButtonColor: "#333",
                            confirmButtonText: "Sí, borrar",
                            cancelButtonText: "Cancelar",
                            background: "#1e1e1e",
                            color: "#f0f0f0",
                            })
                            if (!result.isConfirmed) return
                            api.patch(`/pagos/${pago.pago_id}/cancelar`)
                            .then(() => cargarTodo())
                            .catch(e => Swal.fire({ title:"Error", text: e.response?.data?.detail || "Error al revertir", icon:"error", background:"#1e1e1e", color:"#f0f0f0" }))
                        }}
                        style={{ padding:"4px 8px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.primarioBorder}`, color: TEMA.primarioHover, fontSize:"14px", cursor:"pointer", lineHeight:1 }}
                        >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                        </svg>
                        </button>
                    </div>
                    </div>
                ))}
                </div>

              {/* Paginación pagos */}
              {totalPaginas > 1 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"12px", marginTop:"1rem" }}>
                  <button
                    onClick={() => setPaginaPagos(p => Math.max(1, p - 1))}
                    disabled={paginaPagos === 1}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaPagos === 1 ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaPagos === 1 ? "not-allowed" : "pointer", fontSize:"13px" }}
                  >←</button>
                  <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>
                    Página <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{paginaPagos}</span> de <span style={{ color: TEMA.textoPrimario, fontWeight:500 }}>{totalPaginas}</span>
                  </span>
                  <button
                    onClick={() => setPaginaPagos(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaPagos === totalPaginas}
                    style={{ padding:"6px 14px", borderRadius:"6px", border:`0.5px solid ${TEMA.borde}`, background: TEMA.superficie, color: paginaPagos === totalPaginas ? TEMA.textoDeshabilitado : TEMA.textoSecundario, cursor: paginaPagos === totalPaginas ? "not-allowed" : "pointer", fontSize:"13px" }}
                  >→</button>
                </div>
              )}
              <p style={{ fontSize:"12px", color: TEMA.textoTerciario, textAlign:"center", marginTop:"8px" }}>
                {pagos.length} pagos en total
              </p>
            </>
          )}
        </>
      )}

     
      {modalCuenta && (
        <ModalCuentaCliente
            cliente={modalCuenta}
            onCerrar={() => setModalCuenta(null)}
        />
        )}
        {modalDeuda && (
        <ModalCobrar
            deuda={modalDeuda}
            onCerrar={() => setModalDeuda(null)}
            onCobrado={cargarTodo}
        />
        )}
    </div>
  )
}

export default CuentaCorriente