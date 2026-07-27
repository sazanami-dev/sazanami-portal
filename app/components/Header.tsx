import Link from 'next/link';
import Image from 'next/image';
import { navLinks } from './nav-links';
import MobileNav from './MobileNav';

// Server Component。クライアント状態が要るモバイルメニューだけを
// MobileNav（Client Component）に分離している。
const Header = () => {
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
            <MobileNav />
          </div>

        </div>
      </header>
    </div>
  );
};

export default Header;
