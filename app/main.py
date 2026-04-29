from fastapi import FastAPI
from app.database import Base, engine
from app import models
from app.routers import clientes, servicios, turnos, pagos, deudas

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.include_router(clientes.router)
app.include_router(servicios.router)
app.include_router(turnos.router)
app.include_router(pagos.router)
app.include_router(deudas.router)


@app.get("/")
def root():
    return {"mensaje": "API funcionando 🚀"}