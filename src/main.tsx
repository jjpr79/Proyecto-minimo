import {createRoot} from 'react-dom/client';
import { AuthProvider } from './AuthContext.tsx';
import { OrganizationProvider } from './OrganizationContext.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <OrganizationProvider>
      <App />
    </OrganizationProvider>
  </AuthProvider>
);
