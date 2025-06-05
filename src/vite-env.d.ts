/// <reference types="vite/client" />

declare module "virtual:pwa-register" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function registerSW(options?: any): void;
}
