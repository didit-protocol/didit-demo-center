import Link from "next/link";
import Image from "next/image";

export const Footer = () => {
  return (
    <footer className="border-t border-gray-200 py-4 sm:py-6 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 flex flex-col items-center space-y-4 sm:space-y-0 sm:flex-row sm:justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Image
            width={60}
            height={30}
            className="w-[60px] sm:w-[72px]"
            src="/didit-logo-wordmark-black.svg"
            alt="Didit"
            priority
          />
          <span className="text-[10px] sm:text-xs text-gray-500">© COPYRIGHT DIDIT 2025</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0">
          <span className="text-xs sm:text-sm text-gray-500 sm:mr-2 text-center sm:text-left">
            Get the best of our demos using the
          </span>
          <div className="flex items-center">
            <span className="font-medium text-xs sm:text-sm mr-2">Didit App</span>
            <Link
              href="https://apps.apple.com/es/app/didit/id6468914973"
              className="mr-2"
              tabIndex={0}
              target="_blank"
            >
              <Image
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                width={100}
                height={30}
                className="h-8 sm:h-10 w-auto"
              />
            </Link>
            <Link
              href="https://play.google.com/store/apps/details?id=me.didit.app&hl=en"
              className="mr-2"
              tabIndex={0}
              target="_blank"
            >
              <Image
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png"
                alt="Get it on Google Play"
                width={100}
                height={30}
                className="h-8 sm:h-10 w-auto"
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
