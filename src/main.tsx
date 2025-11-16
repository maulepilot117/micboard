/**
 * React application entry point
 * This mounts the React app alongside the existing vanilla JavaScript
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
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
const rootElement = document.getElementById('react-root');

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
  console.error('❌ React root element not found. Make sure #react-root exists in HTML.');
}
