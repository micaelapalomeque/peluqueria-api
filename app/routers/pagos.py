from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models, schemas

router = APIRouter(prefix="/pagos", tags=["Pagos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.PagoResponse)
def crear_pago(pago: schemas.PagoCreate, db: Session = Depends(get_db)):

    if pago.monto <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    if pago.tipo_pago not in ["SENIA", "RESTO", "TOTAL"]:
        raise HTTPException(status_code=400, detail="Tipo de pago inválido")

    if pago.estado_pago not in ["PENDIENTE", "PAGADO"]:
        raise HTTPException(status_code=400, detail="Estado de pago inválido")

    if pago.metodo_pago not in ["EFECTIVO", "TRANSFERENCIA", "MERCADO_PAGO"]:
        raise HTTPException(status_code=400, detail="Método de pago inválido")

    turno = None

    if pago.turno_id is not None:
        turno = db.query(models.Turno).filter(models.Turno.turno_id == pago.turno_id).first()

        if not turno:
            raise HTTPException(status_code=404, detail="Turno no encontrado")

        if turno.estado == "CANCELADO":
            raise HTTPException(status_code=400, detail="No se puede registrar un pago sobre un turno cancelado")

        pago.cliente_id = turno.cliente_id
        pago.servicio_id = turno.servicio_id

    if pago.cliente_id is not None:
        cliente = db.query(models.Cliente).filter(models.Cliente.id == pago.cliente_id).first()

        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    if pago.servicio_id is not None:
        servicio = db.query(models.Servicio).filter(models.Servicio.id == pago.servicio_id).first()

        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

    nuevo_pago = models.Pago(
        turno_id=pago.turno_id,
        cliente_id=pago.cliente_id,
        servicio_id=pago.servicio_id,
        monto=pago.monto,
        metodo_pago=pago.metodo_pago,
        tipo_pago=pago.tipo_pago,
        estado_pago=pago.estado_pago,
        descripcion=pago.descripcion,
        observacion=pago.observacion
    )

    db.add(nuevo_pago)

    if turno and pago.tipo_pago == "SENIA" and pago.estado_pago == "PAGADO":
        turno.estado = "CONFIRMADO"
        turno.estado_senia = "PAGADA"

    db.commit()
    db.refresh(nuevo_pago)

    return nuevo_pago


@router.get("/", response_model=List[schemas.PagoResponse])
def listar_pagos(db: Session = Depends(get_db)):
    return db.query(models.Pago).all()


@router.get("/{pago_id}", response_model=schemas.PagoResponse)
def obtener_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.query(models.Pago).filter(models.Pago.pago_id == pago_id).first()

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    return pago


@router.patch("/{pago_id}/confirmar", response_model=schemas.PagoResponse)
def confirmar_pago(pago_id: int, db: Session = Depends(get_db)):
    pago = db.query(models.Pago).filter(models.Pago.pago_id == pago_id).first()

    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if pago.estado_pago == "PAGADO":
        raise HTTPException(status_code=400, detail="El pago ya está confirmado")

    pago.estado_pago = "PAGADO"

    if pago.tipo_pago == "SENIA" and pago.turno_id is not None:
        turno = db.query(models.Turno).filter(
            models.Turno.turno_id == pago.turno_id
        ).first()

        if not turno:
            raise HTTPException(status_code=404, detail="Turno asociado no encontrado")

        if turno.estado == "CANCELADO":
            raise HTTPException(status_code=400, detail="No se puede confirmar la seña de un turno cancelado")

        turno.estado = "CONFIRMADO"
        turno.estado_senia = "PAGADA"

    db.commit()
    db.refresh(pago)

    return pago