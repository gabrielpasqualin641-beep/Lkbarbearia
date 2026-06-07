import React from 'react';
import { Calendar, Bell } from 'lucide-react';

const Navbar = ({ title }) => {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-20 bg-lk-card/50 backdrop-blur-md border-b border-lk-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-lg md:text-xl font-bold font-sans tracking-tight text-white pl-12 lg:pl-0">{title}</h2>
      </div>
      <div className="flex items-center gap-6">
        {/* Date Display */}
        <div className="flex items-center gap-2 text-sm text-lk-muted bg-lk-dark px-4 py-2 rounded-xl border border-lk-border">
          <Calendar size={15} className="text-lk-yellow" />
          <span className="capitalize">{currentDate}</span>
        </div>
        {/* Notifications */}
        <button className="p-2 bg-lk-dark rounded-xl border border-lk-border text-lk-muted hover:text-white transition-all duration-300 relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-lk-yellow rounded-full ring-2 ring-lk-card"></span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
