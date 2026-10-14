import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Invitation } from './components/Invitation';
import './styles/invitation.css';

// The admin area is lazy-loaded so guests never download its code.
const AdminApp = lazy(() => import('./admin/AdminApp'));

// HashRouter: URLs look like  https://site/#/admin . This works on GitHub Pages with a direct link
// or a refresh, with no server rewrite rules needed.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Invitation />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Đang tải…</div>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
