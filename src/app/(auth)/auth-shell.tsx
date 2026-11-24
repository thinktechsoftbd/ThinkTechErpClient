import Image from "next/image";
import type { ReactNode } from "react";
import bizoneIcon from "@/assets/brand/bizone-icon.webp";
import { appConfig } from "@/core/config/app";
import { AppFooter } from "@/core/layout/app-footer";
import { BrandLogo } from "@/core/layout/brand-logo";
import { ThemeToggle } from "@/core/theme/theme-toggle";
import { modules } from "@/modules/registry";

/** The sign-in pages' frame: the form on the left, the app's panel on the right (wide screens). */
export function AuthShell({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-white dark:bg-gray-900">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Navy lettering on the light theme, white on the dark one: no tile behind it. */}
          <div className="mb-8">
            <BrandLogo className="w-[220px]" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-800 sm:text-3xl dark:text-white/90">{title}</h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          {children}
          <AppFooter className="mt-10 border-t border-gray-100 pt-4 text-xs dark:border-gray-800" />
        </div>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-brand-950 lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-md px-10 text-center">
          {/* Only the icon: the title below names the product. */}
          <Image
            src={bizoneIcon}
            alt=""
            loading="eager"
            className="mx-auto size-20 rounded-[22%] shadow-lg ring-1 shadow-black/30 ring-white/20"
          />
          <h2 className="mt-6 text-3xl font-semibold text-white">{appConfig.productName}</h2>
          <p className="mt-3 text-brand-200">One console for every part of your business.</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {modules.map((module) => (
              <li
                key={module.key}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80"
              >
                <module.icon className="size-4" aria-hidden />
                {module.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  );
}
