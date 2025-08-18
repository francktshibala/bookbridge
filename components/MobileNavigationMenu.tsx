'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SubscriptionStatus } from '@/components/SubscriptionStatus';
import { useAuth } from '@/components/SimpleAuthProvider';

interface MobileNavigationMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigationMenu({ isOpen, onClose }: MobileNavigationMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push('/');
  };

  const handleNavClick = () => {
    onClose();
  };

  const navigationItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/enhanced-collection', label: '✨ Enhanced Books', icon: '✨' },
    { href: '/library', label: 'Browse All Books', icon: '📚' },
    ...(user ? [{ href: '/ai-tutor', label: 'AI Tutor', icon: '📊' }] : []),
  ];

  // Hide on desktop screens even if isOpen is true
  if (!isOpen) return null;
  
  // Additional check: hide on desktop screens
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="mobile-nav-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: '40',
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      />
      
      {/* Slide-out Menu */}
      <div 
        className="mobile-nav-menu"
        style={{
          position: 'fixed',
          top: '0',
          right: '0',
          height: '100vh',
          width: '320px',
          zIndex: '50',
          backgroundColor: 'rgba(26, 26, 46, 0.98)',
          backdropFilter: 'blur(20px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(102, 126, 234, 0.2)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
          {/* Header with Close Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
            <h2 className="text-white text-lg font-semibold">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-700 hover:bg-opacity-30 transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '24px',
                minWidth: '44px',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              aria-label="Close menu"
            >
              ×
            </button>
          </div>

          {/* User Profile Section */}
          <div className="mb-6">
            <div 
              className="flex items-center p-4 rounded-lg"
              style={{
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.2)'
              }}
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center mr-3"
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              >
                <span className="text-white font-semibold text-lg">
                  {user ? user.email?.[0].toUpperCase() : 'G'}
                </span>
              </div>
              <div>
                <div className="text-white font-semibold text-base">
                  {user ? 'User' : 'Guest User'}
                </div>
                <div className="text-gray-400 text-sm">
                  Level: B2
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ flex: '1' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {navigationItems.length > 0 ? (
                navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={`nav-link-styled ${
                      pathname === item.href
                        ? 'nav-link-active'
                        : 'nav-link-inactive'
                    }`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '8px 0',
                      minHeight: '56px'
                    }}
                  >
                    <span style={{ fontSize: '20px', marginRight: '10px' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))
              ) : null}
              
              {/* Show Sign In/Sign Up for guest users */}
              {!user && (
                <div className="space-y-4 mt-6">
                  <Link
                    href="/auth/login"
                    onClick={handleNavClick}
                    className="flex items-center justify-center p-4 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                    style={{
                      textDecoration: 'none',
                      minHeight: '56px',
                    }}
                  >
                    <span className="text-white font-semibold text-base">
                      Sign In
                    </span>
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={handleNavClick}
                    className="flex items-center justify-center p-4 rounded-lg border-2 border-blue-500 hover:bg-blue-500 hover:bg-opacity-10 transition-colors"
                    style={{
                      textDecoration: 'none',
                      minHeight: '56px',
                    }}
                  >
                    <span className="text-blue-400 hover:text-white font-semibold text-base">
                      Sign Up
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Bottom Section */}
          {user && (
            <div className="mt-auto pt-6 border-t border-gray-600 border-opacity-30">
              {/* Subscription Status */}
              <div className="mb-4">
                <SubscriptionStatus />
              </div>
              
              {/* Settings & Sign Out */}
              <div className="space-y-2">
                <Link
                  href="/subscription"
                  onClick={handleNavClick}
                  className="flex items-center p-3 rounded-lg hover:bg-gray-700 hover:bg-opacity-30 transition-colors"
                  style={{
                    textDecoration: 'none',
                    minHeight: '48px',
                  }}
                >
                  <span className="text-lg mr-3">⚙️</span>
                  <span className="text-gray-200 text-sm font-medium">Settings</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full p-3 rounded-lg text-left hover:bg-red-600 hover:bg-opacity-20 transition-colors"
                  style={{
                    minHeight: '48px',
                    backgroundColor: 'transparent',
                    border: 'none',
                  }}
                >
                  <span className="text-lg mr-3">🚪</span>
                  <span className="text-red-400 text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}