import { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const UiUpgradeShowcase = lazy(() =>
  import('./preview/UiUpgradeShowcase.tsx').then(({ UiUpgradeShowcase }) => ({
    default: UiUpgradeShowcase,
  })),
);

function isUiPreviewRoute(): boolean {
  const { pathname, search, hash } = window.location;
  if (pathname === '/ui-preview' || pathname === '/ui-preview/') return true;
  if (new URLSearchParams(search).get('preview') === 'ui') return true;
  return hash === '#/ui-preview';
}

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  isUiPreviewRoute() ? (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm font-semibold">
          Đang tải bản xem trước giao diện Nhóm 3...
        </div>
      }
    >
      <UiUpgradeShowcase />
    </Suspense>
  ) : (
    <App />
  ),
);
