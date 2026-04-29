from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Optional
from app.database import get_db
from app.models import Turno, Cliente, Servicio, Deuda, Pago
from app.schemas import TurnoCreate, TurnoResponse

router = APIRouter(prefix="/turnos", tags=["Turnos"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_or_404(db: Session, model, id_field, id_value):
    obj = db.query(model).filter(id_field == id_value).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"{model.__name__} no encontrado")
    return obj


def _calcular_fin(fecha_inicio, duracion_minutos: int):
    from datetime import timedelta
    return fecha_inicio + timedelta(minutes=duracion_minutos)


def _hay_conflicto_horario(db: Session, servicio_id: int, fecha_inicio, fecha_fin, excluir_turno_id: int = None) -> bool:
    """Verifica si ya existe un turno en ese horario para el mismo servicio."""
    query = (
        db.query(Turno)
        .filter(Turno.servicio_id == servicio_id)
        .filter(Turno.estado.notin_(["cancelado"]))
        .filter(Turno.fecha_hora_inicio < fecha_fin)
        .filter(Turno.fecha_hora_fin > fecha_inicio)
    )
    if excluir_turno_id:
        query = query.filter(Turno.turno_id != excluir_turno_id)
    return query.first() is not None


def _crear_deuda_si_corresponde(db: Session, turno: Turno):
    """
    Si el turno tiene saldo pendiente luego de la seña,
    genera automáticamente una deuda por el resto.
    """
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


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[TurnoResponse])
def listar_turnos(
    estado: Optional[str] = None,
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Lista turnos. Filtrá por estado y/o cliente_id opcionalmente."""
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
    cliente  = _get_or_404(db, Cliente,  Cliente.id,    turno_in.cliente_id)
    servicio = _get_or_404(db, Servicio, Servicio.id,   turno_in.servicio_id)

    if not cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente está dado de baja")
    if not servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio está dado de baja")

    fecha_fin = _calcular_fin(turno_in.fecha_hora_inicio, servicio.duracion)

    if _hay_conflicto_horario(db, turno_in.servicio_id, turno_in.fecha_hora_inicio, fecha_fin):
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
    db.flush()  # para obtener turno_id antes del commit

    # Si la seña es $0 lo confirmamos directamente como exento
    if monto_senia == 0:
        turno.estado       = "confirmado"
        turno.estado_senia = "exenta"
        _crear_deuda_si_corresponde(db, turno)

    db.commit()
    db.refresh(turno)
    return turno


@router.patch("/{turno_id}/seniar", response_model=TurnoResponse)
def seniar_turno(
    turno_id: int,
    metodo_pago: str,
    db: Session = Depends(get_db)
):
    """
    Registra el pago de la seña y confirma el turno.
    Genera la deuda por el saldo restante automáticamente.
    """
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)

    if turno.estado == "cancelado":
        raise HTTPException(status_code=400, detail="El turno está cancelado")
    if turno.estado_senia == "abonada":
        raise HTTPException(status_code=400, detail="La seña ya fue registrada")
    if turno.estado_senia == "exenta":
        raise HTTPException(status_code=400, detail="Este turno no requiere seña")

    metodos_validos = ["efectivo", "transferencia", "mp", "debito", "credito"]
    if metodo_pago not in metodos_validos:
        raise HTTPException(status_code=400, detail=f"Método de pago inválido. Opciones: {metodos_validos}")

    # Registrar pago de seña
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

    turno.estado       = "confirmado"
    turno.estado_senia = "abonada"

    # Generar deuda por el saldo restante
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
    """
    Marca el turno como completado.
    Solo se permite si no tiene deuda pendiente.
    """
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)

    if turno.estado != "asistido":
        raise HTTPException(status_code=400, detail="El turno debe estar en estado asistido")

    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    if deuda and deuda.estado != "saldada":
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

    # Si tenía deuda pendiente, cancelarla también
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
    """El cliente no se presentó. El turno se cancela pero la seña NO se devuelve."""
    turno = _get_or_404(db, Turno, Turno.turno_id, turno_id)

    if turno.estado != "confirmado":
        raise HTTPException(status_code=400, detail="El turno debe estar confirmado")

    # La deuda por el saldo se cancela — solo se pierde la seña
    deuda = db.query(Deuda).filter(Deuda.turno_id == turno_id).first()
    if deuda and deuda.estado != "saldada":
        deuda.estado = "saldada"
        deuda.observacion = "Cancelada por ausencia del cliente"

    turno.estado = "cancelado"
    db.commit()
    db.refresh(turno)
    return turno