import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/app/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

console.log("Mounting Krome...");

import { KromeProvider } from './src/app/hooks/useKrome';

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <KromeProvider>
          <App />
        </KromeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("Mount command sent.");
} catch (e: any) {
  console.error("Fatal mount error:", e);
  document.body.innerHTML = `<h1 style="color:red">Fatal Mount Error: ${e.message}</h1>`;
}