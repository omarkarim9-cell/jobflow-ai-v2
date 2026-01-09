import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * Entry Point for JobFlow Repair Tool
 */
const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical: Could not find root element in index.html");
}
