#!/bin/bash
#
# Workorder System - Deployment Script
# For Synology NAS DSM 7.1
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DATA_PATH="./data"
PHOTO_PATH="/volume1/docker/workorder"
IMAGE_NAME="workorder-system"
FRONTEND_PORT=${FRONTEND_PORT:-38428}

# Print functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help message
show_help() {
    echo "Usage: $0 [OPTIONS] COMMAND"
    echo ""
    echo "Commands:"
    echo "  deploy      Build and start all services"
    echo "  check       Run pre-deployment checks only"
    echo "  start       Start existing containers"
    echo "  stop        Stop all containers"
    echo "  restart     Restart all containers"
    echo "  logs        Show container logs"
    echo "  clean       Remove containers and images"
    echo "  backup      Backup database and photos"
    echo "  restore     Restore from backup"
    echo ""
    echo "Options:"
    echo "  -d, --data-path      Data directory (default: ./data)"
    echo "  -p, --photo-path     Photo storage path (default: /volume1/docker/workorder)"
    echo "  -h, --help           Show this help message"
}

# Check prerequisites
check_prereq() {
    print_info "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_info "Prerequisites check passed."
}

# Pre-deployment checks
pre_deploy_check() {
    print_info "Running pre-deployment checks..."
    
    # 1. Python syntax check
    print_info "Checking Python syntax..."
    if [ -d "backend" ]; then
        for pyfile in $(find backend -name "*.py" 2>/dev/null); do
            if ! python3 -m py_compile "$pyfile" 2>/dev/null; then
                print_error "Python syntax error in: $pyfile"
                return 1
            fi
        done
        print_info "Python syntax check passed."
    fi
    
    # 2. Backend import check (Docker-based)
    print_info "Checking backend imports..."
    if [ -d "backend" ]; then
        print_info "Running Docker build to verify imports..."
        # Use docker-compose or docker-compose based on availability
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE_CMD="docker-compose"
        else
            DOCKER_COMPOSE_CMD="docker compose"
        fi
        
        # Build backend quietly, capture errors
        build_output=$(${DOCKER_COMPOSE_CMD} build backend 2>&1) || {
            if echo "$build_output" | grep -qE "(ImportError|ModuleNotFoundError|SyntaxError|ERROR)"; then
                print_error "Backend build failed. Import or syntax error detected:"
                echo "$build_output" | grep -E "(ImportError|ModuleNotFoundError|SyntaxError|ERROR)" | head -10
                return 1
            fi
        }
        print_info "Backend Docker build passed."
    fi
    
    # 3. Frontend build check
    print_info "Checking frontend build..."
    if [ -d "frontend" ]; then
        build_output=$(${DOCKER_COMPOSE_CMD} build frontend 2>&1) || {
            if echo "$build_output" | grep -qE "(ERROR|ModuleNotFoundError)"; then
                print_error "Frontend build failed:"
                echo "$build_output" | grep -E "(ERROR|ModuleNotFoundError)" | head -10
                return 1
            fi
        }
        print_info "Frontend Docker build passed."
    fi
    
    print_info "All pre-deployment checks passed!"
}

# Create necessary directories
create_dirs() {
    print_info "Creating directories..."
    mkdir -p "$DATA_PATH"
    mkdir -p "$PHOTO_PATH/photos"
    print_info "Directories created."
}

# Generate JWT secret
generate_jwt_secret() {
    if [ ! -f .env ]; then
        print_info "Generating JWT secret..."
        JWT_SECRET=$(openssl rand -base64 32)
        cat > .env << EOF
# JWT Secret - CHANGE THIS IN PRODUCTION!
JWT_SECRET_KEY=$JWT_SECRET

# Database
DATABASE_URL=sqlite:///./workorder.db

# Member limit
MAX_MEMBERS=5

# API Base URL
API_BASE_URL=http://localhost:8000

# Photo storage path
PHOTO_PATH=$PHOTO_PATH

# Data path
DATA_PATH=$DATA_PATH

# Allowed origins
ALLOWED_ORIGINS=http://localhost:$FRONTEND_PORT
EOF
        print_info ".env file created with generated JWT secret."
    else
        print_warn ".env file already exists. Skipping JWT secret generation."
    fi
}

# Deploy
deploy() {
    check_prereq
    pre_deploy_check
    create_dirs
    generate_jwt_secret
    
    # Use docker-compose or docker compose based on availability
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    
    print_info "Building Docker images..."
    ${DOCKER_COMPOSE_CMD} build --no-cache
    
    print_info "Starting services..."
    ${DOCKER_COMPOSE_CMD} up -d
    
    print_info "Checking service health..."
    sleep 5
    
    if curl -sf http://localhost:${FRONTEND_PORT}/health > /dev/null 2>&1; then
        print_info "Frontend is healthy."
    else
        print_warn "Frontend health check failed (nginx container may not have /health endpoint)."
    fi
    
    print_info "Deployment complete!"
    print_info "Access the application at: http://localhost:${FRONTEND_PORT}"
    print_info "API documentation at: http://localhost:${FRONTEND_PORT}/api/docs"
}

# Start
start() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    print_info "Starting services..."
    ${DOCKER_COMPOSE_CMD} start
    print_info "Services started."
}

# Stop
stop() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    print_info "Stopping services..."
    ${DOCKER_COMPOSE_CMD} stop
    print_info "Services stopped."
}

# Restart
restart() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    print_info "Restarting services..."
    ${DOCKER_COMPOSE_CMD} restart
    print_info "Services restarted."
}

# Logs
show_logs() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    ${DOCKER_COMPOSE_CMD} logs -f
}

# Clean
clean() {
    print_warn "This will remove all containers and images. Data will be lost."
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        if command -v docker-compose &> /dev/null; then
            DOCKER_COMPOSE_CMD="docker-compose"
        else
            DOCKER_COMPOSE_CMD="docker compose"
        fi
        print_info "Removing containers..."
        ${DOCKER_COMPOSE_CMD} down -v --rmi local
        print_info "Clean complete."
    else
        print_info "Clean cancelled."
    fi
}

# Backup
backup() {
    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    print_info "Creating backup in $BACKUP_DIR..."
    
    # Backup database
    if [ -f "$DATA_PATH/workorder.db" ]; then
        cp "$DATA_PATH/workorder.db" "$BACKUP_DIR/workorder.db"
        print_info "Database backed up."
    fi
    
    # Backup photos
    if [ -d "$PHOTO_PATH/photos" ]; then
        tar -czf "$BACKUP_DIR/photos.tar.gz" -C "$PHOTO_PATH" photos
        print_info "Photos backed up."
    fi
    
    print_info "Backup complete: $BACKUP_DIR"
}

# Restore
restore() {
    print_info "Available backups:"
    ls -la ./backups/ 2>/dev/null || print_info "No backups found."
    
    read -p "Enter backup directory name: " backup_name
    BACKUP_DIR="./backups/$backup_name"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "Backup not found: $BACKUP_DIR"
        exit 1
    fi
    
    print_info "Restoring from $BACKUP_DIR..."
    
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    else
        DOCKER_COMPOSE_CMD="docker compose"
    fi
    
    # Stop services first
    ${DOCKER_COMPOSE_CMD} stop
    
    # Restore database
    if [ -f "$BACKUP_DIR/workorder.db" ]; then
        cp "$BACKUP_DIR/workorder.db" "$DATA_PATH/workorder.db"
        print_info "Database restored."
    fi
    
    # Restore photos
    if [ -f "$BACKUP_DIR/photos.tar.gz" ]; then
        tar -xzf "$BACKUP_DIR/photos.tar.gz" -C "$PHOTO_PATH"
        print_info "Photos restored."
    fi
    
    # Restart services
    ${DOCKER_COMPOSE_CMD} start
    
    print_info "Restore complete."
}

# Parse arguments
case "${1:-}" in
    deploy)
        deploy
        ;;
    check)
        check_prereq
        pre_deploy_check
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean
        ;;
    backup)
        backup
        ;;
    restore)
        restore
        ;;
    -h|--help)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac