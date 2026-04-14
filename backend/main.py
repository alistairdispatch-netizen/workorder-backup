"""
Workorder System - Main Application
A FastAPI-based work order management system with JWT authentication.
"""

from dotenv import load_dotenv
load_dotenv()
import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status, HTTPException, Depends
from fastapi.responses import FileResponse
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import engine, Base
from models import (
    Member, Unit, Location, FaultCategory, RepairStatus,
    Order, OrderFaultCategory, OrderPhoto, UserRole
)
from auth import get_password_hash, get_current_active_user

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# Version info
VERSION = "1.0.0"
BUILD_DATE = "2026-04-12"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Initializes database and creates default admin user on startup.
    """
    # Startup
    logger.info("Starting Workorder System...")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created/verified")
    
    # Create default admin user if no users exist
    from database import SessionLocal
    db = SessionLocal()
    try:
        admin_exists = db.query(Member).filter(Member.role == UserRole.ADMIN).first()
        if not admin_exists:
            admin = Member(
                username="admin",
                email="admin@workorder.local",
                hashed_password=get_password_hash("admin123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            
            # Create default settings data
            default_units = [
                Unit(name="北區處"),
                Unit(name="中區處"),
                Unit(name="南區處"),
            ]
            for unit in default_units:
                db.add(unit)
            
            default_statuses = [
                RepairStatus(name="待處理"),
                RepairStatus(name="處理中"),
                RepairStatus(name="已完成"),
                RepairStatus(name="無法處理"),
            ]
            for status in default_statuses:
                db.add(status)
            
            default_categories = [
                FaultCategory(name="電力故障"),
                FaultCategory(name="水管漏水"),
                FaultCategory(name="門鎖問題"),
                FaultCategory(name="網路問題"),
            ]
            for cat in default_categories:
                db.add(cat)
            
            db.commit()
            logger.info("Default admin user created: admin / admin123")
            logger.info("Default settings data initialized")
        else:
            logger.info("Admin user already exists")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        db.rollback()
    finally:
        db.close()
    
    logger.info("Workorder System started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Workorder System...")


# Create FastAPI application
app = FastAPI(
    title="Workorder System API",
    description="A work order management system for maintenance operations",
    version=VERSION,
    lifespan=lifespan
)

# CORS Configuration
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://61.61.84.102:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Global exception handler for unhandled errors.
    """
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Returns basic status information.
    """
    return {
        "status": "healthy",
        "service": "workorder-system",
        "version": VERSION
    }


PHOTO_DIR = Path("/home/devop/workorder-system/photos")
PHOTO_DIR.mkdir(parents=True, exist_ok=True)


# Photo file server - GET /api/orders/{order_id}/photos/{photo_type}/{number}
@app.get("/api/orders/{order_id}/photos/{photo_type}/{number}")
async def get_photo(
    order_id: int,
    photo_type: str,
    number: int,
):
    """
    Get photo file (public endpoint).
    Looks up path from Photo table by order_id, photo_type, photo_number.
    """
    from database import SessionLocal
    from models import Photo
    db = SessionLocal()
    try:
        photo = db.query(Photo).filter(
            Photo.order_id == order_id,
            Photo.photo_type == photo_type,
            Photo.photo_number == number,
            Photo.is_deleted == False
        ).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        file_path = Path(photo.path)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Photo file not found")
        return FileResponse(file_path)
    finally:
        db.close()


# Photo delete endpoint for frontend compatibility
@app.delete("/api/orders/{order_id}/photos/{photo_type}/{number}")
async def delete_photo_by_type(
    order_id: int,
    photo_type: str,
    number: int,
    current_user: Member = Depends(get_current_active_user),
):
    """
    Delete photo by order_id, photo_type, photo_number.
    """
    from database import SessionLocal
    from models import Photo, Order
    db = SessionLocal()
    try:
        photo = db.query(Photo).filter(
            Photo.order_id == order_id,
            Photo.photo_type == photo_type,
            Photo.photo_number == number,
            Photo.is_deleted == False
        ).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")
        if current_user.role == UserRole.USER:
            order = db.query(Order).filter(Order.id == order_id).first()
            if order.creator_id != current_user.id:
                raise HTTPException(status_code=403, detail="Not authorized")
        if current_user.role == UserRole.GUEST:
            raise HTTPException(status_code=403, detail="Guests cannot delete photos")
        photo.is_deleted = True
        photo.deleted_at = datetime.utcnow()
        db.commit()
        return {"message": "刪除成功"}
    finally:
        db.close()


from routers import (
    pdf_export_router,
    members_router,
    orders_router,
    categories_router,
    settings_router,
    contractor_units_router
)

app.include_router(members_router)
app.include_router(orders_router)
app.include_router(categories_router)
app.include_router(settings_router)
app.include_router(contractor_units_router)
app.include_router(pdf_export_router)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint returning API information.
    """
    return {
        "name": "Workorder System API",
        "version": VERSION,
        "docs": "/docs",
        "health": "/health"
    }


# Version endpoint
@app.get("/api/version", tags=["System"])
async def get_version():
    """
    Returns version and build information.
    """
    return {
        "version": VERSION,
        "build_date": BUILD_DATE,
        "team": "OneThree Studio"
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", "8000"))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=False)
