# Phase 1 Quick Start Guide

**Goal:** Modernize micboard build system and dependencies
**Time:** 12-15 hours over 1-2 weeks
**Approach:** Incremental updates with testing between each step

---

## Before You Start

```bash
# 1. Create backup
git branch backup-pre-phase1

# 2. Create feature branch
git checkout -b phase1/modernization

# 3. Verify clean state
git status

# 4. Note current versions
node --version
npm --version
python --version
```

---

## Step-by-Step Execution

### ✅ Step 1: Dependency Foundation (30 min)

```bash
# Generate package-lock.json
rm -rf node_modules/
npm install
git add package-lock.json
git commit -m "Add package-lock.json for dependency version locking"

# Pin Python version
echo "3.11" > .python-version
echo "tornado>=6.4,<7.0" > py/requirements.txt

# Create dev requirements
cat > py/requirements-dev.txt << EOF
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
black>=24.0.0
mypy>=1.8.0
ruff>=0.1.0
EOF

# Pin Node.js version
echo "20" > .nvmrc

git add .python-version py/requirements.txt py/requirements-dev.txt .nvmrc
git commit -m "Pin Python to 3.11 and Node.js to v20 LTS"
```

**Test:** `npm install` should succeed without errors

---

### ✅ Step 2: Replace node-sass (1 hour)

```bash
# Uninstall node-sass
npm uninstall node-sass

# Install dart-sass
npm install --save-exact sass@1.70.0 sass-loader@14.1.0

# Update webpack.config.js (see PHASE1_IMPLEMENTATION.md section 2.3)

# Test build
npm run build

# Test visually
npm run server
# Open: http://localhost:8058/#demo=true

git add package.json package-lock.json webpack.config.js
git commit -m "Replace node-sass with dart-sass"
```

**Test:** Build succeeds, styles look correct

---

### ✅ Step 3: Webpack 5 (2-3 hours)

```bash
# Update webpack packages
npm install --save-exact webpack@5.90.3 webpack-cli@5.1.4
npm install --save-exact babel-loader@9.1.3
npm install --save-exact css-loader@6.10.0
npm install --save-exact style-loader@3.3.4
npm uninstall file-loader

# Replace webpack.config.js (see PHASE1_IMPLEMENTATION.md section 3.4)

# Clean and rebuild
rm -rf static/*.js static/*.map static/fonts/
npm run build

# Test all pages
npm run server
# Test: main, about, settings (press 's'), drag-drop

git add webpack.config.js package.json package-lock.json
git commit -m "Migrate from Webpack 4 to Webpack 5"
```

**Test:** All pages work, no console errors

---

### ✅ Step 4: Update Babel (30 min)

```bash
# Update Babel packages
npm install --save-exact @babel/core@7.25.2
npm install --save-exact @babel/preset-env@7.25.4
npm install --save-exact @babel/preset-react@7.24.7

# Create babel.config.json (see PHASE1_IMPLEMENTATION.md section 4.2)

# Install core-js
npm install --save-exact core-js@3.36.0

# Test
npm run build
npm run server

git add package.json package-lock.json babel.config.json webpack.config.js
git commit -m "Update Babel to v7.25+"
```

**Test:** Build succeeds

---

### ✅ Step 5: Update Node.js Runtime (1 hour)

```bash
# Update Dockerfile (see PHASE1_IMPLEMENTATION.md section 5.1)

# Test Docker build
docker build -t micboard:phase1 .
docker run -p 8058:8058 micboard:phase1

# Test in browser
curl http://localhost:8058

git add Dockerfile
git commit -m "Update Node.js runtime to v20 LTS"
```

**Test:** Docker builds and runs

---

### ✅ Step 6: Electron 32 (3-4 hours) ⚠️ MOST COMPLEX

```bash
# Update Electron
npm install --save-dev electron@32.2.0
npm install --save-dev electron-builder@25.0.5

# Update main.js (see PHASE1_IMPLEMENTATION.md section 6.4)
# Create preload.js if needed (see section 6.5)

# Test Electron app
npm run app

# Test packaging
npm run dist
ls -lh dist/

git add main.js preload.js package.json package-lock.json
git commit -m "Migrate Electron from v5 to v32"
```

**Test:** App launches, menu bar works, Python subprocess starts

**⚠️ Note:** This is the hardest step. May need multiple iterations.

---

### ✅ Step 7: Python Modernization (2 hours)

```bash
# Install dev dependencies
pip install -r py/requirements-dev.txt

# Create pyproject.toml (see PHASE1_IMPLEMENTATION.md section 7.6)
# Create mypy.ini (see section 7.4)

# Format code
black py/

# Create tests directory
mkdir -p tests
# Create test_config.py (see section 7.7)

# Run tests
pytest tests/ -v

# Type check
mypy py/micboard.py

git add py/ tests/ pyproject.toml mypy.ini
git commit -m "Modernize Python: type hints, black, tests"
```

**Test:** Tests pass, code formatted

---

### ✅ Step 8: Final Testing (2 hours)

```bash
# Clean build from scratch
rm -rf node_modules/ static/*.js static/*.map
npm install
npm run build

# Test Python server
python py/micboard.py

# Test demo mode
# Open: http://localhost:8058/#demo=true
# Press 's' for settings
# Press 'b' for background mode
# Test drag-and-drop

# Test Electron
npm run app

# Test Docker
docker build -t micboard:test .
docker run -p 8058:8058 micboard:test

# Create test documentation
# (see PHASE1_IMPLEMENTATION.md section 8.6)

git add TESTING.md
git commit -m "Add comprehensive testing documentation"
```

**Test:** Everything works end-to-end

---

## Quick Test Commands

```bash
# After each change, run these:

# Build test
npm run build

# Server test
npm run server
# Visit: http://localhost:8058/#demo=true

# Electron test
npm run app

# Python tests
pytest tests/ -v

# Python linting
black --check py/
mypy py/
ruff check py/
```

---

## Troubleshooting

### Build fails with node-sass error
- Make sure you completed Step 2 (replace with dart-sass)

### Webpack build errors
- Delete `node_modules/` and `package-lock.json`
- Run `npm install` again
- Check you're on Node.js v20: `node --version`

### Electron app won't start
- Check console for errors
- Verify Python subprocess starts: `ps aux | grep micboard`
- Check port 8058 isn't in use: `lsof -i :8058`

### Docker build fails
- Make sure you committed updated Dockerfile
- Check Node.js version in Dockerfile is 20
- Clear Docker cache: `docker system prune -a`

### Tests fail
- Make sure Python dependencies installed: `pip install -r py/requirements-dev.txt`
- Check Python version: `python --version` (should be 3.11+)

---

## Rollback

If something goes wrong:

```bash
# Return to main
git checkout main

# Or reset your branch
git reset --hard backup-pre-phase1
```

---

## Completion Checklist

- [ ] All 8 steps completed
- [ ] All tests pass
- [ ] Demo mode works in browser
- [ ] Electron app launches
- [ ] Docker builds successfully
- [ ] No console errors
- [ ] All commits have clear messages
- [ ] TESTING.md created

---

## After Phase 1

```bash
# Merge to main
git checkout main
git merge phase1/modernization

# Tag release
git tag v0.9.0-phase1
git push origin main --tags

# Monitor for 1-2 weeks before Phase 2
```

---

## Need Help?

- Full details: See `PHASE1_IMPLEMENTATION.md`
- Webpack 5 migration: https://webpack.js.org/migrate/5/
- Electron changes: https://www.electronjs.org/docs/latest/breaking-changes
- Sass migration: https://sass-lang.com/documentation/breaking-changes/

---

**Estimated Total Time:** 12-15 hours

**Risk Level:** MEDIUM (Electron update is highest risk)

**Reward:** Modern, secure, maintainable codebase ready for future enhancements
