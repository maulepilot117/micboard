# Phase 2: Framework Updates - Implementation Plan

**Timeline:** 1-2 weeks
**Goal:** Upgrade to Bootstrap 5, remove jQuery, update remaining dependencies
**Branch:** phase2/framework-updates

---

## Overview

Phase 2 builds on Phase 1's modernization to update frontend frameworks. The primary goal is migrating from Bootstrap 4 (which requires jQuery) to Bootstrap 5 (jQuery-free) and modernizing remaining dependencies.

## Tasks Breakdown

### Task 1: Bootstrap 4 → 5 Migration
**Duration:** 3-4 hours
**Risk:** MEDIUM-HIGH
**Complexity:** MEDIUM

#### 1.1 Update Dependencies

```bash
# Update Bootstrap and Popper
npm install bootstrap@5.3.3
npm install @popperjs/core@2.11.8
npm uninstall popper.js
```

#### 1.2 Breaking Changes to Address

**HTML Changes:**
- `data-toggle` → `data-bs-toggle`
- `data-target` → `data-bs-target`
- `data-dismiss` → `data-bs-dismiss`
- Modal structure changes
- Navbar changes
- Input group changes

**CSS Class Changes:**
- `.text-left` → `.text-start`
- `.text-right` → `.text-end`
- `.float-left` → `.float-start`
- `.float-right` → `.float-end`
- `.ml-*` → `.ms-*` (margin-left to margin-start)
- `.mr-*` → `.me-*` (margin-right to margin-end)
- `.pl-*` → `.ps-*` (padding-left to padding-start)
- `.pr-*` → `.pe-*` (padding-right to padding-end)
- `.form-row` → `.row`
- `.form-group` removed (use `.mb-3` instead)

**JavaScript Changes:**
- Global Bootstrap object moved to `bootstrap` namespace
- Component instantiation changed
- Event names changed (`show.bs.modal` pattern)

**Files to Update:**
- `demo.html` - Update all data-* attributes and CSS classes
- `index.html` - Same updates
- `about.html` - Same updates
- `js/app.js` - Update Bootstrap component usage
- `js/config.js` - Update Bootstrap component usage
- `css/*.scss` - Update utility classes if used

---

### Task 2: Remove jQuery Dependency
**Duration:** 4-5 hours
**Risk:** MEDIUM
**Complexity:** MEDIUM-HIGH

#### 2.1 jQuery Usage Analysis

Files using jQuery:
- `js/app.js`
- `js/about.js`
- `js/channelview.js`
- `js/config.js`
- `js/display.js`
- `js/dnd.js`
- `js/extended.js`
- `js/kbd.js`

#### 2.2 jQuery → Vanilla JS Conversion Patterns

**DOM Selection:**
```javascript
// jQuery
$('#id')
$('.class')
$('element')

// Vanilla JS
document.getElementById('id')
document.querySelector('.class')
document.querySelector('element')
document.querySelectorAll('.class') // for multiple
```

**Event Handling:**
```javascript
// jQuery
$('#id').click(() => {})
$('#id').on('click', () => {})

// Vanilla JS
document.getElementById('id').addEventListener('click', () => {})
```

**DOM Manipulation:**
```javascript
// jQuery
$('#id').hide()
$('#id').show()
$('#id').html(content)
$('#id').text(content)
$('#id').attr('name', 'value')

// Vanilla JS
document.getElementById('id').style.display = 'none'
document.getElementById('id').style.display = 'block'
document.getElementById('id').innerHTML = content
document.getElementById('id').textContent = content
document.getElementById('id').setAttribute('name', 'value')
```

**Class Manipulation:**
```javascript
// jQuery
$('#id').addClass('class')
$('#id').removeClass('class')
$('#id').toggleClass('class')

// Vanilla JS
document.getElementById('id').classList.add('class')
document.getElementById('id').classList.remove('class')
document.getElementById('id').classList.toggle('class')
```

**Iteration:**
```javascript
// jQuery
$('.class').each(function(index) {
  const el = $(this)
})

// Vanilla JS
document.querySelectorAll('.class').forEach((el, index) => {
  // use el directly
})
```

**Document Ready:**
```javascript
// jQuery
$(document).ready(() => {})

// Vanilla JS
document.addEventListener('DOMContentLoaded', () => {})
// OR if script is at bottom of body, not needed
```

**Bootstrap Components (Bootstrap 5):**
```javascript
// jQuery (Bootstrap 4)
$('.collapse').collapse('hide')
$('.modal').modal('show')

// Vanilla JS (Bootstrap 5)
const collapseEl = document.querySelector('.collapse')
const collapse = new bootstrap.Collapse(collapseEl)
collapse.hide()

const modalEl = document.querySelector('.modal')
const modal = new bootstrap.Modal(modalEl)
modal.show()
```

#### 2.3 Remove jQuery from webpack.config.js

Remove the ProvidePlugin for jQuery:
```javascript
// Remove this:
new webpack.ProvidePlugin({
  $: 'jquery',
  jQuery: 'jquery',
}),
```

#### 2.4 Remove jQuery from package.json

```bash
npm uninstall jquery
```

---

### Task 3: Update Remaining Dependencies
**Duration:** 1-2 hours
**Risk:** LOW
**Complexity:** LOW

#### 3.1 Update Minor Packages

```bash
# Update to latest compatible versions
npm install --save @ibm/plex@6.4.1
npm install --save @shopify/draggable@1.1.3
npm install --save qrcode@1.5.3
npm install --save smoothie@1.36.1
npm uninstall whatwg-fetch  # Native fetch is supported everywhere now
```

#### 3.2 Remove Deprecated Packages

- `whatwg-fetch` - No longer needed (native fetch widely supported)
- `node-gyp` - Not directly needed (dependency of old node-sass)

```bash
npm uninstall whatwg-fetch node-gyp
```

#### 3.3 Update webpack.config.js

Remove whatwg-fetch from entry points:
```javascript
// Before
entry: {
  app: ['whatwg-fetch', './js/app.js'],
}

// After
entry: {
  app: './js/app.js',
}
```

---

### Task 4: Update ESLint Configuration
**Duration:** 1 hour
**Risk:** LOW
**Complexity:** LOW

#### 4.1 Update .eslintrc.js for No-jQuery

Create/update `.eslintrc.js`:
```javascript
module.exports = {
  extends: 'airbnb-base',
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Disallow jQuery
    'no-restricted-globals': ['error', {
      name: '$',
      message: 'Use vanilla JavaScript instead of jQuery',
    }, {
      name: 'jQuery',
      message: 'Use vanilla JavaScript instead of jQuery',
    }],
  },
};
```

---

## Testing Strategy

### 1. Build Tests
```bash
npm run build
# Should complete without errors
```

### 2. Visual Regression Tests

**Demo Mode:**
- http://localhost:8058/#demo=true
- Check all UI elements render correctly
- Check colors, spacing, layout

**Components to Test:**
- ✓ Navbar toggle
- ✓ Modals (QR code modal)
- ✓ Collapse components (settings sidebar)
- ✓ Forms (input groups, buttons)
- ✓ Grid layout (responsive)
- ✓ Tooltips/Popovers (if used)

**Settings:**
- Press 's' key - settings should open
- Check dropdowns work
- Check buttons work
- Check form inputs work

**Group Editor:**
- Press 'e' key - group editor should open
- Check drag and drop still works
- Check save/close buttons work

### 3. Functional Tests

**Event Handlers:**
- Keyboard shortcuts (1-9, s, e, q, etc.)
- Click handlers on all buttons
- Form submissions

**Bootstrap Components:**
- Navbar collapse/expand
- Modal show/hide
- Collapse show/hide

### 4. Browser Compatibility

Test in:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

## File-by-File Migration Checklist

### HTML Files
- [ ] demo.html - Update data-* attributes and CSS classes
- [ ] index.html - Update data-* attributes and CSS classes
- [ ] about.html - Update data-* attributes and CSS classes

### JavaScript Files
- [ ] js/app.js - Remove jQuery, update Bootstrap 5 API
- [ ] js/about.js - Remove jQuery
- [ ] js/channelview.js - Remove jQuery
- [ ] js/config.js - Remove jQuery, update Bootstrap 5 API
- [ ] js/display.js - Remove jQuery
- [ ] js/dnd.js - Remove jQuery
- [ ] js/extended.js - Remove jQuery
- [ ] js/kbd.js - Remove jQuery

### Configuration Files
- [ ] package.json - Update dependencies
- [ ] webpack.config.js - Remove jQuery ProvidePlugin
- [ ] .eslintrc.js - Add no-jQuery rule

### SCSS Files
- [ ] Check for Bootstrap 4 specific mixins/variables
- [ ] Update if using deprecated utility classes

---

## Breaking Changes Summary

### For Users
- ✅ No breaking changes (UI/UX identical)
- ✅ All functionality preserved

### For Developers
- jQuery removed - use vanilla JS
- Bootstrap 5 API changes
- Webpack config changes

---

## Rollback Plan

If critical issues occur:
```bash
git checkout master
# OR
git revert <commit-hash>
```

---

## Expected Results

- ✅ Bootstrap 5.3.3 installed
- ✅ jQuery completely removed
- ✅ All deprecated dependencies removed
- ✅ Build succeeds
- ✅ UI looks identical
- ✅ All functionality works
- ✅ Smaller bundle size (~200KB savings from removing jQuery)
- ✅ Better performance (no jQuery overhead)

---

## Next Steps After Phase 2

- Resolve remaining npm audit warnings
- Consider TypeScript migration (Phase 5)
- Consider modern framework (React/Vue/Svelte) - Phase 5

---

**Ready to begin Phase 2!**
