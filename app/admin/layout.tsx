import { Metadata } from 'next';
import dynamic from 'next/dynamic';

// Lazy load admin layout to reduce main bundle size
const AdminLayout = dynamic(
  () => import('@/components/admin/AdminLayout').then(mod => ({ default: mod.AdminLayout })),
  {
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    ),
  }
);

export const metadata: Metadata = {
  title: 'Admin Dashboard - BookBridge',
  description: 'BookBridge Admin Dashboard',
  robots: 'noindex, nofollow', // Prevent search engines from indexing admin pages
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}