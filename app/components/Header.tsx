import Link from 'next/link';
import Image from 'next/image';

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
      <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
          <Image 
            src="/sazanami_dev.svg"
            alt = "Sazanami Logo"
            width={200}
            height={200}
            >
              </Image>
            </Link>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="hover:text-gray-300">
                Home
              </Link>
            </li>
            {/* <li>
              <Link href="/about" className="hover:text-gray-300">
                About
              </Link>
            </li> */}
            <li>
              <Link href="/members" className="hover:text-gray-300">
                Members
              </Link>
            </li>
            <li>
              <Link href="/term" className="hover:text-gray-300">
                Term
              </Link>
            </li>
            {/* 必要に応じてリンクを追加 */}
          </ul>
        </nav>
      </div>
    </header>
    </div>
  );
};

export default Header;