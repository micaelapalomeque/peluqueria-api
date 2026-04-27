from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from decimal import Decimal

#CLIENTE#
##############################################################
class ClienteCreate(BaseModel):
    celular: str
    nombre: str
    observacion: Optional[str] = None


class ClienteResponse(BaseModel):
    id: int
    celular: str
    nombre: str
    activo: bool
    fecha_alta: datetime
    observacion: Optional[str] = None

    class Config:
        orm_mode = True

class ClienteUpdate(BaseModel):
    celular: Optional[str] = None
    nombre: Optional[str] = None
    observacion: Optional[str] = None

###############################################################

#SERVICIO
###############################################################
class ServicioCreate(BaseModel):
    nombre: str
    duracion: int
    precio: Decimal


class ServicioUpdate(BaseModel):
    nombre: Optional[str] = None
    duracion: Optional[int] = None
    precio: Optional[Decimal] = None


class ServicioResponse(BaseModel):
    id: int
    nombre: str
    duracion: int
    precio: Decimal
    activo: bool

    class Config:
        orm_mode = True

################################################################

#TURNOS 
################################################################

class TurnoCreate(BaseModel):
    cliente_id: int
    servicio_id: int
    fecha_hora_inicio: datetime
    observacion: Optional[str] = None
    monto_senia: Optional[Decimal] = None


class TurnoResponse(BaseModel):
    turno_id: int
    cliente_id: int
    servicio_id: int
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime
    estado: str
    observacion: Optional[str] = None
    monto_senia: Optional[Decimal] = None
    estado_senia: Optional[str] = None
    link_pago_senia: Optional[str] = None

    class Config:
        orm_mode = True

##################################################################3

#PAGOS
###################################################################
class PagoCreate(BaseModel):
    turno_id: Optional[int] = None
    cliente_id: Optional[int] = None
    servicio_id: Optional[int] = None
    monto: Decimal
    metodo_pago: str  # efectivo, transferencia, mp, etc
    tipo_pago: str    # seña, total
    estado_pago: str  # pendiente, pagado
    descripcion: Optional[str] = None
    observacion: Optional[str] = None


class PagoResponse(BaseModel):
    pago_id: int
    turno_id: Optional[int]
    cliente_id: Optional[int]
    servicio_id: Optional[int]
    monto: Decimal
    metodo_pago: str
    tipo_pago: str
    estado_pago: str
    fecha_pago: datetime
    descripcion: Optional[str]
    observacion: Optional[str]

    class Config:
        orm_mode = True