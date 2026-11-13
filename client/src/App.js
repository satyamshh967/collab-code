import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';
import { RoomProvider } from './context/RoomContext';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// The workspace pulls in Monaco, Yjs and the editor tooling; load it only
// when a room is opened so the landing page stays fast.
const RoomPage = lazy(() => import('./pages/RoomPage'));

const PageLoader = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
    <span className="spinner" />
    Loading workspace...
  </div>
);

function App() {
  return (
    <SocketProvider>
      <RoomProvider>
        <div className="app-container">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:roomId" element={<RoomPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1d1d24', color: '#f4f4f5', border: '1px solid #2e2e38', fontSize: '0.85rem' }
          }}
        />
      </RoomProvider>
    </SocketProvider>
  );
}

export default App;
