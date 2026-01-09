import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("JobFlow Repair Tool: v1.0.9 Starting Mount...");

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Failed to find the root element. Ensure index.html has <div id='root'></div>");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("JobFlow Repair Tool: v1.0.9 Successfully Mounted.");
}
