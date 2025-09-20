import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* الشريط الجانبي */}
      <div className="w-80 flex-shrink-0 border-l border-sidebar-border">
        <Sidebar />
      </div>
      
      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}