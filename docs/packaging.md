# PiLites Packaging Guide

## Creating Distribution Packages

PiLites includes a `make package` target that creates lean, distribution-ready packages for deployment to Raspberry Pi.

### Quick Package Creation

```bash
make package
```

This creates `pilites-<version>.tar.gz` containing only the files needed to operate PiLites.

---

## What's Included in the Package

✅ **Backend**

- Python source code (`backend/`)
- `requirements.txt` (pip dependencies)
- All effects and routers
- Configuration for production deployment

✅ **Frontend**

- React/TypeScript UI source (if built; development sources are minimized)

✅ **Installation & Configuration**

- `install.sh` — Automated installer
- `.env.example` — Configuration template
- `Makefile` — Build and development targets

✅ **Documentation**

- Full API reference, effects catalog, WebSocket protocol
- Installation instructions
- Architecture and design docs
- JSON schemas

---

## What's Excluded from the Package

The packaging process strips all development artifacts to minimize size:

❌ **Development Artifacts**

- `backend/.venv` — Python virtual environment (rebuilt on target)
- `backend/__pycache__` — Python bytecode cache
- `backend/.pytest_cache` — Test artifacts
- `backend/.coverage` — Coverage reports

❌ **Node.js Artifacts**

- `frontend/node_modules` — npm dependencies (reinstalled)
- `frontend/.next` — Next.js build cache

❌ **Git**

- `.git/` — Version control (not needed on target)

❌ **System**

- `.DS_Store` — macOS metadata

---

## Package Size

Standard package: **~170 KB** (compressed)

When extracted on the target Pi:

- Backend: ~2–3 MB (source code, no venv)
- Frontend: varies (not included in backend-only packages)
- Docs: ~500 KB

The installer will download and compile Python dependencies, so the total disk footprint after install is around **100–200 MB** depending on dependencies.

---

## Distribution Methods

### Method 1: Direct GitHub Release (Recommended)

```bash
make package
# Upload pilites-<version>.tar.gz to GitHub Releases
```

Users can then:

```bash
wget https://github.com/your-repo/PiLites4/releases/download/v1.0.0/pilites-v1.0.0.tar.gz
tar -xzf pilites-v1.0.0.tar.gz
cd pilites
sudo ./install.sh --production
```

### Method 2: Custom Debian Package (.deb)

For advanced distribution, you can build a `.deb` file:

```bash
# (requires dpkg-dev, debhelper)
# Would need: debian/ directory with control, rules, postinst files
# Example: dpkg-buildpackage -us -uc
```

### Method 3: Docker Image

```bash
# Build a Docker image from the package
docker build -t pilites:latest .
docker run -p 8000:8000 pilites:latest
```

---

## Post-Extract Installation Steps

After extracting the package on the Raspberry Pi:

```bash
# Extract package
cd /tmp
tar -xzf pilites-v1.0.0.tar.gz
cd pilites

# Run installer (creates venv, installs deps, configures systemd)
sudo ./install.sh --production

# Verify installation
sudo systemctl status pilites

# Access UI
# Visit: http://<pi-ip>:8000
```

---

## Version Numbering

The package filename uses the latest git tag:

```bash
# If tagged as v1.0.0:
pilites-v1.0.0.tar.gz

# If no tag exists or running in dev:
pilites-dev.tar.gz
```

To create a tagged release:

```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
make package
```

---

## Customization

To modify what's included, edit the `Makefile` `package` target:

```makefile
package:
    # ... (add or remove files as needed)
    cp -r custom_dir build/pilites/
```

Common additions:

- Systemd units: `cp ./systemd/* build/pilites/`
- License files: `cp LICENSE build/pilites/`
- Changelog: `cp CHANGELOG.md build/pilites/`
- Example plays: `cp examples/ build/pilites/`

---

## CI/CD Integration

### GitHub Actions Example

```yaml
on:
  push:
    tags:
      - 'v*'

jobs:
  package:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build package
        run: make package
      - name: Upload to Release
        uses: softprops/action-gh-release@v1
        with:
          files: pilites-*.tar.gz
```

### GitLab CI Example

```yaml
package:
  stage: build
  script:
    - make package
  artifacts:
    paths:
      - pilites-*.tar.gz
    expire_in: 1 year
  only:
    - tags
```

---

## Verification Checklist

Before distributing, verify:

- [ ] `make package` completes without errors
- [ ] `tar -tzf pilites-*.tar.gz` lists all expected files
- [ ] No `.venv`, `node_modules`, or `__pycache__` in package
- [ ] `install.sh` is executable
- [ ] Package is under 200 KB (compressed)
- [ ] Extract and test `install.sh` on test Pi

---

## Troubleshooting

### Package too large

Check for leftover artifacts:

```bash
tar -tzf pilites-*.tar.gz | grep -E "venv|node_modules|__pycache__|.git" 
```

If found, update the `make package` target to exclude them.

### Missing files in package

Add them to the `make package` target:

```makefile
cp new_dir build/pilites/
```

### Package extraction fails

Verify tar file integrity:

```bash
tar -tzf pilites-*.tar.gz > /dev/null && echo "OK" || echo "CORRUPT"
```

---

## Next Steps

1. Test the package on a real Raspberry Pi
2. Document any Pi-specific setup (GPIO, power, wiring)
3. Create release notes with version info
4. Consider adding example plays or configurations to the package
