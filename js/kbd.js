'use strict';

import { micboard, updateHash, generateQR } from './app.js';
import { toggleInfoDrawer, toggleImageBackground, toggleVideoBackground, toggleDisplayMode } from './display';
import { renderGroup } from './channelview.js';
import { groupEditToggle, initEditor } from './dnd.js';
import { slotEditToggle } from './extended.js';
import { initConfigEditor } from './config.js';


// https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API
function toggleFullScreen() {
  if (!document.webkitFullscreenElement) {
    document.documentElement.webkitRequestFullscreen();
  } else if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }
}

export function keybindings() {
  const hudButton = document.getElementById('hud-button');
  if (hudButton) {
    hudButton.addEventListener('click', function() {
      document.getElementById('hud').style.display = 'none';
    });
  }


  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      micboard.settingsMode = 'NONE';
      updateHash();
      window.location.reload();
    }
    const settingsEl = document.querySelector('.settings');
    if (settingsEl && settingsEl.offsetParent !== null) {
      return;
    }
    const editzoneEl = document.querySelector('.editzone');
    if (editzoneEl && editzoneEl.offsetParent !== null) {
      return;
    }
    const sidebarEl = document.querySelector('.sidebar-nav');
    if (sidebarEl && sidebarEl.offsetParent !== null) {
      return;
    }

    if (e.key === '0') {
      renderGroup(0);
    }
    if (e.key === '1') {
      renderGroup(1);
    }
    if (e.key === '2') {
      renderGroup(2);
    }
    if (e.key === '3') {
      renderGroup(3);
    }
    if (e.key === '4') {
      renderGroup(4);
    }
    if (e.key === '5') {
      renderGroup(5);
    }
    if (e.key === '6') {
      renderGroup(6);
    }
    if (e.key === '7') {
      renderGroup(7);
    }
    if (e.key === '8') {
      renderGroup(8);
    }
    if (e.key === '9') {
      renderGroup(9);
    }

    if (e.key === 'd') {
      micboard.url.demo = !micboard.url.demo;
      updateHash();
      window.location.reload();
    }

    if (e.key === 'e') {
      if (micboard.group !== 0) {
        groupEditToggle();
      }
    }

    if (e.key === 'f') {
      toggleFullScreen();
    }

    if (e.key === 'g') {
      toggleImageBackground();
    }

    if (e.key === 'i') {
      toggleInfoDrawer();
    }

    if (e.key === 'n') {
      slotEditToggle();
    }

    if (e.key === 'N') {
      slotEditToggle();
      const pasteBox = document.getElementById('paste-box');
      if (pasteBox) {
        pasteBox.style.display = 'block';
      }
    }

    if (e.key === 's') {
      initConfigEditor();
    }

    if (e.key === 'q') {
      generateQR();
      const modalEl = document.querySelector('.modal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.toggle();
      }
    }

    if (e.key === 't') {
      toggleDisplayMode();
    }

    if (e.key === 'v') {
      toggleVideoBackground();
    }

    if (e.key === '?') {
      const hudEl = document.getElementById('hud');
      if (hudEl) {
        hudEl.style.display = hudEl.style.display === 'none' ? 'block' : 'none';
      }
    }
  }, false);
}
