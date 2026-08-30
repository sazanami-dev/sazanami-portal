"use client"; // Sheet（クライアントフック）を使う部分だけをここに閉じ込める

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { navLinks } from './nav-links';

const MobileNav = () => {
  // メニュー内のリンクをクリックした際にSheetを閉じるためのState
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Menu className="h-6 w-6 text-gray-700" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[250px] sm:w-[300px]">
        <SheetTitle className="text-left mb-6 sr-only">
          ナビゲーションメニュー
        </SheetTitle>

        <nav className="mt-8 flex flex-col gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // リンククリック時にメニューを閉じる
              onClick={() => setIsOpen(false)}
              className="text-lg font-medium text-gray-800 hover:text-gray-500 transition-colors block border-b border-gray-100 pb-2  ml-5"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
