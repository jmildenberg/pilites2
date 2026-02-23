# PiLites Installation Guide

This guide walks through installing PiLites on a Raspberry Pi for both development and production use.

## Prerequisites

### Raspberry Pi Hardware

- **Raspberry Pi Zero W** or **Raspberry Pi Zero 2 W** (or later models)
- **MicroSD Card**: 8GB minimum recommended
- **Power Supply**: Proper 5V supply for the Pi
- **Light Strands**: WS281x-compatible LEDs (or compatible alternatives)

### Operating System

- Raspberry Pi OS (Lite or Desktop) — Debian-based
- SSH access (or keyboard/monitor for setup)
- Internet connectivity for initial setup and package downloads

### Knowledge

- Basic command-line familiarity
- Understanding of GPIO pins 12, 13, 18, 19 on your Pi model

---

## Quick Start (Production)

For a standard Raspberry Pi installation with real hardware:

```bash
# 1. Clone or download PiLites
git clone https://github.com/your-repo/PiLites4.git
cd PiLites4

# 2. Run the installer (requires sudo)
sudo ./install.sh --production

# 3. Follow the prompts; service will auto-start
```

That's it! Access the UI at `http://<pi-ip>:8000`

---

## Detailed Installation Steps

### Step 1: Prepare the Raspberry Pi

1. **Flash Raspberry Pi OS** to your SD card:
   - Use [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
   - Choose "Raspberry Pi OS Lite" (minimal, recommended)
   - Configure SSH in the imager (optional hostname, enable SSH)

2. **First boot setup**:

   ```bash
   # SSH into the Pi
   ssh pi@raspberrypi.local
   # or: ssh pi@<ip-address>
   
   # Update system
   sudo apt-get update
   sudo apt-get upgrade -y
   ```

3. **File System Expansion** (if needed):

   ```bash
   sudo raspi-config
   # Navigate to: Advanced Options → Expand Filesystem
   ```

### Step 2: Wire Your Lights

Before installing PiLites, ensure your light strands are properly connected:

- **GPIO pin options for PWM output**:
  - Channel 0: GPIO 12 or GPIO 18
  - Channel 1: GPIO 13 or GPIO 19

- **Connect 5V data line** from strand to your chosen GPIO pin
- **Connect GND** from strand to Pi GND
- **Connect 5V power** directly from power supply to strand (not from Pi)
- **Consider level shifting** if using 3.3V GPIO with 5V LEDs

⚠️ **Critical**: Never power the LED strand from the Pi GPIO pins directly — use an external 5V supply.

### Step 3: Install PiLites

#### Option A: Fresh Installation

```bash
# Get the code (clone or download)
git clone https://github.com/your-repo/PiLites4.git
cd PiLites4

# Run installation with root privileges
sudo ./install.sh

# The script will prompt you to choose:
# 1 = Production (real hardware)
# 2 = Development (mock hardware for testing)
```

#### Option B: Scripted Installation (Non-Interactive)

```bash
# Production mode
sudo ./install.sh --production

# Development mode (mock hardware)
sudo ./install.sh --development
```

---

## What the Installer Does

The `install.sh` script automates:

1. **System setup**
   - Installs Python 3, venv, build tools, git
   - Creates `/opt/pilites` directory structure
   - Creates `pilites` system user (non-admin)

2. **Application deployment**
   - Copies backend and frontend code
   - Creates Python virtual environment
   - Installs pip dependencies (including `rpi_ws281x` if production)

3. **Data directories**
   - Creates `/var/lib/pilites` for data storage
   - Sets up subdirectories: plays, backups, exports, imports
   - Configures proper file permissions

4. **Systemd service**
   - Registers PiLites as a system service
   - Runs as root (required for GPIO/PWM access)
   - Auto-starts on boot
   - Handles service restart on failure

5. **Configuration**
   - Creates `/etc/pilites/pilites.env` with sensible defaults
   - Configurable FPS target, mock hardware mode, data directory

---

## Post-Installation

### Access the Web UI

Once installation completes and the service starts:

``` http
http://<your-pi-ip>:8000
```

Replace `<your-pi-ip>` with your Pi's IP address (e.g., `192.168.1.50` or `raspberrypi.local`).

### Verify Service is Running

```bash
# Check status
sudo systemctl status pilites

# View live logs
sudo journalctl -u pilites -f

# Manual service control
sudo systemctl restart pilites   # Restart
sudo systemctl stop pilites      # Stop
sudo systemctl start pilites     # Start
```

### First-Time Configuration

1. **Configure Channels**
   - In the UI, go to **Channels**
   - Add channels matching your wired GPIO pins
   - Test each with the "Test: White" button
   - If LEDs light up, your configuration is correct

2. **Test Hardware**
   - Use the test functions to verify connectivity:
     - `POST /channels/{id}/test/white` — all LEDs white
     - `POST /channels/{id}/test/off` — all LEDs off
   - Auto-clears after 30 seconds (configurable)

3. **Create Your First Play**
   - Go to **Plays** → **New Play**
   - Add **Regions** (named sections of your light setup)
   - Add **Cues** (effects for those regions)
   - **Preview** to test effects

---

## Development Installation

For local development or testing with mock hardware:

```bash
# On your development machine (not Pi)
git clone https://github.com/your-repo/PiLites4.git
cd PiLites4

# Development mode (no real hardware needed)
./install.sh --development

# Or manually:
make install
make backend-dev
# (in another terminal)
make frontend-dev
```

This runs with mock hardware (no GPIO access required), perfect for designing plays.

---

## Configuration

The main config file is at `/etc/pilites/pilites.env`. Modify values and restart the service:

```bash
sudo nano /etc/pilites/pilites.env
sudo systemctl restart pilites
```

### Key Options

| Setting | Default | Notes |
| --------- | --------- | ------- |
| `MOCK_HARDWARE` | `false` | Set to `true` for testing without Pi hardware |
| `FPS_TARGET` | `30` | Frames per second (30 = ~1000 LEDs/channel, 60 = ~500 LEDs/channel) |
| `PORT` | `8000` | API/UI port |
| `DATA_DIR` | `/var/lib/pilites` | Location for stored plays and backups |
| `HARDWARE_TEST_TIMEOUT_SEC` | `30` | Auto-off timeout for test signals |

---

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u pilites -n 50

# Verify venv exists
ls -la /opt/pilites/backend/venv

# Verify config file
cat /etc/pilites/pilites.env
```

### LEDs not responding

- Confirm GPIO pin is correct in channel configuration
- Test with `POST /channels/{id}/test/white`
- Check that Pi is powered correctly
- Verify LED strand has external 5V power (not Pi GPIO)
- Consider level shifter if using 3.3V GPIO with 5V LEDs

### Port already in use

Change `PORT` in `/etc/pilites/pilites.env` and restart service.

### Slow performance or frame drops

- Lower `FPS_TARGET` in config
- Reduce LED count, or split across multiple channels
- Check Pi CPU usage: `top` or `htop`
- Consider Zero 2 W if using Zero W

### Cannot connect to UI

- Verify service is running: `sudo systemctl status pilites`
- Check Pi IP address: `hostname -I`
- Ensure Pi on same network as client
- Try `localhost:8000` if on Pi directly
- Check firewall (unlikely on Pi OS)

---

## Uninstallation

To remove PiLites:

```bash
sudo ./install.sh --uninstall

# Optionally remove data directory
sudo rm -rf /var/lib/pilites
```

---

## Updates

To update an existing installation:

1. **Stop the service**:

   ```bash
   sudo systemctl stop pilites
   ```

2. **Update code**:

   ```bash
   cd /opt/pilites
   sudo git pull origin main  # if cloned from git
   # OR manually copy updated files
   ```

3. **Reinstall dependencies** (if requirements changed):

   ```bash
   cd /opt/pilites/backend
   sudo /opt/pilites/backend/venv/bin/pip install --quiet -r requirements.txt
   ```

4. **Restart service**:

   ```bash
   sudo systemctl restart pilites
   ```

---

## Advanced Topics

### Running on Non-Pi Hardware

With `MOCK_HARDWARE=true`, PiLites runs on any Linux system (for development/testing):

```bash
sudo ./install.sh --development
```

Hardware output is skipped; WebSocket output works normally for UI preview.

### Custom Data Directory

Edit `/etc/pilites/pilites.env`:

```bash
DATA_DIR=/path/to/custom/storage
```

Ensure the directory exists and is writable by root (systemd service runs as root).

### Reverse Proxy Setup

To expose PiLites securely on a public domain:

1. Use **nginx** or **Apache** as reverse proxy
2. Add HTTPS with Let's Encrypt
3. Proxy to `http://localhost:8000`

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name pilites.example.com;
    
    ssl_certificate /etc/letsencrypt/live/pilites.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pilites.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";  # For WebSocket
    }
}
```

### Backup & Restore

PiLites automatically creates backups in `/var/lib/pilites/backups`. To restore:

```bash
# Access UI → Settings → Restore
# Or manually:
cp /var/lib/pilites/backups/plays/play-<id>/<backup-file>.json \
   /var/lib/pilites/plays/play-<id>.json
```

---

## Next Steps

1. ✅ [Read the API Reference](docs/api.md) to understand endpoints
2. ✅ [Learn about Effects](docs/effects.md)
3. ✅ [Review WebSocket Protocol](docs/websockets.md)
4. ✅ [Backend Architecture](docs/rendering.md)

---

## Support

- Check `/opt/pilites/backend` for error logs
- Review systemd journal: `sudo journalctl -u pilites`
- Test with curl: `curl http://localhost:8000/health`

---

**Happy lighting!** 🎭✨
