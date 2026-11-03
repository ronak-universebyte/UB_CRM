import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Target,
  CalendarClock,
  BarChart3,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types/auth';

const roleBadgeColors: Record<UserRole, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  Admin: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  AdmissionCounsellor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  Telecaller: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  MarketingManager: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800',
};

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'Leads Pipeline',
      path: '/leads',
      icon: Target,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'Follow-ups',
      path: '/followups',
      icon: CalendarClock,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'WhatsApp Hub',
      path: '/whatsapp',
      icon: MessageCircle,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'AI Assistant',
      path: '/ai',
      icon: Sparkles,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
    {
      label: 'Staff Management',
      path: '/staff',
      icon: Users,
      roles: ['SuperAdmin', 'Admin'] as UserRole[],
    },
    {
      label: 'My Profile',
      path: '/profile',
      icon: UserCircle,
      roles: ['SuperAdmin', 'Admin', 'AdmissionCounsellor', 'Telecaller', 'MarketingManager'] as UserRole[],
    },
  ];

  const filteredNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'hidden flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 md:flex',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20">
              UB
            </div>
            {sidebarOpen && (
              <div className="truncate">
                <span className="block font-bold leading-tight text-slate-900 dark:text-white">
                  UniverseByte
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  CRM
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  )
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer in Sidebar */}
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2',
              sidebarOpen ? 'bg-slate-50 dark:bg-slate-800/50' : 'justify-center'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
              {user?.fullName.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="truncate flex-1">
                <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {user?.fullName}
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.role}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                UniverseByte – Technology Redefined
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                  roleBadgeColors[user.role]
                )}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {user.role}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors dark:border-slate-700 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-64 flex-col bg-white p-4 shadow-xl dark:bg-slate-900">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">UniverseByte CRM</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                        )
                      }
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
