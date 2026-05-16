from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from datetime import timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models import Turno, Cliente, Servicio, Deuda, Pago
from app.schemas import TurnoCreate, TurnoResponse

router = APIRouter(prefix="/turnos", tags=["Turnos"])


def _get_or_404(db: Session, model, id_field, id_value):
    obj = db.query(model).filter(id_field == id_value).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj


def _calcular_fin(fecha_inicio, duracion_minutos: int):
    return fecha_inicio + timedelta(minutes=duracion_minutos)


def _hay_conflicto_horario(db: Session, fecha_inicio, fecha_fin, excluir_turno_id: int = None) -> bool:
    query = (
        db.query(Turno)
        .filter(Turno.estado.notin_(["cancelado"]))
        .filter(Turno.fecha_hora_inicio < fecha_fin)
        .filter(Turno.fecha_hora_fin > fecha_inicio)
    )
    if excluir_turno_id:
        query = query.filter(Turno.turno_id != excluir_turno_id)
    return query.first() is not None


def _crear_deuda_si_corresponde(db: Session, turno: Turno):
    saldo_restante = turno.monto_total - turno.monto_senia
    if saldo_restante > 0:
        deuda = Deuda(
            cliente_id      = turno.cliente_id,
            turno_id        = turno.turno_id,
            monto_original  = saldo_restante,
            monto_pagado    = Decimal("0"),
            saldo_pendiente = saldo_restante,
            estado          = "pendiente",
        )
        db.add(deuda)


# ─────────────────────────────────────────────
# Schema para actualizar monto_cobrado
# ─────────────────────────────────────────────

class MontoCobradoUpdate(BaseModel):
    monto_cobrado: Decimal


# ─────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────

@router.get("/", response_model=list[TurnoResponse])
def listar_turnos(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Turno)
    if estado:
        if estado not in ("reservado", "confirmado", "asistido", "completado", "cancelado"):
            raise HTTPException(status_code=400, detail="Estado inválido")
        query = query.filter(Turno.estado == estado)
    if cliente_id:
        query = query.filter(Turno.cliente_id == cliente_id)
    return query.order_by(Turno.fecha_hora_inicio.asc()).all()


@router.get("/{turno_id}", response_model=TurnoResponse)
def obtener_turno(turno_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, Turno, Turno.turno_id, turno_id)


@router.post("/", response_model=TurnoResponse, status_code=201)
def crear_turno(turno_in: TurnoCreate, db: Session = Depends(get_db)):
    cliente  = _get_or_404(db, Cliente,  Cliente.id,  turno_in.cliente_id)
    servicio = _get_or_404(db, Servicio, Servicio.id, turno_in.servicio_id)

    if not cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente está dado de baja")
    if not servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio está dado de baja")

    fecha_fin = _calcular_fin(turno_in.fecha_hora_inicio, servicio.duracion)

    if _hay_conflicto_horario(db, turno_in.fecha_hora_inicio, fecha_fin):
        raise HTTPException(status_code=409, detail="Ya existe un turno en ese horario")

    monto_senia = servicio.monto_senia if servicio.monto_senia else Decimal("0")

    turno = Turno(
        cliente_id        = turno_in.cliente_id,
        servicio_id       = turno_in.servicio_id,
        fecha_hora_inicio = turno_in.fecha_hora_inicio,
        fecha_hora_fin    = fecha_fin,
        monto_total       = servicio.precio_total,
        monto_senia       = monto_senia,
        estado            = "reservado",
        estado_senia      = "pendiente",
        observacion       = turno_in.observacion,
    )
    db.add(turno)
    db.flush()

    if monto_senia == 0:
        turno.estado       = "confirmado"
        turno.estado_senia = "exenta"
        _crear_deuda_si_corresponde(db, turno)

    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/monto_cobrado", response_model=TurnoResponse)
def actualizar_monto_cobrado(turno_id: int, datos: MontoCobradoUpdate, db: Session = Depends(get_db)):
    """Actualiza el monto cobrado con descuento — no modifica el precio original del servicio."""
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)
    if datos.monto_cobrado <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")
    if datos.monto_cobrado > turno.monto_total:
        raise HTTPException(status_code=400, detail="El monto no puede ser mayor al total")
    turno.monto_cobrado = datos.monto_cobrado
    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/seniar", response_model=TurnoResponse)
def seniar_turno(turno_id: int, metodo_pago: str, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)

    if turno.estado == "cancelado":
        raise HTTPException(status_code=400, detail="El turno está cancelado")
    if turno.estado_senia in ("abonada", "exenta"):
        raise HTTPException(status_code=400, detail="La seña ya fue registrada")

    turno.estado = "confirmado"

    if turno.monto_senia == 0:
        turno.estado_senia = "exenta"
        _crear_deuda_si_corresponde(db, turno)
    else:
        pago = Pago(
            turno_id    = turno.turno_id,
            cliente_id  = turno.cliente_id,
            servicio_id = turno.servicio_id,
            monto       = turno.monto_senia,
            metodo_pago = metodo_pago,
            tipo_pago   = "senia",
            estado_pago = "pagado",
            descripcion = f"Seña turno #{turno.turno_id}",
        )
        db.add(pago)
        turno.estado_senia = "abonada"
        _crear_deuda_si_corresponde(db, turno)

    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/confirmar_sin_senia", response_model=TurnoResponse)
def confirmar_sin_senia(turno_id: int, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)

    if turno.estado == "cancelado":
        raise HTTPException(status_code=400, detail="El turno está cancelado")
    if turno.estado_senia in ("abonada", "exenta"):
        raise HTTPException(status_code=400, detail="El turno ya fue confirmado")

    turno.monto_senia  = Decimal("0")
    turno.estado       = "confirmado"
    turno.estado_senia = "exenta"

    _crear_deuda_si_corresponde(db, turno)

    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/asistido", response_model=TurnoResponse)
def marcar_asistido(turno_id: int, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)
    if turno.estado != "confirmado":
        raise HTTPException(status_code=400, detail="El turno debe estar confirmado para marcarlo como asistido")
    turno.estado = "asistido"
    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/completar", response_model=TurnoResponse)
def completar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)
    if turno.estado != "asistido":
        raise HTTPException(status_code=400, detail="El turno debe estar en estado asistido")
    
    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    
    if deuda and deuda.estado != "saldada":
        # Si hay monto_cobrado (descuento), la deuda se salda por ese monto
        if turno.monto_cobrado is not None:
            deuda.saldo_pendiente = 0
            deuda.monto_pagado    = turno.monto_cobrado
            deuda.estado          = "saldada"
            db.commit()
        else:
            raise HTTPException(
                status_code=400,
                detail=f"El turno tiene una deuda pendiente de ${deuda.saldo_pendiente}"
            )
    
    turno.estado = "completado"
    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/cancelar", response_model=TurnoResponse)
def cancelar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)
    if turno.estado in ("completado", "cancelado"):
        raise HTTPException(status_code=400, detail=f"No se puede cancelar un turno {turno.estado}")
    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    if deuda and deuda.estado != "saldada":
        deuda.estado = "saldada"
        deuda.observacion = "Cancelada por cancelación del turno"
    turno.estado = "cancelado"
    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/ausente", response_model=TurnoResponse)
def marcar_ausente(turno_id: int, db: Session = Depends(get_db)):
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)
    if turno.estado != "confirmado":
        raise HTTPException(status_code=400, detail="El turno debe estar confirmado")
    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    if deuda and deuda.estado != "saldada":
        deuda.estado = "saldada"
        deuda.observacion = "Cancelada por ausencia del cliente"
    turno.estado = "ausente"
    db.commit()
    db.refresh(turno)
    return turno
@router.get("/reporte/estados")
def reporte_estados(db: Session = Depends(get_db)):
    """Tasa de asistencia vs ausencia vs cancelación"""
    from sqlalchemy import func
    resultados = (
        db.query(Turno.estado, func.count(Turno.turno_id).label("total"))
        .group_by(Turno.estado)
        .all()
    )
    return [{ "estado": r.estado, "total": r.total } for r in resultados]


@router.get("/reporte/dias-semana")
def reporte_dias_semana(db: Session = Depends(get_db)):
    """Turnos por día de la semana"""
    from sqlalchemy import func, extract
    resultados = (
        db.query(
            extract("dow", Turno.fecha_hora_inicio).label("dia"),
            func.count(Turno.turno_id).label("total")
        )
        .filter(Turno.estado.notin_(["cancelado"]))
        .group_by(extract("dow", Turno.fecha_hora_inicio))
        .order_by(extract("dow", Turno.fecha_hora_inicio))
        .all()
    )
    nombres = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    return [{ "dia": nombres[int(r.dia)], "total": r.total } for r in resultados]


@router.get("/reporte/hora-pico")
def reporte_hora_pico(db: Session = Depends(get_db)):
    """Horarios con más turnos"""
    from sqlalchemy import func, extract
    resultados = (
        db.query(
            extract("hour", Turno.fecha_hora_inicio).label("hora"),
            func.count(Turno.turno_id).label("total")
        )
        .filter(Turno.estado.notin_(["cancelado"]))
        .group_by(extract("hour", Turno.fecha_hora_inicio))
        .order_by(extract("hour", Turno.fecha_hora_inicio))
        .all()
    )
    return [{ "hora": f"{int(r.hora):02d}:00", "total": r.total } for r in resultados]