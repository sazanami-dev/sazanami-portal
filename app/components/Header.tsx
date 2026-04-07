import Link from 'next/link';

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">
          <Link href="/">Sazanami Portal</Link>
        </h1>
        <nav>
          <ul className="flex space-x-4">
            <li>
              <Link href="/" className="hover:text-gray-300">
                Home
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-gray-300">
                About
              </Link>
            </li>
            <li>
              <Link href="/members" className="hover:text-gray-300">
                Members
              </Link>
            </li>
            {/* 必要に応じてリンクを追加 */}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;