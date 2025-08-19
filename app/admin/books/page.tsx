import { BookManagement } from '@/components/admin/BookManagement';

export default function BooksPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Book Management</h1>
        <p className="text-slate-400">Manage pre-generation for your book library</p>
      </header>
      
      <BookManagement />
    </div>
  );
}