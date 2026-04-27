from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/turnos", tags=["Turnos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.TurnoResponse)
def crear_turno(turno: schemas.TurnoCreate, db: Session = Depends(get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == turno.cliente_id).first()

    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if not cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente está dado de baja")

    servicio = db.query(models.Servicio).filter(models.Servicio.id == turno.servicio_id).first()

    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    if not servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio está inactivo")

    if turno.fecha_hora_inicio < datetime.now():
        raise HTTPException(status_code=400, detail="No se puede asignar un turno en una fecha pasada")

    fecha_hora_fin = turno.fecha_hora_inicio + timedelta(minutes=servicio.duracion)

    turno_superpuesto = db.query(models.Turno).filter(
        models.Turno.estado.in_(["PENDIENTE", "CONFIRMADO"]),
        models.Turno.fecha_hora_inicio < fecha_hora_fin,
        models.Turno.fecha_hora_fin > turno.fecha_hora_inicio
    ).first()

    if turno_superpuesto:
        raise HTTPException(status_code=400, detail="Ya existe un turno en ese horario")

    nuevo_turno = models.Turno(
        cliente_id=turno.cliente_id,
        servicio_id=turno.servicio_id,
        fecha_hora_inicio=turno.fecha_hora_inicio,
        fecha_hora_fin=fecha_hora_fin,
        estado="PENDIENTE",
        observacion=turno.observacion,
        monto_senia=turno.monto_senia,
        estado_senia="PENDIENTE" if turno.monto_senia else "SIN_SENIA"
    )

    db.add(nuevo_turno)
    db.commit()
    db.refresh(nuevo_turno)

    return nuevo_turno


@router.get("/", response_model=List[schemas.TurnoResponse])
def listar_turnos(db: Session = Depends(get_db)):
    return db.query(models.Turno).all()


@router.get("/{turno_id}", response_model=schemas.TurnoResponse)
def obtener_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = db.query(models.Turno).filter(models.Turno.turno_id == turno_id).first()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    return turno


@router.patch("/{turno_id}/cancelar", response_model=schemas.TurnoResponse)
def cancelar_turno(turno_id: int, db: Session = Depends(get_db)):
    turno = db.query(models.Turno).filter(models.Turno.turno_id == turno_id).first()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if turno.estado in ["CANCELADO", "ASISTIDO", "AUSENTE"]:
        raise HTTPException(status_code=400, detail="No se puede cancelar este turno")

    turno.estado = "CANCELADO"

    db.commit()
    db.refresh(turno)

    return turno


@router.patch("/{turno_id}/asistido", response_model=schemas.TurnoResponse)
def marcar_asistido(turno_id: int, db: Session = Depends(get_db)):
    turno = db.query(models.Turno).filter(models.Turno.turno_id == turno_id).first()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if turno.estado != "PENDIENTE":
        raise HTTPException(status_code=400, detail="Solo se puede marcar como asistido un turno pendiente")

    turno.estado = "ASISTIDO"

    db.commit()
    db.refresh(turno)

    return turno


@router.patch("/{turno_id}/ausente", response_model=schemas.TurnoResponse)
def marcar_ausente(turno_id: int, db: Session = Depends(get_db)):
    turno = db.query(models.Turno).filter(models.Turno.turno_id == turno_id).first()

    if not turno:
        raise HTTPException(status_code=404, detail="Turno no encontrado")

    if turno.estado != "PENDIENTE":
        raise HTTPException(status_code=400, detail="Solo se puede marcar como ausente un turno pendiente")

    turno.estado = "AUSENTE"

    db.commit()
    db.refresh(turno)

    return turno