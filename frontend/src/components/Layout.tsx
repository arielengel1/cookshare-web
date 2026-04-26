import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusSquare, FiUser } from 'react-icons/fi';
import RightSidebar from './RightSidebar';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/search', icon: FiSearch, label: 'Search' },
    { path: '/add', icon: FiPlusSquare, label: 'Add' },
    { path: '/profile', icon: FiUser, label: 'Profile' }
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden w-full">
      {/* Top Header - CookShare App Name (Mobile) */}
      <header className="md:hidden p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent italic flex items-center gap-2">
          <img src="/cookshare_favicon.png" alt="CookShare" className="w-6 h-6 object-contain" />
          CookShare
        </h1>
      </header>

      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden md:flex flex-col w-70 bg-white border-r border-gray-100 p-6 z-20 shrink-0">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent italic mb-12 pl-2 flex items-center gap-3">
          <img src="/cookshare_favicon.png" alt="CookShare" className="w-8 h-8 object-contain" />
          CookShare
        </h1>
        <div className="flex flex-col gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-semibold text-lg ${isActive ? 'bg-rose-50 text-rose-500' : 'text-gray-500 hover:bg-gray-50 hover:text-rose-400'}`}>
                <Icon size={24} className={isActive ? 'fill-rose-50' : ''} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 relative bg-gray-50 scroll-smooth">
        <div className="max-w-2xl mx-auto w-full md:my-8 bg-white shadow-xl md:rounded-[40px] overflow-hidden min-h-full md:min-h-[calc(100%-4rem)] border border-gray-100 flex flex-col">
          <Outlet />
        </div>
      </main>

      <RightSidebar />

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center p-3 z-20 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive ? 'text-rose-500' : 'text-gray-500 hover:text-rose-400'}`}>
              <Icon size={24} className={isActive ? 'fill-rose-50' : ''} />
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
