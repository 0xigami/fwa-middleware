import { parseAbi, parseAbiItem } from "viem";

export const nounsAbi = parseAbi([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

export const managerAbi = parseAbi([
  "function operator() view returns (address)",
  "function list(uint256 tokenId, uint256 backing) returns (uint256)",
  "function withdrawListing(uint256 listingId)",
  "function returnNouns(uint256[] tokenIds)",
  "function sweepETH()",
  "function claimFees(uint256[] listingIds)",
  "function withdrawEarnings()",
  "function updateBacking(uint256 listingId, uint256 newBacking, uint256 topUp)",
  "function reclaimNFT(uint256 listingId)",
  "function reclaimBackingAndSurrenderNoun(uint256 listingId)",
  "function finalizeUnsettled(uint256 listingId)",
  "function activateListings(uint256 count)",
  "function sweepToken(address token)",
  "function claimDepositorTokens(uint256[] listingIds)",
  "function withdrawRewardTokens()",
]);

export const fwaAbi = parseAbi([
  "function listings(uint256 listingId) view returns (address collection, address depositor, address purchaser, uint256 tokenId, uint256 weight, uint256 value, uint256 feeShare, uint256 feeDebt, uint256 slot, uint64 allocatedAt, uint8 status)",
  "function feeCredit(address depositor) view returns (uint256)",
  "function settlementDiscountBps() view returns (uint256)",
]);

export const evListed = parseAbiItem(
  "event Listed(uint256 indexed tokenId, uint256 indexed listingId, uint256 backing)"
);
export const evNounReturned = parseAbiItem(
  "event NounReturned(uint256 indexed tokenId)"
);
export const evSweptETH = parseAbiItem("event SweptETH(uint256 amount)");

export const evAllocated = parseAbiItem(
  "event NFTAllocated(uint256 indexed requestId, uint256 indexed listingId, address indexed purchaser, address depositor, uint256 value, uint256 randomWord)"
);
export const evKept = parseAbiItem(
  "event NFTKept(uint256 indexed listingId, address indexed purchaser, address indexed depositor, uint256 backing)"
);
export const evBidAccepted = parseAbiItem(
  "event DepositorBidAccepted(uint256 indexed listingId, address indexed purchaser, address indexed depositor, uint256 payout, uint256 retained)"
);
export const evWithdrawn = parseAbiItem(
  "event ListingWithdrawn(uint256 indexed listingId, address indexed depositor, uint256 value)"
);
