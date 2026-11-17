import { Navigate, Route, Routes } from 'react-router';
import { SyncProvider } from './sync/SyncContext';
import { TABS } from './tabs';
import Header from './components/Header';
import TabBar from './components/TabBar';
import UpdatePrompt from './components/UpdatePrompt';

export default function App() {
  return (
    <SyncProvider>
      <div className="shell">
        <Header />
        <main className="content">
          <Routes>
            {TABS.map(({ path, component: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <TabBar />
        <UpdatePrompt />
      </div>
    </SyncProvider>
  );
}
