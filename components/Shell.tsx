import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="appShell">
      <Sidebar />
      <main className="mainContent">
        <Topbar />
        <div className="pageContent">
          {children}
        </div>
      </main>
    </div>
  );
}
