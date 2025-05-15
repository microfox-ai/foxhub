'use client';
import { APP_ROUTES } from '@/utils/constants/appInfo';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ResourcesContent } from './ResourcesContent';
import { ProductsContent } from './ProductsContent';
import media from '@/styles/media';
import { useMediaQuery } from '@mui/material';
import { FilloutFormIds, useFilloutPopup } from '../FilloutPopupProvider';
import Link from 'next/link';
import { AppButton, useAppButton } from './AppButton';

const NewHeader = () => {
  const [showDropdown, setShowDropdown] = useState({
    publicBots: false,
    pricing: false,
  });
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const { openForm } = useFilloutPopup();

  const { handleButtonClick } = useAppButton();
  const closeDropdowns = () => {
    setShowDropdown({ publicBots: false, pricing: false });
  };

  const isLaptopOrLess = useMediaQuery(media.laptop);

  useEffect(() => {
    if (open) {
      setOpen(false);
    }
  }, [isLaptopOrLess]);


  return (
    <div
      className={`fixed top-0 z-[100] w-full ${open && 'bg-black/60'} lg:backdrop-blur-sm`}
    >
      <div
        className={`relative mx-2 my-0 mt-2 flex items-center justify-between lg:mx-6 lg:my-6 lg:bg-transparent ${open && isLaptopOrLess && 'mb-0 rounded-t-lg rounded-tr-lg !bg-black'}`}
      >
        <div className="flex h-12 max-w-fit items-center justify-between rounded-lg bg-black px-2 text-white">
          <Link
            className="flex items-center gap-3 max-lg:gap-0"
            href={"/"}
          >
            <Image
              src="/logo-filled.png"
              alt="logo"
              height={36}
              width={32}
            />
            <p className="px-2 py-2 text-sm font-semibold max-lg:hidden">
              Microfox
            </p>
          </Link>
          <NavigationMenu delayDuration={0} className="max-lg:hidden">
            <NavigationMenuList className="">
              <>
                {/* <NavigationMenuItem className="">
                    <NavigationMenuTrigger className="bg-black hover:!bg-[#414a4c] hover:text-white">
                      <div className="text-sm">Resources</div>
                      <NavigationMenuContent className=" w-full border-none p-0">
                        <ResourcesContent />
                      </NavigationMenuContent>
                    </NavigationMenuTrigger>
                  </NavigationMenuItem> */}
                {/* <NavigationMenuItem>
                    <NavigationMenuTrigger className="bg-black hover:!bg-[#414a4c] hover:text-white">
                      <div className="text-sm">Products</div>
                      <NavigationMenuContent className=" w-full border-none p-0">
                        <ProductsContent />
                      </NavigationMenuContent>
                    </NavigationMenuTrigger>
                  </NavigationMenuItem> */}
              </>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex h-12 max-w-fit items-center justify-between gap-3 rounded-lg bg-black px-2 text-white max-lg:gap-0">

          <>
            <div className="flex items-center">
              <MenuItem label="Pricing" to="/pricing" />
              {/* <Link
                href={'https://portal.themoondevs.com'}
                className="cursor-pointer rounded-md border-2 border-transparent px-2 py-2 text-sm font-semibold transition-colors duration-300 ease-in-out hover:bg-[#414a4c] max-lg:hidden"
              // onClick={() => handleGoogleSignIn('/')}
              >
                Sign In
              </Link> */}
            </div>
            <CustomButton label="Enter App" onClick={handleButtonClick} />
          </>
          {/* Hamburger */}
          <button
            className="hidden px-1 py-2 max-lg:block"
            onClick={() => setOpen(!open)}
          >
            <span className="material-symbols-outlined !text-2xl">
              {!open ? 'menu' : 'close'}
            </span>
          </button>
        </div>
      </div>
      {open && isLaptopOrLess && (
        <HamBurger />
      )}
    </div>
  );
};

export default NewHeader;

const HamBurger = () => {
  const path = usePathname();
  const { openForm } = useFilloutPopup();

  return (
    <div className="h-dvh overflow-y-scroll rounded-bl-lg rounded-br-lg pb-16">
      <div className="mx-2 my-[-10px] bg-black px-5 py-4 text-white lg:mx-6 lg:my-0">
        <>
          <Accordion className="w-full" type="single" defaultValue={'resources'}>
            <AccordionItem value="resources" className="w-full border-none">
              <AccordionTrigger
                className="text-left text-2xl font-bold"
              >
                Resources
              </AccordionTrigger>
              <AccordionContent className="w-full bg-white text-base text-neutral-600">
                <ResourcesContent orientation="mobile" className="bg-white" />
              </AccordionContent>
            </AccordionItem>
            {/* <AccordionItem value="products" className="w-full border-none">
                <AccordionTrigger
                  className="text-left text-2xl font-bold"
                  arrowStyle="text-white h-6 w-6"
                >
                  Products
                </AccordionTrigger>
                <AccordionContent className="w-full bg-white text-base text-neutral-600">
                  <ProductsContent
                    className="w-full p-2"
                    orientation="mobile"
                  />
                </AccordionContent>
              </AccordionItem> */}

            <div className="mt-8">
              <AppButton />
            </div>
            <div className="mt-6 flex items-center gap-4 border-t-[1px] border-gray-300 py-4 max-sm:flex-col max-sm:gap-2 max-sm:py-2">
              <button
                onClick={() => openForm(FilloutFormIds.BookCall)}
                className="w-full rounded-md bg-white py-2 text-sm font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white max-sm:w-full"
                style={{ border: '2px solid white' }}
              >
                Book a Call
              </button>
            </div>
          </Accordion>
        </>
        <>
          <p className="flex items-center justify-between py-2 text-2xl font-bold max-sm:text-lg">
            Public Bots{' '}
            <span className="material-symbols-outlined">
              keyboard_arrow_down
            </span>
          </p>
          <p className="flex items-center justify-between py-2 text-2xl font-bold max-sm:text-lg">
            Resources
            <span className="material-symbols-outlined">
              keyboard_arrow_down
            </span>
          </p>
          <p className="py-2 text-2xl font-bold max-sm:text-lg">Pricing</p>
          <div className="mt-6 flex items-center gap-4 border-t-[1px] border-gray-300 py-4 max-sm:flex-col max-sm:gap-2 max-sm:py-2">
            <button
              className="w-1/2 rounded-md bg-white py-2 text-sm font-semibold text-black max-sm:w-full"
              style={{ border: '2px solid white' }}
            >
              View Demo
            </button>
            <Link
              href={'https://portal.themoondevs.com'}
              className="w-1/2 rounded-md bg-black py-2 text-sm font-semibold text-white max-sm:w-full"
              style={{ border: '2px solid white' }}
            // onClick={() =>
            //   handleGoogleSignIn &&
            //   handleGoogleSignIn('/products/custom-bots')
            // }
            >
              Sign In
            </Link>
          </div>
        </>
      </div>

    </div>
  );
};

const CustomButton = ({ label, onClick }: { label: string, onClick?: () => void }) => {
  return (
    <button
      onClick={onClick}
      className="hover:shadow-hover:shadow-gray-400 flex transform items-center justify-center rounded-lg !bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:translate-x-0.5 max-lg:hidden">
      {label}
    </button>
  );
};

interface MenuItemProps {
  label: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  to?: string;
}

const MenuItem = ({ label, onMouseEnter, onMouseLeave, to }: MenuItemProps) => {
  return (
    <Link
      href={to || '#'}
      className="cursor-pointer rounded-md border-2 border-transparent px-2 py-2 text-sm font-semibold transition-colors duration-300 ease-in-out hover:bg-[#414a4c] max-lg:hidden"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {label}
    </Link>
  );
};
