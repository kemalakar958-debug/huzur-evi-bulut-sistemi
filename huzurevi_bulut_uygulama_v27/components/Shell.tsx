import Sidebar from './Sidebar';
import Topbar from './Topbar';
export default function Shell({children}:{children:React.ReactNode}){return <div className="appShell"><Sidebar/><main className="main"><Topbar/>{children}</main></div>}
