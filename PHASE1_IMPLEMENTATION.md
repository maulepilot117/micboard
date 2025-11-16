# Phase 1: Critical Updates - Detailed Implementation Plan

**Timeline:** 1-2 weeks
**Goal:** Fix security issues, modernize build system, enable development on modern systems
**Approach:** Incremental updates with testing between each step

---

## Pre-Flight Checklist

Before starting, ensure you have:

- [ ] Full backup of the project
- [ ] Clean git working directory (`git status` shows no uncommitted changes)
- [ ] Created a feature branch: `git checkout -b phase1/modernization`
- [ ] Access to Shure devices for testing (or ability to use demo mode)
- [ ] Note current Node.js version: `node --version`
- [ ] Note current npm version: `npm --version`

---

## Task 1: Dependency Management Foundation

**Duration:** 30 minutes
**Risk:** LOW
**Goal:** Establish proper dependency tracking and version control

### 1.1 Generate and Commit package-lock.json

```bash
# Remove existing node_modules to start fresh
rm -rf node_modules/

# Install dependencies (this generates package-lock.json)
npm install

# Verify the lock file was created
ls -lh package-lock.json

# Stage and commit
git add package-lock.json
git commit -m "Add package-lock.json for dependency version locking"
```

**Why:** Ensures consistent installations across environments, prevents unexpected version changes.

### 1.2 Pin Python Version

**Create `.python-version` file:**
```bash
echo "3.11" > .python-version
git add .python-version
```

**Update `requirements.txt`:**
```txt
tornado>=6.4,<7.0
```

**Create `requirements-dev.txt`:**
```txt
# Development dependencies
pytest>=8.0.0
pytest-asyncio>=0.23.0
pytest-cov>=4.1.0
pytest-tornado>=0.8.1
black>=24.0.0
mypy>=1.8.0
ruff>=0.1.0
```

```bash
git add py/requirements.txt py/requirements-dev.txt
git commit -m "Pin Python version to 3.11 and add versioned dependencies"
```

### 1.3 Create .nvmrc for Node.js Version

```bash
echo "20" > .nvmrc
git add .nvmrc
git commit -m "Add .nvmrc to specify Node.js v20 LTS"
```

**Verification:**
```bash
# If using nvm:
nvm use
node --version  # Should show v20.x.x
```

---

## Task 2: Replace node-sass with dart-sass

**Duration:** 1 hour
**Risk:** MEDIUM (SCSS compilation differences)
**Goal:** Fix build failures on modern systems (node-sass is deprecated)

### 2.1 Remove node-sass

```bash
npm uninstall node-sass
```

### 2.2 Install sass (dart-sass)

```bash
npm install --save-exact sass@1.70.0
npm install --save-exact sass-loader@14.1.0
```

### 2.3 Update webpack.config.js

**Before (lines 36-48):**
```javascript
{
  test: /\.scss$/,
  use: [{
    loader: 'style-loader',
  }, {
    loader: 'css-loader',
    options: {
      sourceMap: true,
    },
  }, {
    loader: 'sass-loader',
    options: {
      sourceMap: true,
    },
  }],
}
```

**After:**
```javascript
{
  test: /\.scss$/,
  use: [{
    loader: 'style-loader',
  }, {
    loader: 'css-loader',
    options: {
      sourceMap: true,
    },
  }, {
    loader: 'sass-loader',
    options: {
      sourceMap: true,
      sassOptions: {
        // dart-sass specific options
        outputStyle: 'expanded',
      },
    },
  }],
}
```

### 2.4 Check for SCSS Division Operator Issues

Dart-sass deprecated the `/` division operator. Search for potential issues:

```bash
# Search for division in SCSS files
grep -r "/" css/*.scss
```

If you find math division like `$width / 2`, update to:
```scss
// Old syntax (deprecated)
$half-width: $width / 2;

// New syntax (dart-sass)
@use "sass:math";
$half-width: math.div($width, 2);
```

### 2.5 Test SCSS Compilation

```bash
# Clean previous build
rm -rf static/*.js static/*.map static/fonts/

# Run webpack build
npm run build

# Check for errors in output
# Verify files were created:
ls -lh static/
```

**Expected output:**
- `static/app.js`
- `static/about.js`
- `static/venue.js`
- `static/web.js`
- `static/fonts/` directory with fonts

### 2.6 Visual Verification

```bash
# Start the server
npm run server
```

Open browser to `http://localhost:8058/#demo=true` and verify:
- [ ] Styles load correctly
- [ ] Colors match original
- [ ] Fonts render properly (IBM Plex)
- [ ] Layout is intact
- [ ] Charts display correctly

### 2.7 Commit Changes

```bash
git add package.json package-lock.json webpack.config.js css/
git commit -m "Replace node-sass with dart-sass for modern Node.js compatibility"
```

---

## Task 3: Migrate Webpack 4 to Webpack 5

**Duration:** 2-3 hours
**Risk:** MEDIUM-HIGH
**Goal:** Update to latest webpack with modern features

### 3.1 Update Webpack Core Packages

```bash
npm install --save-exact webpack@5.90.3 webpack-cli@5.1.4
```

### 3.2 Update Webpack Loaders

```bash
# Update loaders to webpack 5 compatible versions
npm install --save-exact babel-loader@9.1.3
npm install --save-exact css-loader@6.10.0
npm install --save-exact style-loader@3.3.4
npm install --save-exact sass-loader@14.1.0
```

### 3.3 Remove file-loader (replaced by Asset Modules)

```bash
npm uninstall file-loader
```

### 3.4 Update webpack.config.js for Webpack 5

**Replace the entire file with:**

```javascript
const path = require('path');
const webpack = require('webpack');

module.exports = {
  devtool: 'source-map',
  mode: 'development',
  entry: {
    app: ['whatwg-fetch', './js/app.js'],
    about: ['./js/about.js'],
    venue: ['./js/venues.js'],
    web: ['./js/web.js'],
  },
  output: {
    path: path.resolve(__dirname, 'static'),
    filename: '[name].js',
    clean: false, // Don't auto-clean static folder (has other files)
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
    new webpack.DefinePlugin({
      VERSION: JSON.stringify(require('./package.json').version),
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
              sassOptions: {
                outputStyle: 'expanded',
              },
            },
          },
        ],
      },
      // Asset Modules replace file-loader
      {
        test: /\.(woff(2)?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]',
        },
      },
      {
        test: /.jsx?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react'],
        },
      },
    ],
  },
  // Webpack 5 specific optimizations
  optimization: {
    moduleIds: 'deterministic',
  },
  // Performance hints
  performance: {
    hints: false, // Disable for now, can enable later
  },
};
```

**Key changes:**
1. Removed `query` property (deprecated) → moved to `options`
2. Replaced `file-loader` with Asset Modules (`type: 'asset/resource'`)
3. Updated `generator.filename` for font output
4. Added `optimization.moduleIds` for better caching
5. Added `performance` section

### 3.5 Test Webpack 5 Build

```bash
# Clean build
rm -rf static/*.js static/*.map static/fonts/

# Build with webpack 5
npm run build

# Check for deprecation warnings
# Verify output files
ls -lh static/
```

**Troubleshooting common issues:**

**Issue 1: "Can't resolve 'crypto'" or other Node.js core modules**
```javascript
// Add to webpack.config.js
resolve: {
  fallback: {
    "crypto": false,
    "stream": false,
    "buffer": false,
  },
},
```

**Issue 2: "Module not found: Error: Can't resolve 'process/browser'"**
```bash
npm install --save-exact process
```

Then add to plugins:
```javascript
new webpack.ProvidePlugin({
  process: 'process/browser',
}),
```

### 3.6 Functional Testing

```bash
npm run server
```

Test all pages:
- [ ] Main app: `http://localhost:8058/#demo=true`
- [ ] About page: `http://localhost:8058/about`
- [ ] Settings dialog (press 's' key)
- [ ] Charts rendering
- [ ] Drag and drop functionality
- [ ] Background image support

### 3.7 Commit

```bash
git add webpack.config.js package.json package-lock.json
git commit -m "Migrate from Webpack 4 to Webpack 5 with Asset Modules"
```

---

## Task 4: Update Babel 7.6 to 7.25+

**Duration:** 30 minutes
**Risk:** LOW
**Goal:** Latest JavaScript transpilation features

### 4.1 Update Babel Packages

```bash
npm install --save-exact @babel/core@7.25.2
npm install --save-exact @babel/preset-env@7.25.4
npm install --save-exact @babel/preset-react@7.24.7
```

### 4.2 Create babel.config.json (Optional but Recommended)

Create `babel.config.json`:
```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "browsers": [
            "last 2 Chrome versions",
            "last 2 Firefox versions",
            "last 2 Safari versions",
            "last 2 Edge versions"
          ]
        },
        "useBuiltIns": "usage",
        "corejs": 3
      }
    ],
    "@babel/preset-react"
  ]
}
```

If using separate config file, simplify webpack.config.js:
```javascript
{
  test: /.jsx?$/,
  loader: 'babel-loader',
  exclude: /node_modules/,
  // Babel will use babel.config.json automatically
},
```

### 4.3 Install core-js (if using babel.config.json)

```bash
npm install --save-exact core-js@3.36.0
```

### 4.4 Test

```bash
npm run build
npm run server
```

### 4.5 Commit

```bash
git add package.json package-lock.json babel.config.json webpack.config.js
git commit -m "Update Babel to v7.25+ with modern browser targets"
```

---

## Task 5: Update Node.js Runtime to v20 LTS

**Duration:** 1 hour
**Risk:** LOW (mostly Docker/documentation updates)
**Goal:** Use supported Node.js version

### 5.1 Update Dockerfile

**Before (line 7):**
```dockerfile
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
```

**After:**
```dockerfile
RUN curl -sL https://deb.nodesource.com/setup_20.x | bash -
```

**Or better, use official multi-stage build:**

```dockerfile
FROM node:20-slim AS frontend

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY js ./js
COPY css ./css
COPY webpack.config.js babel.config.json ./

RUN npm run build

# Python runtime stage
FROM python:3.11-slim

MAINTAINER Karl Swanson <karlcswanson@gmail.com>

WORKDIR /usr/src/app

# Copy Python requirements
COPY py/requirements.txt ./py/
RUN pip3 install --no-cache-dir -r py/requirements.txt

# Copy application
COPY py ./py
COPY static ./static
COPY demo.html index.html about.html ./
COPY democonfig.json ./

# Copy built assets from frontend stage
COPY --from=frontend /usr/src/app/static ./static

EXPOSE 8058

CMD ["python3", "py/micboard.py"]
```

### 5.2 Update Documentation

Update any README or installation docs that mention Node.js version:

```bash
# Search for Node.js version mentions
grep -r "node" docs/ README.md
```

### 5.3 Test Docker Build

```bash
# Build Docker image
docker build -t micboard:phase1 .

# Run container
docker run -p 8058:8058 micboard:phase1

# Test in browser
curl http://localhost:8058
```

### 5.4 Update GitHub Actions (if exists)

Check for `.github/workflows/` directory:
```bash
ls -la .github/workflows/
```

If exists, update Node.js version to 20.

### 5.5 Commit

```bash
git add Dockerfile docs/
git commit -m "Update Node.js runtime to v20 LTS for security and support"
```

---

## Task 6: Migrate Electron 5 to Electron 32

**Duration:** 3-4 hours
**Risk:** HIGH (major breaking changes)
**Goal:** Support modern macOS versions, fix security issues

### 6.1 Understand Breaking Changes

Major changes from Electron 5 to 32:
- `contextIsolation` enabled by default
- `nodeIntegration` disabled by default
- `remote` module removed
- `webPreferences` changes
- `app.allowRendererProcessReuse` removed
- Menu API changes

### 6.2 Update Electron Packages

```bash
npm install --save-dev electron@32.2.0
npm install --save-dev electron-builder@25.0.5
```

### 6.3 Review Current main.js

Read the current implementation:

```bash
cat main.js
```

### 6.4 Update main.js for Electron 32

**Key changes needed:**

1. **Enable context isolation safety:**
```javascript
const mainWindow = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: false,        // Disabled for security
    contextIsolation: true,        // Enabled for security
    preload: path.join(__dirname, 'preload.js'), // If needed
  },
});
```

2. **Replace `remote` module usage:**
If the app uses `remote`, create IPC handlers instead.

3. **Update app.on('ready') → app.whenReady():**
```javascript
// Old
app.on('ready', createWindow);

// New
app.whenReady().then(() => {
  createWindow();
});
```

4. **Handle macOS app activation:**
```javascript
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

### 6.5 Create preload.js (if needed)

If the renderer needs Node.js access, create `preload.js`:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    // Whitelist channels
    const validChannels = ['toMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
});
```

### 6.6 Update electron-builder Configuration

Check for `electron-builder.yml` or `package.json` build config:

```json
{
  "build": {
    "appId": "com.micboard.app",
    "mac": {
      "category": "public.app-category.utilities",
      "target": ["dmg", "zip"]
    },
    "files": [
      "main.js",
      "preload.js",
      "py/**/*",
      "static/**/*",
      "*.html",
      "democonfig.json"
    ]
  }
}
```

### 6.7 Test Electron App

```bash
# First, ensure Python backend builds
cd py
# If using PyInstaller, rebuild:
# pyinstaller micboard.spec
cd ..

# Test Electron app
npm run app
```

**Test checklist:**
- [ ] App launches without errors
- [ ] Menu bar icon appears (macOS)
- [ ] Python subprocess starts
- [ ] Browser window opens
- [ ] WebSocket connection works
- [ ] App quits cleanly

### 6.8 Test Packaging

```bash
# Build distributable
npm run dist

# Check output in dist/ folder
ls -lh dist/
```

### 6.9 Commit

```bash
git add main.js preload.js package.json package-lock.json
git commit -m "Migrate Electron from v5 to v32 with security improvements"
```

**Note:** This is the most complex update. May require multiple iterations.

---

## Task 7: Modernize Python Dependencies and Tooling

**Duration:** 2 hours
**Risk:** MEDIUM
**Goal:** Pin versions, add type hints, improve code quality

### 7.1 Update requirements.txt

```txt
tornado>=6.4,<7.0
```

Test that current code works:
```bash
pip install -r py/requirements.txt
python py/micboard.py --help
```

### 7.2 Install Development Dependencies

```bash
pip install -r py/requirements-dev.txt
```

### 7.3 Add Type Hints to Core Modules

Start with `config.py` (example):

```python
from typing import Dict, List, Optional, Any
import json

def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    with open(config_path, 'r') as f:
        return json.load(f)

def save_config(config: Dict[str, Any], config_path: str) -> None:
    """Save configuration to JSON file."""
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
```

### 7.4 Run mypy Type Checking

Create `mypy.ini`:
```ini
[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = False  # Start permissive, tighten later

[mypy-tornado.*]
ignore_missing_imports = True
```

Run mypy:
```bash
mypy py/micboard.py
```

### 7.5 Format Code with Black

```bash
# Format all Python files
black py/

# Check what would change (dry run)
black --check py/
```

### 7.6 Lint with Ruff

Create `pyproject.toml`:
```toml
[tool.black]
line-length = 100
target-version = ['py311']

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = [
    "E",  # pycodestyle errors
    "W",  # pycodestyle warnings
    "F",  # pyflakes
    "I",  # isort
    "B",  # flake8-bugbear
    "C4",  # flake8-comprehensions
]
ignore = [
    "E501",  # line too long (black handles this)
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
```

Run ruff:
```bash
ruff check py/
```

### 7.7 Create Basic Tests

Create `tests/test_config.py`:
```python
import pytest
import json
import tempfile
from pathlib import Path
import sys

# Add py/ to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'py'))

from config import load_config, save_config


def test_load_config():
    """Test loading configuration from JSON file."""
    # Create temporary config
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        test_config = {"port": 8058, "uuid": "test-123"}
        json.dump(test_config, f)
        temp_path = f.name

    try:
        config = load_config(temp_path)
        assert config["port"] == 8058
        assert config["uuid"] == "test-123"
    finally:
        Path(temp_path).unlink()


def test_save_config():
    """Test saving configuration to JSON file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_path = f.name

    try:
        test_config = {"port": 9000, "uuid": "test-456"}
        save_config(test_config, temp_path)

        # Read back
        with open(temp_path, 'r') as f:
            loaded = json.load(f)

        assert loaded["port"] == 9000
        assert loaded["uuid"] == "test-456"
    finally:
        Path(temp_path).unlink()
```

Run tests:
```bash
pytest tests/ -v
```

### 7.8 Commit Python Modernization

```bash
git add py/ tests/ pyproject.toml mypy.ini py/requirements.txt py/requirements-dev.txt
git commit -m "Modernize Python: add type hints, black formatting, tests"
```

---

## Task 8: End-to-End Testing

**Duration:** 2 hours
**Risk:** LOW
**Goal:** Verify everything works together

### 8.1 Full Build Test

```bash
# Clean everything
rm -rf node_modules/ static/*.js static/*.map static/fonts/
npm cache clean --force

# Fresh install
npm install

# Build
npm run build

# Verify outputs
ls -lh static/
```

### 8.2 Python Server Test

```bash
# Install Python deps
pip install -r py/requirements.txt

# Run server
python py/micboard.py -p 8058
```

In another terminal:
```bash
# Test endpoints
curl http://localhost:8058/
curl http://localhost:8058/data.json
curl http://localhost:8058/about
```

### 8.3 Demo Mode Full Test

Open browser: `http://localhost:8058/#demo=true`

**Test checklist:**
- [ ] Page loads without console errors
- [ ] Channels display with random data
- [ ] Charts animate smoothly
- [ ] Press 's' - settings dialog opens
- [ ] Drag and drop works in settings
- [ ] Background mode works (press 'b')
- [ ] TV mode works (add `#tvmode=true`)
- [ ] QR code displays
- [ ] About page loads

### 8.4 Electron App Test

```bash
npm run app
```

- [ ] App launches
- [ ] Python subprocess starts
- [ ] UI displays correctly
- [ ] Quit works cleanly

### 8.5 Docker Build Test

```bash
docker build -t micboard:test .
docker run -p 8058:8058 micboard:test
```

Test: `http://localhost:8058/#demo=true`

### 8.6 Create Test Documentation

Create `TESTING.md`:
```markdown
# Testing Micboard

## Quick Test

```bash
npm run build
npm run server
# Open http://localhost:8058/#demo=true
```

## Full Test Suite

```bash
# Frontend build
npm run build

# Python tests
pytest tests/ -v

# Python type checking
mypy py/

# Python linting
ruff check py/
black --check py/

# Frontend linting
npx eslint js/
```

## Manual Testing

1. Demo mode: `http://localhost:8058/#demo=true`
2. Settings: Press 's' key
3. TV mode: Add `#tvmode=true`
4. Background mode: Press 'b' key
5. Electron app: `npm run app`
6. Docker: `docker build -t micboard . && docker run -p 8058:8058 micboard`
```

### 8.7 Final Commit

```bash
git add TESTING.md
git commit -m "Add comprehensive testing documentation"
```

---

## Phase 1 Completion Checklist

### Code Changes
- [ ] package-lock.json committed
- [ ] Python version pinned (.python-version, requirements.txt)
- [ ] Node.js version specified (.nvmrc)
- [ ] node-sass → sass migration complete
- [ ] Webpack 4 → 5 migration complete
- [ ] Babel updated to 7.25+
- [ ] Electron 5 → 32 migration complete
- [ ] Python type hints added
- [ ] Black formatting applied
- [ ] Basic tests created

### Testing
- [ ] `npm run build` succeeds
- [ ] `npm run server` works
- [ ] Demo mode displays correctly
- [ ] Settings dialog works
- [ ] `npm run app` (Electron) works
- [ ] Docker build succeeds
- [ ] Python tests pass
- [ ] mypy checks pass
- [ ] No console errors in browser

### Documentation
- [ ] PHASE1_IMPLEMENTATION.md created
- [ ] TESTING.md created
- [ ] CHANGELOG.md updated (if exists)
- [ ] Comments added to complex changes

### Git
- [ ] All changes committed with clear messages
- [ ] Feature branch created
- [ ] No large files accidentally committed
- [ ] .gitignore updated if needed

---

## Rollback Plan

If critical issues occur:

```bash
# Rollback to main branch
git checkout main

# Or rollback specific commits
git revert <commit-hash>

# Or reset branch (if not pushed)
git reset --hard HEAD~1
```

Keep old Docker image:
```bash
docker tag micboard:latest micboard:pre-phase1
```

---

## Next Steps After Phase 1

Once Phase 1 is complete and tested:

1. **Merge to main:**
   ```bash
   git checkout main
   git merge phase1/modernization
   git push origin main
   ```

2. **Tag release:**
   ```bash
   git tag v0.9.0-phase1
   git push origin v0.9.0-phase1
   ```

3. **Deploy to production/staging**

4. **Monitor for issues** (1-2 weeks)

5. **Begin Phase 2** (Framework Updates)

---

## Estimated Time Breakdown

| Task | Estimated Time | Actual Time |
|------|----------------|-------------|
| 1. Dependency Management | 30 min | ___ |
| 2. node-sass → sass | 1 hour | ___ |
| 3. Webpack 4 → 5 | 2-3 hours | ___ |
| 4. Babel Update | 30 min | ___ |
| 5. Node.js Runtime | 1 hour | ___ |
| 6. Electron 5 → 32 | 3-4 hours | ___ |
| 7. Python Modernization | 2 hours | ___ |
| 8. End-to-End Testing | 2 hours | ___ |
| **Total** | **12-15 hours** | ___ |

---

## Support & Resources

### Webpack 5 Migration
- https://webpack.js.org/migrate/5/

### Electron 32 Breaking Changes
- https://www.electronjs.org/docs/latest/breaking-changes

### Dart Sass Migration
- https://sass-lang.com/documentation/breaking-changes/

### Python Type Hints
- https://docs.python.org/3/library/typing.html

---

**Ready to begin?** Start with Task 1!
