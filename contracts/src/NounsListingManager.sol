// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address op, bool approved) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address who) external view returns (uint256);
}

interface IFWA {
    function listNFT(address collection, uint256 tokenId) external payable returns (uint256);
    function withdrawListing(uint256 listingId) external;
    function relistNFT(uint256 listingId) external payable;
    function updateBacking(uint256 listingId, uint256 newBacking) external payable;
    function depositorReclaimBacking(uint256 listingId) external;
    function depositorReclaimNFT(uint256 listingId) external;
    function finalizeUnsettled(uint256 listingId) external;
    function claimListingFees(uint256[] calldata listingIds) external;
    function activateListings(uint256 count) external;
    function withdrawEarnings() external;
    function recoverStuckNFT(uint256 listingId) external;
}

/// @title NounsListingManager
/// @notice Middleware between the Nouns DAO treasury and FWA (fwa.fun).
///         The operator manages listings but can never choose a destination:
///         Nouns move only treasury -> manager -> FWA and back, terminating at
///         the treasury; ETH moves only into FWA backing or to the treasury;
///         ERC20s move only to the treasury. Reusable across future proposals.
contract NounsListingManager {
    IERC721 public immutable NOUNS;
    IFWA public immutable FWA;
    address public immutable TREASURY;

    address public operator;

    event OperatorSet(address indexed operator);
    event Pulled(uint256[] tokenIds);
    event Listed(uint256 indexed tokenId, uint256 indexed listingId, uint256 backing);
    event NounReturned(uint256 indexed tokenId);
    event SweptETH(uint256 amount);
    event SweptToken(address indexed token, uint256 amount);
    event Executed(address indexed target, uint256 value, bytes data);

    error NotTreasury();
    error NotOperator();

    modifier onlyTreasury() {
        if (msg.sender != TREASURY) revert NotTreasury();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address nouns, address fwa, address treasury, address operator_) {
        NOUNS = IERC721(nouns);
        FWA = IFWA(fwa);
        TREASURY = treasury;
        operator = operator_;
        emit OperatorSet(operator_);
    }

    /// FWA pays settlement proceeds and backing refunds with plain sends.
    receive() external payable {}

    // ---------------------------------------------------------------- treasury

    /// @notice Load Nouns from the treasury. Called as a proposal action after
    ///         setApprovalForAll; a 10-action proposal cannot fit 24 transfers.
    function pull(uint256[] calldata tokenIds) external onlyTreasury {
        for (uint256 i; i < tokenIds.length; ++i) {
            NOUNS.transferFrom(TREASURY, address(this), tokenIds[i]);
        }
        emit Pulled(tokenIds);
    }

    function setOperator(address operator_) external onlyTreasury {
        operator = operator_;
        emit OperatorSet(operator_);
    }

    /// @notice Escape hatch for FWA interface drift. Treasury only, i.e. only
    ///         a passed proposal can use it. The operator never gets this.
    function execute(address target, uint256 value, bytes calldata data)
        external
        onlyTreasury
        returns (bytes memory result)
    {
        bool ok;
        (ok, result) = target.call{value: value}(data);
        require(ok, "EXEC_FAILED");
        emit Executed(target, value, data);
    }

    // ---------------------------------------------------------------- operator

    function list(uint256 tokenId, uint256 backing) external onlyOperator returns (uint256 listingId) {
        NOUNS.approve(address(FWA), tokenId);
        listingId = FWA.listNFT{value: backing}(address(NOUNS), tokenId);
        emit Listed(tokenId, listingId, backing);
    }

    function withdrawListing(uint256 listingId) external onlyOperator {
        FWA.withdrawListing(listingId);
    }

    function relist(uint256 listingId, uint256 topUp) external onlyOperator {
        FWA.relistNFT{value: topUp}(listingId);
    }

    function updateBacking(uint256 listingId, uint256 newBacking, uint256 topUp) external onlyOperator {
        FWA.updateBacking{value: topUp}(listingId, newBacking);
    }

    function reclaimBacking(uint256 listingId) external onlyOperator {
        FWA.depositorReclaimBacking(listingId);
    }

    function reclaimNFT(uint256 listingId) external onlyOperator {
        FWA.depositorReclaimNFT(listingId);
    }

    function recoverStuckNFT(uint256 listingId) external onlyOperator {
        FWA.recoverStuckNFT(listingId);
    }

    /// @notice Exits are operator-gated so a stranger cannot unwind the program
    ///         early; destinations are fixed, so gating costs nothing in trust.
    /// @dev Plain transferFrom: the treasury's onERC721Received returns void
    ///      (nonstandard), so safeTransferFrom to it always reverts. The
    ///      auction house sweeps zero-bid Nouns the same way.
    function returnNouns(uint256[] calldata tokenIds) external onlyOperator {
        for (uint256 i; i < tokenIds.length; ++i) {
            NOUNS.transferFrom(address(this), TREASURY, tokenIds[i]);
            emit NounReturned(tokenIds[i]);
        }
    }

    function sweepETH() external onlyOperator {
        uint256 amount = address(this).balance;
        (bool ok,) = TREASURY.call{value: amount}("");
        require(ok, "SWEEP_FAILED");
        emit SweptETH(amount);
    }

    function sweepToken(address token) external onlyOperator {
        uint256 amount = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transfer(TREASURY, amount), "TOKEN_SWEEP_FAILED");
        emit SweptToken(token, amount);
    }

    // ---------------------------------------------------------------- anyone

    /// Fee claims are pull-pattern on FWA and only ever credit this contract,
    /// so they are safe to leave permissionless for keepers.
    function claimFees(uint256[] calldata listingIds) external {
        FWA.claimListingFees(listingIds);
    }

    function withdrawEarnings() external {
        FWA.withdrawEarnings();
    }

    function finalizeUnsettled(uint256 listingId) external {
        FWA.finalizeUnsettled(listingId);
    }

    function activateListings(uint256 count) external {
        FWA.activateListings(count);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
