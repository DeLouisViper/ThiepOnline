import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE is set by the GitHub Actions workflow (e.g. "/thiep-cuoi/" for a project repo).
// Locally and for a "<user>.github.io" repo or a custom domain it stays "/".
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
});
