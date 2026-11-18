import Image from "next/image";
import bizoneLogoTrimmedDark from "@/assets/brand/bizone-logo-trimmed-dark.webp";
import bizoneLogoTrimmed from "@/assets/brand/bizone-logo-trimmed.webp";
import { appConfig } from "@/core/config/app";
import { cn } from "@/core/utils/cn";

/**
 * The product's full logo with its slogan, transparent on either theme: navy lettering on the light theme, white
 * lettering (and a white ERP badge) on the dark one. Both images are trimmed to the artwork; size it by width.
 */
export function BrandLogo({ className }: { className?: string }) {
  const alt = `${appConfig.productName}: ${appConfig.productSlogan}`;
  return (
    <>
      <Image src={bizoneLogoTrimmed} alt={alt} loading="eager" className={cn("h-auto dark:hidden", className)} />
      <Image src={bizoneLogoTrimmedDark} alt={alt} loading="eager" className={cn("hidden h-auto dark:block", className)} />
    </>
  );
}
