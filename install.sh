#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
# PiLites Installer
# 
# Usage:
#   ./install.sh                    # Interactive installation
#   ./install.sh --production       # Production install (real hardware)
#   ./install.sh --development      # Development install (mock hardware)
#   ./install.sh --uninstall        # Remove PiLites
# ─────────────────────────────────────────────────────────────────────────────

set -o pipefail

# Configuration
PILITES_HOME="/opt/pilites"
PILITES_DATA="/var/lib/pilites"
PILITES_USER="pilites"
PILITES_GROUP="pilites"
PILITES_PORT="${PILITES_PORT:=8000}"
PILITES_FPS="${PILITES_FPS:=30}"
MOCK_HARDWARE="${MOCK_HARDWARE:=false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use 'sudo ./install.sh')"
        exit 1
    fi
}

check_platform() {
    if ! command -v apt-get &> /dev/null; then
        log_error "This installer requires a Debian-based system (apt package manager)"
        exit 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# System Prerequisites
# ─────────────────────────────────────────────────────────────────────────────

install_system_deps() {
    log_info "Installing system dependencies..."
    
    apt-get update -qq
    apt-get install -y -qq \
        python3 \
        python3-venv \
        python3-dev \
        build-essential \
        git \
        curl \
        wget

    log_success "System dependencies installed"
}

# ─────────────────────────────────────────────────────────────────────────────
# User & Directory Setup
# ─────────────────────────────────────────────────────────────────────────────

create_user() {
    log_info "Setting up pilites user and directories..."
    
    # Create user if it doesn't exist
    if ! id "$PILITES_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$PILITES_HOME" "$PILITES_USER"
        log_success "Created user: $PILITES_USER"
    else
        log_warn "User $PILITES_USER already exists"
    fi
}

create_directories() {
    log_info "Creating PiLites directories..."
    
    # Install directory
    mkdir -p "$PILITES_HOME"
    chown "$PILITES_USER:$PILITES_GROUP" "$PILITES_HOME"
    chmod 755 "$PILITES_HOME"
    
    # Data directory (stores plays, channels, backups, exports, imports)
    mkdir -p "$PILITES_DATA"
    create_subdirs() {
        mkdir -p "$PILITES_DATA/$1"
        chown "$PILITES_USER:$PILITES_GROUP" "$PILITES_DATA/$1"
        chmod 755 "$PILITES_DATA/$1"
    }
    
    create_subdirs "plays"
    create_subdirs "backups/plays"
    create_subdirs "exports/plays"
    create_subdirs "imports/plays"
    
    log_success "Directories created and configured"
}

# ─────────────────────────────────────────────────────────────────────────────
# Code Installation
# ─────────────────────────────────────────────────────────────────────────────

install_code() {
    log_info "Installing PiLites code..."
    
    # Detect if we're running from the source directory or installing fresh
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    if [ -d "$SCRIPT_DIR/backend" ] && [ -d "$SCRIPT_DIR/frontend" ]; then
        log_info "Found PiLites source in $SCRIPT_DIR"
        cp -r "$SCRIPT_DIR/backend" "$PILITES_HOME/"
        cp -r "$SCRIPT_DIR/frontend" "$PILITES_HOME/" 2>/dev/null || true
        touch "$PILITES_HOME/backend/.installed"
    else
        log_error "Could not find PiLites source (expected backend/ and frontend/ directories)"
        log_error "Run this script from the PiLites root directory"
        exit 1
    fi
    
    chown -R "$PILITES_USER:$PILITES_GROUP" "$PILITES_HOME"
    log_success "Code installed to $PILITES_HOME"
}

# ─────────────────────────────────────────────────────────────────────────────
# Python Environment
# ─────────────────────────────────────────────────────────────────────────────

setup_venv() {
    log_info "Setting up Python virtual environment..."
    
    cd "$PILITES_HOME/backend"
    
    # Create venv as the pilites user
    sudo -u "$PILITES_USER" python3 -m venv venv
    
    # Activate and upgrade pip
    VENV_PIP="$PILITES_HOME/backend/venv/bin/pip"
    sudo -u "$PILITES_USER" "$VENV_PIP" install --quiet --upgrade pip
    
    # Install dependencies
    sudo -u "$PILITES_USER" "$VENV_PIP" install --quiet -r requirements.txt
    
    # Install rpi_ws281x for real hardware (optional, will warn if not available in dev)
    if [ "$MOCK_HARDWARE" = "false" ]; then
        log_info "Installing rpi_ws281x for real hardware..."
        sudo -u "$PILITES_USER" "$VENV_PIP" install --quiet rpi_ws281x || \
            log_warn "rpi_ws281x installation failed (expected on non-Pi hardware)"
    fi
    
    log_success "Python environment ready"
}

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

setup_config() {
    log_info "Setting up configuration..."
    
    PILITES_ENV="/etc/pilites/pilites.env"
    mkdir -p /etc/pilites
    
    if [ ! -f "$PILITES_ENV" ]; then
        cat > "$PILITES_ENV" << EOF
# PiLites Configuration
# Generated on $(date)

# Hardware
MOCK_HARDWARE=$MOCK_HARDWARE
HARDWARE_TEST_TIMEOUT_SEC=30

# Rendering
FPS_TARGET=$PILITES_FPS

# API Server
HOST=0.0.0.0
PORT=$PILITES_PORT

# Data Storage
DATA_DIR=$PILITES_DATA

# Logging (optional)
# LOG_LEVEL=INFO
EOF
        chmod 644 "$PILITES_ENV"
        log_success "Configuration file created: $PILITES_ENV"
    else
        log_warn "Configuration file already exists: $PILITES_ENV"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Systemd Service
# ─────────────────────────────────────────────────────────────────────────────

install_systemd_service() {
    log_info "Installing systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/pilites.service"
    
    cat > "$SERVICE_FILE" << 'EOF'
[Unit]
Description=PiLites Theatre Lighting Control
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/pilites/backend
EnvironmentFile=/etc/pilites/pilites.env
ExecStart=/opt/pilites/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pilites

# Security hardening (optional, adjust as needed)
# NoNewPrivileges=true
# PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
    
    chmod 644 "$SERVICE_FILE"
    systemctl daemon-reload
    
    log_success "Systemd service installed: $SERVICE_FILE"
}

# ─────────────────────────────────────────────────────────────────────────────
# GPIO Permissions (for real hardware)
# ─────────────────────────────────────────────────────────────────────────────

setup_gpio_permissions() {
    if [ "$MOCK_HARDWARE" = "false" ]; then
        log_info "Setting up GPIO permissions for real hardware..."
        
        # Add gpio group if it doesn't exist
        if ! getent group gpio > /dev/null; then
            groupadd -f gpio
        fi
        
        # Note: On actual Raspberry Pi with rpi_ws281x, root access is required
        # For DMA access. The service already runs as root.
        log_success "GPIO permissions configured (service runs as root for DMA access)"
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Verification
# ─────────────────────────────────────────────────────────────────────────────

verify_installation() {
    log_info "Verifying installation..."
    
    local errors=0
    
    # Check directories
    if [ -d "$PILITES_HOME/backend" ]; then
        log_success "Backend directory exists"
    else
        log_error "Backend directory not found"
        ((errors++))
    fi
    
    if [ -d "$PILITES_DATA" ]; then
        log_success "Data directory exists"
    else
        log_error "Data directory not found"
        ((errors++))
    fi
    
    # Check venv
    if [ -x "$PILITES_HOME/backend/venv/bin/python" ]; then
        log_success "Python venv is ready"
    else
        log_error "Python venv not found or not executable"
        ((errors++))
    fi
    
    # Check config
    if [ -f /etc/pilites/pilites.env ]; then
        log_success "Configuration file exists"
    else
        log_error "Configuration file not found"
        ((errors++))
    fi
    
    # Check systemd
    if [ -f /etc/systemd/system/pilites.service ]; then
        log_success "Systemd service is installed"
    else
        log_error "Systemd service not found"
        ((errors++))
    fi
    
    return $errors
}

# ─────────────────────────────────────────────────────────────────────────────
# Start Service
# ─────────────────────────────────────────────────────────────────────────────

start_service() {
    log_info "Starting PiLites service..."
    
    systemctl enable pilites.service
    systemctl restart pilites.service
    
    # Give it a moment to start
    sleep 2
    
    if systemctl is-active --quiet pilites; then
        log_success "PiLites service started successfully"
        
        # Show status
        systemctl status pilites --no-pager | head -n 5
    else
        log_error "Failed to start PiLites service"
        log_error "Check logs with: journalctl -u pilites -n 50"
        return 1
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Uninstall
# ─────────────────────────────────────────────────────────────────────────────

uninstall() {
    log_warn "Removing PiLites..."
    
    systemctl stop pilites.service || true
    systemctl disable pilites.service || true
    
    rm -f /etc/systemd/system/pilites.service
    systemctl daemon-reload
    
    rm -rf "$PILITES_HOME"
    rm -rf /etc/pilites
    
    # Keep data directory by default
    log_warn "Data directory preserved at $PILITES_DATA"
    
    # Optionally remove user
    read -p "Remove pilites user? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        userdel "$PILITES_USER" || true
    fi
    
    log_success "PiLites uninstalled"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         PiLites Installation Script                       ║"
    echo "║       Theatre Lighting Control for Raspberry Pi           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Parse arguments
    MODE="interactive"
    if [ $# -gt 0 ]; then
        case "$1" in
            --production)
                MODE="production"
                MOCK_HARDWARE="false"
                ;;
            --development)
                MODE="development"
                MOCK_HARDWARE="true"
                ;;
            --uninstall)
                check_root
                uninstall
                exit 0
                ;;
            *)
                echo "Usage: $0 [--production|--development|--uninstall]"
                exit 1
                ;;
        esac
    fi
    
    # Interactive mode
    if [ "$MODE" = "interactive" ]; then
        echo "Select installation mode:"
        echo "  1) Production (real hardware with rpi_ws281x)"
        echo "  2) Development (mock hardware for testing)"
        echo ""
        read -p "Enter choice (1 or 2): " choice
        
        case $choice in
            1) 
                MODE="production"
                MOCK_HARDWARE="false"
                ;;
            2) 
                MODE="development"
                MOCK_HARDWARE="true"
                ;;
            *)
                log_error "Invalid choice"
                exit 1
                ;;
        esac
    fi
    
    log_info "Installation mode: $MODE"
    log_info "Mock hardware: $MOCK_HARDWARE"
    echo ""
    
    # Run installation
    check_root
    check_platform
    install_system_deps
    create_user
    create_directories
    install_code
    setup_venv
    setup_config
    install_systemd_service
    setup_gpio_permissions
    
    echo ""
    verify_installation
    VERIFY_EXIT=$?
    
    if [ $VERIFY_EXIT -eq 0 ]; then
        echo ""
        log_success "All checks passed!"
        echo ""
        read -p "Start PiLites service now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_service
            echo ""
            log_success "Installation complete!"
            echo ""
            echo "Next steps:"
            echo "  • Open http://$(hostname -I | awk '{print $1}'):8000 in your browser"
            echo "  • Configure your hardware channels"
            echo "  • Create and test your first play"
            echo ""
            echo "Useful commands:"
            echo "  systemctl status pilites              # Check service status"
            echo "  journalctl -u pilites -f              # View live logs"
            echo "  systemctl restart pilites             # Restart service"
            echo "  systemctl stop pilites                # Stop service"
            echo ""
        fi
    else
        log_error "Installation verification failed!"
        log_error "Check the output above for details"
        exit 1
    fi
}

main "$@"
