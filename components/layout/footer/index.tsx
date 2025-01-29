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
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0">
          <span className="text-xs sm:text-sm text-gray-500 sm:mr-2 text-center sm:text-left">
            Get the best of our demos using the
          </span>
          <div className="flex items-center">
            <span className="font-medium text-xs sm:text-sm mr-2">
              Didit App
            </span>
            <Link
              className="mr-2"
              href="https://apps.apple.com/es/app/didit/id6468914973"
              tabIndex={0}
              target="_blank"
            >
              <Image
                alt="Download on the App Store"
                className="h-8 sm:h-10 w-auto"
                height={30}
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                width={100}
              />
            </Link>
            <Link
              className="mr-2"
              href="https://play.google.com/store/apps/details?id=me.didit.app&hl=en"
              tabIndex={0}
              target="_blank"
            >
              <Image
                alt="Get it on Google Play"
                className="h-8 sm:h-10 w-auto"
                height={30}
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png"
                width={100}
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
