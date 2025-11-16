# Phase 2 Testing Guide - Bootstrap 5 with jQuery

**Date:** November 16, 2025
**Branch:** phase2/framework-updates
**Status:** ✅ BUILD SUCCESSFUL - Ready for Manual Testing

---

## 🎯 Current State

**What's Changed:**
- ✅ Bootstrap 4.3.1 → 5.3.3
- ✅ Removed jQuery from dependencies (but still used in JS code)
- ✅ Removed whatwg-fetch (native fetch support)
- ✅ Removed popper.js → Added @popperjs/core
- ✅ Updated demo.html (data-toggle → data-bs-toggle)
- ✅ Build succeeds with no errors

**What's NOT Changed Yet:**
- ⏳ JavaScript files still use jQuery syntax
- ⏳ HTML files may have other Bootstrap 4 data attributes
- ⏳ CSS classes haven't been updated for Bootstrap 5

**Why This Matters:**
We're testing if Bootstrap 5 is **backward compatible** with:
1. jQuery-based code
2. Bootstrap 4 HTML attributes (mostly)
3. Bootstrap 4 CSS classes

---

## 🚀 How to Test

### Step 1: Start the Server

```bash
# Build the frontend (already done)
npm run build

# Start Python server
python3 py/micboard.py -p 8058

# Or if you have tornado installed:
pip3 install tornado>=6.4
python3 py/micboard.py
```

### Step 2: Open Demo Mode

Open your browser to:
```
http://localhost:8058/#demo=true
```

---

## ✅ Manual Testing Checklist

### A. Visual Layout Test
Open `http://localhost:8058/#demo=true`

- [ ] **Page loads without errors** (check browser console F12)
- [ ] **Channels display** in grid layout
- [ ] **Colors are correct** (green/yellow/red for battery status)
- [ ] **Charts animate** smoothly
- [ ] **Fonts render** correctly (IBM Plex)
- [ ] **Layout is responsive** (resize browser window)

### B. Navbar Test
- [ ] **Navbar is visible** at top of page
- [ ] **Click hamburger menu** (☰ icon) - should expand/collapse
- [ ] **Menu items are clickable**
- [ ] **"all devices" link** works
- [ ] **Group links (1-9)** display
- [ ] **Menu closes** when clicking outside

**Expected Behavior:** Navbar collapse should work with Bootstrap 5's new data-bs-toggle

### C. Keyboard Shortcuts Test

Press these keys and verify they work:

- [ ] **`s`** - Opens settings/configuration panel
- [ ] **`e`** - Opens group editor sidebar
- [ ] **`q`** - Shows QR code modal
- [ ] **`?`** - Shows keyboard shortcuts guide
- [ ] **`1-9`** - Loads different groups
- [ ] **`0`** - Shows all slots
- [ ] **`f`** - Toggles fullscreen
- [ ] **`ESC`** - Reloads page

### D. Settings Dialog Test

Press **`s`** key:

- [ ] **Settings panel opens** on right side
- [ ] **Two columns visible** (Discovered Devices / Slot Configuration)
- [ ] **Dropdowns work** (device type selector)
- [ ] **Input fields work**
- [ ] **Buttons are clickable** (Add, Save, Clear)
- [ ] **Settings panel closes** (press `s` again or click outside)

### E. Group Editor Test

Press **`e`** key:

- [ ] **Sidebar opens** on left
- [ ] **Group title input** is visible
- [ ] **Checkbox works** (Hide inactive charts)
- [ ] **Buttons work** (Save, Close, Clear)
- [ ] **Can close sidebar** (press `e` again or click Close)

### F. QR Code Modal Test

Press **`q`** key:

- [ ] **Modal opens** with QR code
- [ ] **QR code displays**
- [ ] **Link is shown**
- [ ] **Click outside modal** - should close
- [ ] **Press ESC** - should close

### G. Extended Names Test

Press **`n`** key:

- [ ] **Extended names editor opens**
- [ ] **Input fields for ID and Name** visible
- [ ] **Save button works**
- [ ] **Clear buttons work**

### H. Form Interactions Test

In settings or group editor:

- [ ] **Text inputs accept input**
- [ ] **Dropdowns expand on click**
- [ ] **Dropdowns show options**
- [ ] **Can select dropdown options**
- [ ] **Radio buttons work** (if any)
- [ ] **Checkboxes toggle**

### I. Demo Data Test

In demo mode:

- [ ] **Channel names change** randomly
- [ ] **Battery levels change**
- [ ] **Colors update** based on battery
- [ ] **Charts show activity**
- [ ] **No JavaScript errors** in console

---

## 🐛 Known Issues to Watch For

### Potential Bootstrap 5 Compatibility Issues:

1. **Collapse not working**
   - Symptom: Navbar doesn't expand/collapse
   - Cause: Missing `data-bs-toggle` instead of `data-toggle`
   - Check: demo.html line 236

2. **Modal not opening**
   - Symptom: QR code modal doesn't appear
   - Cause: Bootstrap 5 modal API changed
   - Check: JS code using `.modal('show')`

3. **Dropdowns not working**
   - Symptom: Dropdown menus don't open
   - Cause: Bootstrap 5 dropdown API changed
   - Check: Settings panel dropdowns

4. **jQuery undefined errors**
   - Symptom: Console shows `$ is not defined`
   - Cause: We removed jQuery from webpack.config.js
   - **This is expected but bad** - means we need to fix JS files

5. **Popper.js errors**
   - Symptom: Console shows popper errors
   - Cause: Bootstrap 5 uses @popperjs/core differently
   - Check: Dropdown and tooltip positioning

---

## 📝 Testing Results Template

Copy this and fill it out:

```markdown
## Testing Results

**Tested by:** [Your Name]
**Date:** [Date]
**Browser:** [Chrome/Firefox/Safari/Edge + Version]

### Build
- [ ] Build successful: YES / NO
- [ ] Console errors: YES / NO (list them)

### Visual Layout
- [ ] Layout looks correct: YES / NO / ISSUES
- Issues:

### Navbar
- [ ] Hamburger menu works: YES / NO
- Issues:

### Keyboard Shortcuts
- [ ] All shortcuts work: YES / NO
- Not working:

### Settings Dialog
- [ ] Opens correctly: YES / NO
- [ ] Forms work: YES / NO
- Issues:

### Group Editor
- [ ] Opens correctly: YES / NO
- Issues:

### QR Code Modal
- [ ] Opens and closes: YES / NO
- Issues:

### Overall Assessment
- [ ] Ready for jQuery removal: YES / NO
- [ ] Critical blockers: YES / NO (describe)
- [ ] Minor issues: List them

### Browser Console Errors
[Paste any errors from browser console here]
```

---

## 🎯 Success Criteria

**PASS if:**
- ✅ No build errors
- ✅ Page loads in browser
- ✅ No critical JavaScript errors
- ✅ Navbar collapse works
- ✅ Settings dialog opens/closes
- ✅ Basic functionality works

**This means:** Bootstrap 5 is compatible, we can proceed with jQuery removal

**FAIL if:**
- ❌ Critical features don't work (navbar, modals, forms)
- ❌ JavaScript errors prevent app from loading
- ❌ Bootstrap components completely broken

**This means:** We need to fix Bootstrap 5 compatibility issues first

---

## 🔄 What Happens Next?

### If Testing PASSES ✅

**Next Steps:**
1. Document any minor issues found
2. Proceed with jQuery removal from JavaScript files
3. This involves converting 8 JS files to vanilla JavaScript
4. Estimated time: 4-5 hours

**Files to convert:**
- `js/app.js` (main app)
- `js/kbd.js`, `js/extended.js`, `js/dnd.js`
- `js/display.js`, `js/config.js`, `js/channelview.js`, `js/about.js`

### If Testing FAILS ❌

**Next Steps:**
1. Document specific failures
2. Fix Bootstrap 5 compatibility issues
3. Add missing data-bs-* attributes in HTML
4. Update Bootstrap component initialization in JS
5. Re-test before proceeding with jQuery removal

---

## 💡 Tips for Testing

1. **Open Browser Console (F12)** - Watch for errors while testing
2. **Test in multiple browsers** - Chrome, Firefox, Safari if possible
3. **Try both desktop and mobile views** - Use browser DevTools responsive mode
4. **Take screenshots** of any visual issues
5. **Note specific errors** - Copy/paste from console
6. **Test real Shure devices** if available (not just demo mode)

---

## 📊 Current Commits

```
2c943bd Remove whatwg-fetch imports (native fetch support)
7d0efd2 Add Phase 2 progress report
853254b Update demo.html for Bootstrap 5: data-toggle → data-bs-toggle
7c5e28e Update to Bootstrap 5 and remove jQuery/whatwg-fetch
bd6bb37 Add Phase 2 implementation plan
```

---

## 🆘 If You Need Help

**Common Issues:**

**"Module not found" errors**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**"Port 8058 already in use"**
```bash
# Find and kill the process
lsof -ti:8058 | xargs kill -9
# Or use different port
python3 py/micboard.py -p 8059
```

**Python "tornado not found"**
```bash
pip3 install tornado>=6.4
```

---

**Ready to test? Start the server and work through the checklist!** 🚀
