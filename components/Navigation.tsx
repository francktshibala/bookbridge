'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { useAuth } from '@/components/SimpleAuthProvider';

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const navLinks = user ? [
    { href: '/', label: 'Home' },
    { href: '/enhanced-collection', label: '✨ Enhanced Books' },
    { href: '/library', label: 'Browse All Books' },
    { href: '/ai-tutor', label: 'AI Tutor' },
  ] : [];

  return (
    <nav style={{ 
      backgroundColor: '#1a1a2e', 
      borderBottom: '1px solid rgba(102, 126, 234, 0.2)', 
      color: '#ffffff',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(102, 126, 234, 0.1)'
    }}>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: 'none' }}>
        <div className="flex justify-between items-center h-16" style={{ width: '100%' }}>
          {/* Left side - Logo and Navigation always together */}
          <div className="flex items-center space-x-6" style={{ alignItems: 'center', height: '100%' }}>
            <Link href="/" style={{ 
              textDecoration: 'none', 
              outline: 'none', 
              margin: 0, 
              padding: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              lineHeight: '1'
            }} className="flex items-center">
              <span className="text-gradient" style={{ 
                fontSize: '24px', 
                margin: 0, 
                padding: 0,
                lineHeight: '1'
              }}>
                BookBridge ESL
              </span>
            </Link>
            
            {/* Navigation links - Always visible next to logo when user is logged in */}
            {user && navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link-styled ${
                  pathname === link.href
                    ? 'nav-link-active'
                    : 'nav-link-inactive'
                }`}
                style={{ 
                  color: '#ffffff', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  marginLeft: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {(link as any).icon && React.createElement((link as any).icon, { size: 16 })}
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side - Only User menu or Auth buttons */}
          <div className="flex items-center" style={{ minWidth: 'fit-content', paddingRight: '40px', marginRight: '24px' }}>
            {user ? (
              <>
                {/* Subscription Status */}
                <div className="mr-6">
                  <SubscriptionStatus />
                </div>
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 hover-lift-sm"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    minWidth: '44px',
                    minHeight: '44px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 4px 8px rgba(102, 126, 234, 0.3)'
                  }}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #7c8ef8 0%, #8b5fd6 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 12px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  </div>
                </button>

                {isUserMenuOpen && (
                  <div className="origin-top-right absolute right-0 mt-2 rounded-lg shadow-lg border z-50 smooth-appear"
                       style={{
                         backgroundColor: 'rgba(26, 26, 46, 0.95)',
                         borderColor: 'rgba(102, 126, 234, 0.2)',
                         boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(102, 126, 234, 0.2)',
                         backdropFilter: 'blur(20px)',
                         minWidth: '400px',
                         maxWidth: '500px',
                         width: 'max-content'
                       }}>
                    <div className="py-3" role="menu" aria-orientation="vertical">
                      <div className="px-6 py-3" style={{ 
                        color: '#f7fafc',
                        borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '500',
                          color: '#a5b4fc',
                          marginBottom: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Signed in as</div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#f7fafc',
                          wordBreak: 'break-word',
                          lineHeight: '1.4',
                          maxWidth: '100%',
                          overflow: 'visible'
                        }} title={user.email}>
                          {user.email}
                        </div>
                      </div>
                      <Link
                        href="/subscription"
                        className="block w-full text-left px-6 py-3 text-sm transition-all duration-300 hover-lift-sm"
                        style={{ 
                          color: '#60a5fa',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        role="menuitem"
                        onClick={() => setIsUserMenuOpen(false)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#60a5fa';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <span>⭐</span>
                        <span>Subscription</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-6 py-3 text-sm hover:bg-red-600 hover:bg-opacity-20 transition-all duration-300 hover-lift-sm"
                        style={{ 
                          color: '#ef4444',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        role="menuitem"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium hover:text-purple-400 transition-all duration-300 whitespace-nowrap hover-lift-sm"
                  style={{ 
                    textDecoration: 'none',
                    color: '#e2e8f0',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.color = '#7c8ef8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#e2e8f0';
                  }}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn btn-brand px-6 py-2 text-sm font-semibold whitespace-nowrap"
                  style={{ textDecoration: 'none' }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

    </nav>
  );
}