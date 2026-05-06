import { useState } from "react"
import api from "../api"
import { TEMA } from "../theme"

function ModalServicio({ servicio, onCerrar, onGuardado }) {
  const [form, setForm] = useState({
    nombre:       servicio?.nombre       || "",
    duracion:     servicio?.duracion     || "",
    precio_total: servicio?.precio_total || "",
  })
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState(null)

  const esEdicion = !!servicio

  function cambiar(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function guardar() {
    if (!form.nombre.trim())    return setError("El nombre es obligatorio")
    if (!form.duracion)         return setError("La duración es obligatoria")
    if (Number(form.duracion) <= 0) return setError("La duración debe ser mayor a 0")
    if (!form.precio_total)     return setError("El precio es obligatorio")
    if (Number(form.precio_total) <= 0) return setError("El precio debe ser mayor a 0")

    setCargando(true)
    setError(null)
    try {
      const payload = {
        nombre:       form.nombre,
        duracion:     Number(form.duracion),
        precio_total: Number(form.precio_total),
      }
      if (esEdicion) {
        await api.put(`/servicios/${servicio.id}`, payload)
      } else {
        await api.post("/servicios/", payload)
      }
      onGuardado()
      onCerrar()
    } catch(e) {
      setError(e.response?.data?.detail || "Error al guardar")
    } finally { setCargando(false) }
  }

  // Seña calculada al 50% para mostrar como preview
  const seniaPreview = form.precio_total
    ? `$${(Number(form.precio_total) * 0.5).toLocaleString("es-AR")}`
    : "-"

  return (
    <div onClick={onCerrar} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: TEMA.superficieAlta, border:`0.5px solid ${TEMA.bordeSuave}`, borderRadius:"12px", padding:"1.5rem", width:"360px" }}>

        {/* Encabezado */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <div>
            <p style={{ fontSize:"15px", fontWeight:500, color: TEMA.textoPrimario, margin:0 }}>
              {esEdicion ? "Editar servicio" : "Nuevo servicio"}
            </p>
            {esEdicion && (
              <p style={{ fontSize:"12px", color: TEMA.textoSecundario, margin:"2px 0 0" }}>
                {servicio.nombre}
              </p>
            )}
          </div>
          <span onClick={onCerrar} style={{ color: TEMA.textoTerciario, cursor:"pointer", fontSize:"18px" }}>✕</span>
        </div>

        {/* Formulario */}
        <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
          <div>
            <label style={{ fontSize:"13px", color: TEMA.textoSecundario, marginBottom:"6px", display:"block" }}>
              Nombre *
            </label>
            <input
              value={form.nombre}
              onChange={e => cambiar("nombre", e.target.value)}
              placeholder="Ej: Corte y barba"
              style={{ width:"100%", padding:"10px 12px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px", boxSizing:"border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize:"13px", color: TEMA.textoSecundario, marginBottom:"6px", display:"block" }}>
              Duración *
              <span style={{ fontSize:"11px", color: TEMA.textoTerciario, marginLeft:"6px" }}>(en minutos)</span>
            </label>
            <input
              value={form.duracion}
              onChange={e => cambiar("duracion", e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 30"
              inputMode="numeric"
              style={{ width:"100%", padding:"10px 12px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px", boxSizing:"border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize:"13px", color: TEMA.textoSecundario, marginBottom:"6px", display:"block" }}>
              Precio total *
            </label>
            <input
              value={form.precio_total}
              onChange={e => cambiar("precio_total", e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 5000"
              inputMode="numeric"
              style={{ width:"100%", padding:"10px 12px", background:"#2a2a2a", border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", color: TEMA.textoPrimario, fontSize:"14px", boxSizing:"border-box" }}
            />
          </div>

          {/* Preview seña */}
          <div style={{ background: TEMA.superficie, border:`0.5px solid ${TEMA.borde}`, borderRadius:"6px", padding:"10px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"13px", color: TEMA.textoSecundario }}>Seña (50% automático)</span>
            <span style={{ fontSize:"14px", fontWeight:500 }} className="text-yellow-400">{seniaPreview}</span>          </div>

        </div>

        {error && <p style={{ fontSize:"12px", color:"#f0b429 !important", marginTop:"10px" }}>{error}</p>}

        {/* Botones */}
        <div style={{ marginTop:"1.25rem", display:"flex", gap:"8px" }}>
          <button onClick={onCerrar}
            style={{ flex:1, padding:"10px", borderRadius:"6px", background:"transparent", border:`0.5px solid ${TEMA.borde}`, color: TEMA.textoSecundario, fontSize:"13px", cursor:"pointer" }}>
            Cancelar
          </button>
          <button onClick={guardar} disabled={cargando}
            style={{ flex:2, padding:"10px", borderRadius:"6px", background: TEMA.primario, border:"none", color:"white", fontSize:"13px", fontWeight:500, cursor: cargando ? "not-allowed" : "pointer", opacity: cargando ? 0.7 : 1 }}>
            {cargando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalServicio