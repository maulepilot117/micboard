/**
 * React application entry point
 * This mounts the React app alongside the existing vanilla JavaScript
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';

// Import order matters! Base styles first, then customizations
// 1. Bootstrap for grid system and base components
import 'bootstrap/dist/css/bootstrap.min.css';
// 2. IBM Plex fonts
import '@ibm/plex/css/ibm-plex.css';
// 3. Original micboard styles (colors then main styles)
import '../css/colors.scss';
import '../css/style.scss';
// 4. React-specific overrides (last to ensure they take precedence)
import './styles/index.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000, // Data is fresh for 1 second
    },
  },
});

// Mount React app
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );

  console.log('✅ React app mounted successfully');
} else {
  console.error('❌ React root element not found. Make sure #root exists in HTML.');
}
