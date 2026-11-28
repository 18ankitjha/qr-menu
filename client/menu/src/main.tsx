import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import PreviewApp from './preview/PreviewApp';
import { PREVIEW_PATH } from './preview/preview.protocol';

const isPreview = window.location.pathname.replace(/\/$/, '') === PREVIEW_PATH;

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isPreview ? <PreviewApp /> : <App />}</StrictMode>,
);
