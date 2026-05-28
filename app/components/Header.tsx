"use client"; // Next.js App Router環境でSheet（クライアントフック）を使うためのおまじない

import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState } from 'react';

const Header = () => {
  // メニュー内のリンクをクリックした際にSheetを閉じるためのState
  const [isOpen, setIsOpen] = useState(false);

  // ナビゲーションのリンクを配列化しておくと、PC・スマホ両方で使い回せて便利です
  const navLinks = [
    { href: '/', label: 'Home' },
    // { href: '/about', label: 'About' },
    { href: '/members', label: 'Members' },
    { href: '/term', label: 'Term' },
    { href: '/links', label: 'Links' },
    { href: '/collections', label: 'Collections' },
  ];

  return (
    <div className="fixed top-4 left-0 right-0 flex justify-center z-50 px-4">
      <header className="
        w-full max-w-7xl 
        bg-white/60 backdrop-blur-md 
        shadow-lg 
        rounded-full 
        px-6 py-3 
        flex items-center justify-between
        border border-gray-200
      ">
        <div className="container mx-auto flex justify-between items-center w-full">
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/sazanami_dev.svg"
              alt="Sazanami Logo"
              width={120}
              height={40}
              loading="eager"
              className="w-[120px] md:w-[180px] h-auto md:p-1"
              style={{ height: 'auto' }}
            />
          </Link>

          {/* 2. PC用ナビゲーション (md以上で表示) */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="text-gray-700 hover:text-gray-400 transition-colors font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 3. モバイル用ハンバーガーメニュー (md未満で表示) */}
          <div className="md:hidden">
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
          </div>

        </div>
      </header>
    </div>
  );
};

export default Header;