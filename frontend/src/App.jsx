/**
 * Main App Component
 *
 * This is the root component of the application.
 */

import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { OrganizationProvider } from './context/OrganizationContext.jsx';
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx';
import { PlansProvider } from './context/PlansContext.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

// Import routes configuration
import routes from './routes/routes.jsx';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <OrganizationProvider>
          <SiteSettingsProvider>
            <PlansProvider>
              <div className="min-h-screen bg-gray-50">
                <Routes>
                  {routes.map((route, index) => (
                    <Route
                      key={index}
                      path={route.path}
                      element={route.element}
                    />
                  ))}
                </Routes>
              </div>
            </PlansProvider>
          </SiteSettingsProvider>
        </OrganizationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;