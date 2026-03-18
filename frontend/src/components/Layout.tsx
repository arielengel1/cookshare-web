import { Outlet, Link, useLocation } from 'react-router-dom';
import { FiHome, FiSearch, FiPlusSquare, FiUser } from 'react-icons/fi';

const Layout = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: FiHome, label: 'Home' },
    { path: '/search', icon: FiSearch, label: 'Search' },
    { path: '/add', icon: FiPlusSquare, label: 'Add' },
    { path: '/profile', icon: FiUser, label: 'Profile' }
  ];

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative bg-white shadow-xl overflow-hidden">
      {/* Top Header - CookShare App Name */}
      <header className="p-4 border-b bg-white sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-orange-400 bg-clip-text text-transparent italic">
          CookShare
        </h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16 bg-gray-50">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center p-3 z-20">
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
