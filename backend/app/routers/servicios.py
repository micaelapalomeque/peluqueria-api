from typing import List
from decimal import Decimal
from sqlalchemy import func

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models, schemas
from app.models import Servicio, Turno

router = APIRouter(prefix="/servicios", tags=["Servicios"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ServicioResponse)
def crear_servicio(servicio: schemas.ServicioCreate, db: Session = Depends(get_db)):
    if servicio.duracion <= 0:
        raise HTTPException(status_code=400, detail="La duración debe ser mayor a 0")
    if servicio.precio_total <= 0:
        raise HTTPException(status_code=400, detail="El precio total debe ser mayor a 0")
    existente = db.query(models.Servicio).filter(
        models.Servicio.nombre == servicio.nombre
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un servicio con ese nombre")
    monto_senia = (servicio.precio_total * Decimal("0.5")).quantize(Decimal("0.01"))
    nuevo_servicio = models.Servicio(
        nombre       = servicio.nombre,
        duracion     = servicio.duracion,
        precio_total = servicio.precio_total,
        monto_senia  = monto_senia,
        activo       = True
    )
    db.add(nuevo_servicio)
    db.commit()
    db.refresh(nuevo_servicio)
    return nuevo_servicio


@router.get("/", response_model=List[schemas.ServicioResponse])
def listar_servicios(db: Session = Depends(get_db)):
    return db.query(models.Servicio).all()


# ── REPORTE (debe ir antes de /{servicio_id}) ─────────────────────────────────

@router.get("/reporte/ranking")
def reporte_ranking_servicios(db: Session = Depends(get_db)):
    resultados = (
        db.query(
            Servicio.id,
            Servicio.nombre,
            Servicio.precio_total,
            func.count(Turno.turno_id).label("total_turnos"),
        )
        .join(Turno, Turno.servicio_id == Servicio.id)
        .filter(Turno.estado == "completado")
        .group_by(Servicio.id)
        .order_by(func.count(Turno.turno_id).desc())
        .all()
    )
    return [
        {
            "id":           r.id,
            "nombre":       r.nombre,
            "precio":       float(r.precio_total),
            "total_turnos": r.total_turnos,
            "ingresos":     round(float(r.precio_total) * r.total_turnos, 2),
        }
        for r in resultados
    ]


# ── CRUD por ID (deben ir después de las rutas fijas) ─────────────────────────

@router.get("/{servicio_id}", response_model=schemas.ServicioResponse)
def obtener_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    return servicio


@router.put("/{servicio_id}", response_model=schemas.ServicioResponse)
def modificar_servicio(servicio_id: int, datos: schemas.ServicioUpdate, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if datos.nombre is not None:
        existente = db.query(models.Servicio).filter(
            models.Servicio.nombre == datos.nombre,
            models.Servicio.id != servicio_id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe un servicio con ese nombre")
        servicio.nombre = datos.nombre
    if datos.duracion is not None:
        if datos.duracion <= 0:
            raise HTTPException(status_code=400, detail="La duración debe ser mayor a 0")
        servicio.duracion = datos.duracion
    if datos.precio_total is not None:
        if datos.precio_total <= 0:
            raise HTTPException(status_code=400, detail="El precio total debe ser mayor a 0")
        servicio.precio_total = datos.precio_total
        servicio.monto_senia  = (datos.precio_total * Decimal("0.5")).quantize(Decimal("0.01"))
    db.commit()
    db.refresh(servicio)
    return servicio


@router.patch("/{servicio_id}/baja", response_model=schemas.ServicioResponse)
def dar_baja_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if not servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio ya está dado de baja")
    servicio.activo = False
    db.commit()
    db.refresh(servicio)
    return servicio


@router.patch("/{servicio_id}/alta", response_model=schemas.ServicioResponse)
def dar_alta_servicio(servicio_id: int, db: Session = Depends(get_db)):
    servicio = db.query(models.Servicio).filter(models.Servicio.id == servicio_id).first()
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    if servicio.activo:
        raise HTTPException(status_code=400, detail="El servicio ya está activo")
    servicio.activo = True
    db.commit()
    db.refresh(servicio)
    return servicio