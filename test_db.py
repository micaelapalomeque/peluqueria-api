from sqlalchemy import text
from app.database import engine

with engine.connect() as conn:
    result = conn.execute(text("SELECT current_database();"))
    print("Base conectada:", result.scalar())