from pydantic import BaseModel, validator
from datetime import datetime
from typing import Optional, Literal
from decimal import Decimal


# ── ENUMS como Literal ────────────────────────────────────────────────────────

MetodoPago  = Literal['efectivo', 'transferencia', 'mp', 'debito', 'credito']
TipoPago    = Literal['senia', 'parcial', 'total', 'saldo_favor']
EstadoPago  = Literal['pendiente', 'pagado', 'cancelado']
EstadoDeuda = Literal['pendiente', 'parcial', 'saldada']


# ── CLIENTE ───────────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    celular:     str
    nombre:      str
    observacion: Optional[str] = None


class ClienteUpdate(BaseModel):
    celular:     Optional[str] = None
    nombre:      Optional[str] = None
    observacion: Optional[str] = None


class ClienteResponse(BaseModel):
    id:          int
    celular:     str
    nombre:      str
    activo:      bool
    fecha_alta:  datetime
    observacion: Optional[str] = None
    saldo_favor: Decimal  # NUEVO

    class Config:
        orm_mode = True


# ── SERVICIO ──────────────────────────────────────────────────────────────────

class ServicioCreate(BaseModel):
    nombre:       str
    duracion:     int
    precio_total: Decimal
    monto_senia:  Optional[Decimal] = None

    @validator("monto_senia")
    def validar_senia(cls, v, values):
        if v is not None and "precio_total" in values and v > values["precio_total"]:
            raise ValueError("La seña no puede ser mayor al precio total")
        return v


class ServicioUpdate(BaseModel):
    nombre:       Optional[str]     = None
    duracion:     Optional[int]     = None
    precio_total: Optional[Decimal] = None
    monto_senia:  Optional[Decimal] = None


class ServicioResponse(BaseModel):
    id:           int
    nombre:       str
    duracion:     int
    precio_total: Decimal
    monto_senia:  Optional[Decimal] = None
    activo:       bool

    class Config:
        orm_mode = True


# ── TURNO ─────────────────────────────────────────────────────────────────────

class TurnoCreate(BaseModel):
    cliente_id:        int
    servicio_id:       int
    fecha_hora_inicio: datetime
    observacion:       Optional[str] = None


class TurnoResponse(BaseModel):
    turno_id:          int
    cliente_id:        int
    servicio_id:       int
    fecha_hora_inicio: datetime
    fecha_hora_fin:    datetime
    monto_total:       Decimal
    monto_senia:       Optional[Decimal] = None
    estado:            str
    estado_senia:      Optional[str] = None
    link_pago_senia:   Optional[str] = None
    observacion:       Optional[str] = None

    class Config:
        orm_mode = True


# ── PAGO ──────────────────────────────────────────────────────────────────────

class PagoCreate(BaseModel):
    turno_id:    Optional[int] = None
    cliente_id:  Optional[int] = None
    servicio_id: Optional[int] = None
    monto:       Decimal
    metodo_pago: MetodoPago   # antes era str libre
    tipo_pago:   TipoPago     # antes era str libre
    estado_pago: EstadoPago   # antes era str libre
    descripcion: Optional[str] = None
    observacion: Optional[str] = None

    @validator("monto")
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v

    @validator("cliente_id", always=True)
    def debe_tener_referencia(cls, v, values):
        if v is None and values.get("turno_id") is None:
            raise ValueError("El pago debe estar asociado a un turno o a un cliente")
        return v


class PagoResponse(BaseModel):
    pago_id:     int
    turno_id:    Optional[int]
    cliente_id:  Optional[int]
    servicio_id: Optional[int]
    monto:       Decimal
    metodo_pago: str
    tipo_pago:   str
    estado_pago: str
    fecha_pago:  datetime
    descripcion: Optional[str]
    observacion: Optional[str]

    class Config:
        orm_mode = True


# ── DEUDA ─────────────────────────────────────────────────────────────────────

class DeudaCreate(BaseModel):
    cliente_id:        int
    turno_id:          int
    monto_original:    Decimal
    fecha_vencimiento: Optional[datetime] = None
    observacion:       Optional[str] = None

    @validator("monto_original")
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto original debe ser mayor a cero")
        return v


class DeudaPagoCreate(BaseModel):
    """Schema para registrar un pago parcial o total sobre una deuda existente."""
    monto:       Decimal
    metodo_pago: MetodoPago
    observacion: Optional[str] = None

    @validator("monto")
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v


class DeudaResponse(BaseModel):
    deuda_id:          int
    cliente_id:        int
    turno_id:          int
    monto_original:    Decimal
    monto_pagado:      Decimal
    saldo_pendiente:   Decimal
    estado:            EstadoDeuda
    fecha_generacion:  datetime
    fecha_vencimiento: Optional[datetime] = None
    observacion:       Optional[str] = None

    class Config:
        orm_mode = True


class ResumenDeudaCliente(BaseModel):
    """Resumen financiero de un cliente: deudas + saldo a favor."""
    cliente_id:          int
    nombre:              str
    saldo_favor:         Decimal
    total_adeudado:      Decimal
    deudas_pendientes:   list[DeudaResponse]

    class Config:
        orm_mode = True