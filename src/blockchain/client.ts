import { type Chain, createPublicClient, http, defineChain } from "viem";

// Определяем кастомную сеть GoodVibe
export const GoodVibeChain = defineChain({
  id: 22052024,
  name: "GoodVibe",
  nativeCurrency: {
    decimals: 18,
    name: "GoodVibeToken",
    symbol: "GVT",
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_GOODVIBE_CHAIN_RPC],
    },
    public: {
      http: [import.meta.env.VITE_GOODVIBE_CHAIN_RPC],
    },
  },
} as const satisfies Chain);

// Транспорт с авторизацией
const transport = http(import.meta.env.VITE_GOODVIBE_CHAIN_RPC, {
  fetchOptions: {
    headers: {
      Authorization: import.meta.env.VITE_GOODVIBE_CHAIN_RPC_AUTHORIZATION,
    },
  },
});

// Экспорт публичного клиента
export const publicClient = createPublicClient({
  chain: GoodVibeChain,
  transport,
});
