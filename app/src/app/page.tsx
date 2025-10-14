'use client';

import { useAtom } from 'jotai';
import { userAtom, isAuthenticatedAtom, sidebarOpenAtom, logoutAtom, loginAtom } from '@/store';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ListIcon, UserIcon, PlusIcon } from '@phosphor-icons/react';
import { getSession } from '@/lib/session';

// Login/Register Card Component
function LoginCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SignedVoting</h1>
          <p className="text-gray-600 mb-8">Sign in to participate in governance</p>
          
          <div className="space-y-4">
            <Link
              href="/login"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors block text-center"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors block text-center"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const [user] = useAtom(userAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [, logout] = useAtom(logoutAtom);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  const navItems = [
    { name: 'Recent Proposals', href: '/proposals', icon: ListIcon },
    { name: 'My Proposals', href: '/my-proposals', icon: UserIcon },
    { name: 'Create Proposal', href: '/create-proposal', icon: PlusIcon },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out sidebar-scroll
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 h-full flex flex-col">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-gray-900">SignedVoting</h1>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 flex-1">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Proposals
            </div>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <IconComponent size={20} weight="regular" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          {user && (
            <div className="mt-auto">
              <div className="relative" ref={dropdownRef}>
                <button
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900">{user.username}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* User Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <button 
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Logout
                    </button>
                    <button className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                      Link Wallet
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Main Content Component
function MainContent() {
  return (
    <div className="flex-1 bg-gray-50 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Proposals</h2>
          <div className="text-gray-500 text-center py-12">
            No proposals yet. Create your first proposal to get started!
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);
  const [, login] = useAtom(loginAtom);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on client side
  useEffect(() => {
    const session = getSession();
    if (session) {
      login(session);
    }
    setIsLoading(false);
  }, [login]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginCard />;
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Navigation Sidebar */}
      <Navigation />
      
      {/* Main Content */}
      <MainContent />
    </div>
  );
}

