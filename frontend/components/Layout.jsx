/**
 * Layout Component
 * Main layout with responsive sidebar (desktop) and bottom nav (mobile).
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const settingsChildren = [
    { label: '單位', tab: 'units' },
    { label: '地點（+所屬單位）', tab: 'locations' },
    { label: '故障類別', tab: 'faultCategories' },
    { label: '處理狀態', tab: 'repairStatuses' },
    { label: '施工單位', tab: 'contractors' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Desktop Sidebar - hidden on mobile (< md:) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 bg-slate-800 text-white flex-col z-50">
        {/* Sidebar Header */}
        <div className="px-5 py-5 border-b border-slate-700">
          <h1 className="text-lg font-bold">工作管理系統</h1>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {/* 工單列表 */}
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 transition-colors ${
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>工單列表</span>
          </NavLink>

          {isAdmin() && (
            <>
              {/* 會員 */}
              <NavLink
                to="/members"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-3 transition-colors ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>會員</span>
              </NavLink>

              {/* 設定（可收折父節點） */}
              <div>
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition-colors text-slate-300 hover:bg-slate-700 hover:text-white ${
                    location.pathname.startsWith('/settings') ? 'bg-slate-700 text-white' : ''
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="flex-1 text-left">設定</span>
                  {/* 箭頭：展開時旋轉 90deg */}
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 設定子項目 */}
                {settingsOpen && (
                  <div className="bg-slate-900/50">
                    {settingsChildren.map((item) => (
                      <button
                        key={item.tab}
                        onClick={() => navigate(`/settings?tab=${item.tab}`)}
                        className="w-full flex items-center gap-3 pl-11 pr-5 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Sidebar Footer - User Info & Logout */}
        <div className="px-5 py-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300 truncate">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </aside>

      {/* Desktop Header - hidden on mobile */}
      <header className="hidden md:flex bg-primary-800 text-white px-6 py-4 pl-56">
        {/* Empty for desktop - sidebar handles branding */}
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-primary-800 text-white px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">工作管理系統</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-primary-200">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-primary-200 hover:text-white transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - pl-56 on desktop for sidebar spacing */}
      <main className="flex-1 overflow-auto pb-20 md:pb-6 md:pl-56">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - hidden on desktop */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-500'
              }`
            }
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs mt-1">工單</span>
          </NavLink>

          {isAdmin() && (
            <>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  }`
                }
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs mt-1">設定</span>
              </NavLink>

              <NavLink
                to="/members"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-500'
                  }`
                }
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-xs mt-1">會員</span>
              </NavLink>
            </>
          )}
        </div>
      </nav>

      {/* Footer - hidden on desktop */}
      <footer className="md:hidden bg-primary-800 text-primary-200 text-xs text-center py-2">
        <span>© OneThree Studio</span>
      </footer>
    </div>
  );
}
