'use client';

import { useAtom } from 'jotai';
import { userAtom, sidebarOpenAtom, logoutAtom } from '@/store';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ListIcon, UserIcon, PlusIcon, CheckCircleIcon } from '@phosphor-icons/react';

export function Navigation() {
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

  const proposalItems = [
    { name: 'Recent Proposals', href: '/home', icon: ListIcon },
    { name: 'My Proposals', href: `/home?filter=${user?.id || ''}`, icon: UserIcon },
    { name: 'Create Proposal', href: '/proposal/create', icon: PlusIcon },
  ];

  const voteItems = [
    { name: 'Verify My Vote', href: '/vote/verify', icon: CheckCircleIcon },
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md cursor-pointer"
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
          <nav className="space-y-6 flex-1">
            {/* Proposals Section */}
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Proposals
              </div>
              {proposalItems.map((item) => {
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
            </div>

            {/* Votes Section */}
            <div>
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Votes
              </div>
              {voteItems.map((item) => {
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
            </div>
          </nav>

          {/* User Section */}
          {user && (
            <div className="mt-auto">
              <div className="relative" ref={dropdownRef}>
                <button
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
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
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      Logout
                    </button>
                    <Link 
                      href="/my-wallet"
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors block"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      {user.wallet_address ? 'My Wallet' : 'Link Wallet'}
                    </Link>
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
