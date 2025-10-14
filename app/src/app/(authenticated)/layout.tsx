'use client';

import { useAtom } from 'jotai';
import { isAuthenticatedAtom } from '@/store';
import { Navigation } from '@/components/Navigation';
import { useState, useEffect } from 'react';
import { getSession } from '@/lib/session';
import { loginAtom } from '@/store';

// Login/Register Card Component
function LoginCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SignedVoting</h1>
          <p className="text-gray-600 mb-8">Sign in to participate in governance</p>
          
          <div className="space-y-4">
            <a
              href="/login"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors block text-center"
            >
              Log In
            </a>
            <a
              href="/register"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors block text-center"
            >
              Register
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <div className="flex-1 bg-gray-50 h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
