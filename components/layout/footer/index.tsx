import Link from "next/link";
import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="border-t border-gray-200 py-4 sm:py-6 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col items-center space-y-4 sm:space-y-0 sm:flex-row sm:justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Image
            priority
            alt="Didit"
            className="w-[60px] sm:w-[72px]"
            height={30}
            src="/didit-logo-wordmark-black.svg"
            width={60}
          />
          <span className="text-[10px] sm:text-xs text-gray-500">
            © COPYRIGHT DIDIT 2025
          </span>
        </div>
      </div>
    </footer>
  );
};
