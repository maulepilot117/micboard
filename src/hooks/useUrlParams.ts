/**
 * useUrlParams hook - Handles URL parameter parsing and state initialization
 * Supports: #group=N, #demo=true, #settings=true, #tvmode=elinfo{00,01,10,11}, #bgmode={IMG|MP4}
 */

import { useEffect } from 'react';
import { useMicboardStore } from '../store/micboard-store';
import type { InfoDrawerMode, BackgroundMode } from '../types/micboard';

export const useUrlParams = () => {
  const {
    switchGroup,
    setIsDemo,
    setSettingsMode,
    setDisplayMode,
    setInfoDrawerMode,
    setBackgroundMode,
  } = useMicboardStore();

  useEffect(() => {
    const parseUrlParams = () => {
      const url = new URL(window.location.href);

      // Check query params first
      const queryDemo = url.searchParams.get('demo');
      if (queryDemo === 'true') {
        setIsDemo(true);
      }

      // Parse hash parameters
      const hash = window.location.hash.substring(1);
      if (!hash) return;

      const params = new URLSearchParams(hash);

      // Group parameter
      const group = params.get('group');
      if (group) {
        const groupNum = parseInt(group, 10);
        if (groupNum >= 0 && groupNum <= 9) {
          switchGroup(groupNum);
        }
      }

      // Demo mode parameter (can also be in hash)
      const demo = params.get('demo');
      if (demo === 'true') {
        setIsDemo(true);
      }

      // Settings parameter
      const settings = params.get('settings');
      if (settings === 'true') {
        setSettingsMode('CONFIG');
      }

      // TV mode parameter
      const tvmode = params.get('tvmode');
      if (tvmode) {
        setDisplayMode('tvmode');
        // Check if it includes info drawer mode
        const infoModes: InfoDrawerMode[] = ['elinfo00', 'elinfo01', 'elinfo10', 'elinfo11'];
        if (infoModes.includes(tvmode as InfoDrawerMode)) {
          setInfoDrawerMode(tvmode as InfoDrawerMode);
        }
      }

      // Background mode parameter
      const bgmode = params.get('bgmode');
      if (bgmode === 'IMG' || bgmode === 'MP4') {
        setBackgroundMode(bgmode as BackgroundMode);
      }
    };

    // Parse on mount
    parseUrlParams();

    // Listen for hash changes
    const handleHashChange = () => {
      parseUrlParams();
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [
    switchGroup,
    setIsDemo,
    setSettingsMode,
    setDisplayMode,
    setInfoDrawerMode,
    setBackgroundMode,
  ]);

  // Function to update URL with current state
  const updateUrl = (updates: Record<string, string | null>) => {
    const hash = new URLSearchParams(window.location.hash.substring(1));

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        hash.delete(key);
      } else {
        hash.set(key, value);
      }
    });

    const newHash = hash.toString();
    window.location.hash = newHash ? `#${newHash}` : '';
  };

  return { updateUrl };
};