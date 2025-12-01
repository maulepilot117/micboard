/**
 * useKeyboardShortcuts hook - Handles all keyboard shortcuts
 * Implements all 15 shortcuts from the original application
 */

import { useEffect } from 'react';
import { useMicboardStore } from '../store/micboard-store';

interface KeyboardShortcutCallbacks {
  onShowHelp: () => void;
  onShowQR: () => void;
  onToggleSidebar: () => void;
}

export const useKeyboardShortcuts = ({
  onShowHelp,
  onShowQR,
  onToggleSidebar,
}: KeyboardShortcutCallbacks) => {
  const {
    switchGroup,
    setIsDemo,
    isDemo,
    toggleDisplayMode,
    toggleInfoDrawer,
    setBackgroundMode,
    backgroundMode,
    displayMode,
    setSettingsMode,
    settingsMode,
    currentGroup,
  } = useMicboardStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if an input is focused
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      // Don't handle shortcuts if settings mode is active
      if (settingsMode !== 'NONE') {
        // Except ESC which should close settings
        if (event.key === 'Escape') {
          setSettingsMode('NONE');
        }
        return;
      }

      // Handle keyboard shortcuts
      switch (event.key) {
        // Number keys for group selection
        case '0':
          switchGroup(0);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          switchGroup(parseInt(event.key));
          break;

        // Demo mode toggle
        case 'd':
        case 'D':
          // Toggle demo mode and reload the page with demo parameter
          const newDemoState = !isDemo;
          setIsDemo(newDemoState);
          const url = new URL(window.location.href);
          if (newDemoState) {
            url.searchParams.set('demo', 'true');
          } else {
            url.searchParams.delete('demo');
          }
          window.history.replaceState({}, '', url.toString());
          if (!newDemoState) {
            // If turning off demo mode, reload to get real data
            window.location.reload();
          }
          break;

        // Group editor
        case 'e':
        case 'E':
          if (currentGroup !== 0) {
            setSettingsMode('GROUP');
            onToggleSidebar();
          }
          break;

        // Fullscreen toggle
        case 'f':
        case 'F':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
          break;

        // Image background toggle (TV mode only)
        case 'g':
        case 'G':
          if (displayMode === 'tvmode') {
            setBackgroundMode(backgroundMode === 'IMG' ? 'NONE' : 'IMG');
          }
          break;

        // Info drawer mode cycle
        case 'i':
        case 'I':
          toggleInfoDrawer();
          break;

        // Extended name editor
        case 'n':
          setSettingsMode('EXTENDED');
          break;

        // Extended editor with bulk paste
        case 'N':
          setSettingsMode('EXTENDED');
          // TODO: Show bulk paste textarea
          break;

        // Device configuration editor
        case 's':
        case 'S':
          setSettingsMode('CONFIG');
          break;

        // Display mode toggle (desk/TV)
        case 't':
        case 'T':
          toggleDisplayMode();
          break;

        // Video background toggle (TV mode only)
        case 'v':
        case 'V':
          if (displayMode === 'tvmode') {
            setBackgroundMode(backgroundMode === 'MP4' ? 'NONE' : 'MP4');
          }
          break;

        // QR code modal
        case 'q':
        case 'Q':
          onShowQR();
          break;

        // Help screen
        case '?':
        case '/':
          if (event.shiftKey || event.key === '?') {
            onShowHelp();
          }
          break;

        // Escape - reload application
        case 'Escape':
          if (settingsMode === 'NONE') {
            window.location.reload();
          }
          break;

        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    switchGroup,
    setIsDemo,
    isDemo,
    toggleDisplayMode,
    toggleInfoDrawer,
    setBackgroundMode,
    backgroundMode,
    displayMode,
    setSettingsMode,
    settingsMode,
    currentGroup,
    onShowHelp,
    onShowQR,
    onToggleSidebar,
  ]);
};