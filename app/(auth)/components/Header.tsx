"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

import {LogoutButton} from '@/app/(auth)/components/signout-button'; 

const PortalHeader = () => {
  const [isOpen, setIsOpen] = useState(false);


  const navLinks = [
    { href: '/portal', label: 'Dashboard' },
    { href: '/portal/settings', label: 'Settings' },
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
              
              {/* 左側: ロゴ & タイトル */}
              <Link href="/portal" className="flex items-center gap-3 flex-shrink-0">
                <Image 
                  src="/sazanami_dev.svg"
                  alt="Sazanami Logo"
                  width={120}
                  height={40}
                  className="w-[100px] md:w-[180px] h-auto md:p-1"
                />
               
               
              </Link>
    
              {/* 右側: ログアウトボタン */}
              <div className="flex-shrink-0">
                <LogoutButton />
              </div>
    
            </div>
          </header>
        </div>
  );
};

export default PortalHeader;