import type { Address } from "viem";

export const NOUNS_TOKEN: Address = "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03";
export const TREASURY: Address = "0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71";
export const FWA_CORE: Address = "0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c";

const managerEnv = process.env.NEXT_PUBLIC_MANAGER_ADDRESS ?? "";
export const MANAGER: Address | undefined = /^0x[0-9a-fA-F]{40}$/.test(managerEnv)
  ? (managerEnv as Address)
  : undefined;

export const START_BLOCK: bigint | undefined = process.env.NEXT_PUBLIC_START_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_START_BLOCK)
  : undefined;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC || "https://ethereum-rpc.publicnode.com";

export const PYRAMID_ROWS: number[][] = [
  [11],
  [26, 82, 89],
  [279, 408, 548, 559, 801, 861],
  [1914, 1917, 1929, 1933, 1942, 1950, 1954],
  [1957, 1958, 1969, 1980, 1983, 1988, 1989],
];

export const ALL_IDS: number[] = PYRAMID_ROWS.flat();

export function shortAddr(a: string): string {
  return a.slice(0, 6) + "..." + a.slice(-4);
}
