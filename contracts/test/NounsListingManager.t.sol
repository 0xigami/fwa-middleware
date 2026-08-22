// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {NounsListingManager, IERC721} from "../src/NounsListingManager.sol";

interface IFWAView {
    function listings(uint256 id)
        external
        view
        returns (
            address collection,
            address depositor,
            address purchaser,
            uint256 tokenId,
            uint256 weight,
            uint256 value,
            uint256 feeShare,
            uint256 feeDebt,
            uint256 slot,
            uint64 allocatedAt,
            uint8 status
        );

    function withdrawListing(uint256 id) external;
}

contract NounsListingManagerForkTest is Test {
    address constant NOUNS = 0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03;
    address constant FWA = 0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c;
    address constant TREASURY = 0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71;
    address constant REWARDS = 0x6a1a1C0CfB3D3C538e13D36d608a5bcaa992fc78;
    address constant OPERATOR = 0x387a161C6b25aA854100aBaED39274e51aaffffd; // gami.eth

    // three of the proposal's 24
    uint256 constant N1 = 11;
    uint256 constant N2 = 1980;
    uint256 constant N3 = 1989;

    NounsListingManager mgr;

    function setUp() public virtual {
        vm.createSelectFork(vm.envString("MAINNET_RPC_URL"), 25809242);
        mgr = new NounsListingManager(NOUNS, FWA, REWARDS, TREASURY, OPERATOR, 1 ether);
        vm.deal(TREASURY, TREASURY.balance + 40 ether);
    }

    function _load() internal {
        uint256[] memory ids = new uint256[](3);
        ids[0] = N1;
        ids[1] = N2;
        ids[2] = N3;
        vm.startPrank(TREASURY);
        IERC721(NOUNS).setApprovalForAll(address(mgr), true);
        mgr.pull(ids);
        IERC721(NOUNS).setApprovalForAll(address(mgr), false);
        (bool ok,) = address(mgr).call{value: 5 ether}("");
        require(ok);
        vm.stopPrank();
    }

    function test_loadListWithdrawReturnSweep_fullCycle() public {
        _load();
        assertEq(IERC721(NOUNS).ownerOf(N1), address(mgr));

        vm.prank(OPERATOR);
        uint256 listingId = mgr.list(N1, 1.22 ether);
        mgr.activateListings(50);
        vm.warp(block.timestamp + 3 days);
        vm.roll(block.number + 21_600);

        (,, , uint256 tokenId,, uint256 value,,,,, uint8 status) = IFWAView(FWA).listings(listingId);
        assertEq(tokenId, N1);
        assertEq(value, 1.22 ether);
        assertEq(status, 1); // active

        // withdraw the undrawn listing, Noun and backing come back
        vm.prank(OPERATOR);
        mgr.withdrawListing(listingId);
        assertEq(IERC721(NOUNS).ownerOf(N1), address(mgr));
        assertGt(address(mgr).balance, 4.9 ether); // backing refunded (minus any fee dust)

        // everything home
        uint256[] memory back = new uint256[](3);
        back[0] = N1;
        back[1] = N2;
        back[2] = N3;
        uint256 treasuryEthBefore = TREASURY.balance;
        vm.startPrank(OPERATOR);
        mgr.returnNouns(back);
        mgr.sweepETH();
        vm.stopPrank();

        assertEq(IERC721(NOUNS).ownerOf(N1), TREASURY);
        assertEq(IERC721(NOUNS).ownerOf(N2), TREASURY);
        assertEq(IERC721(NOUNS).ownerOf(N3), TREASURY);
        assertGt(TREASURY.balance, treasuryEthBefore + 4.9 ether);
        assertEq(address(mgr).balance, 0);
    }

    function test_onlyTreasury_pull_setOperator_execute() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = N1;
        vm.expectRevert(NounsListingManager.NotTreasury.selector);
        mgr.pull(ids);
        vm.expectRevert(NounsListingManager.NotTreasury.selector);
        mgr.setOperator(address(0xdead));
        vm.expectRevert(NounsListingManager.NotTreasury.selector);
        mgr.execute(address(0xdead), 0, "");
    }

    function test_onlyOperator_ops() public {
        _load();
        vm.expectRevert(NounsListingManager.NotOperator.selector);
        mgr.list(N1, 1.22 ether);
        vm.expectRevert(NounsListingManager.NotOperator.selector);
        mgr.sweepETH();
        uint256[] memory ids = new uint256[](1);
        ids[0] = N1;
        vm.expectRevert(NounsListingManager.NotOperator.selector);
        mgr.returnNouns(ids);
    }

    function test_operatorCannotChooseDestinations() public {
        _load();
        // the ABI simply has no function taking a destination address the
        // operator can reach; assert sweeps land at the treasury only
        uint256 mgrBal = address(mgr).balance;
        uint256 before = TREASURY.balance;
        vm.prank(OPERATOR);
        mgr.sweepETH();
        assertEq(TREASURY.balance, before + mgrBal);
        assertEq(address(mgr).balance, 0);
    }

    function test_treasuryEscapeHatch() public {
        _load();
        vm.prank(OPERATOR);
        uint256 listingId = mgr.list(N1, 1.22 ether);
        mgr.activateListings(50);
        vm.warp(block.timestamp + 3 days);
        vm.roll(block.number + 21_600);

        // treasury can drive FWA directly through execute()
        vm.prank(TREASURY);
        mgr.execute(FWA, 0, abi.encodeCall(IFWAView.withdrawListing, (listingId)));
        assertEq(IERC721(NOUNS).ownerOf(N1), address(mgr));
    }

    function test_updateBacking_raiseAndLower() public {
        _load();
        vm.startPrank(OPERATOR);
        uint256 listingId = mgr.list(N1, 1.22 ether);
        mgr.activateListings(50);
        vm.warp(block.timestamp + 3 days);
        vm.roll(block.number + 21_600);
        uint256 balBefore = address(mgr).balance;

        mgr.updateBacking(listingId, 2 ether, 0.78 ether);
        (,,,,, uint256 v1,,,,,) = IFWAView(FWA).listings(listingId);
        assertEq(v1, 2 ether);

        mgr.updateBacking(listingId, 1.22 ether, 0);
        (,,,,, uint256 v2,,,,,) = IFWAView(FWA).listings(listingId);
        assertEq(v2, 1.22 ether);
        assertEq(address(mgr).balance, balBefore); // refund came back to manager
        vm.stopPrank();
    }
}
// appended: backing floor
contract BackingFloorTest is NounsListingManagerForkTest {
    function test_backingFloor_blocksCheapListings() public {
        _load();
        vm.startPrank(OPERATOR);
        vm.expectRevert(NounsListingManager.BackingTooLow.selector);
        mgr.list(N1, 0.5 ether);
        uint256 listingId = mgr.list(N1, 1.22 ether);
        mgr.activateListings(50);
        vm.warp(block.timestamp + 3 days);
        vm.roll(block.number + 21_600);
        vm.expectRevert(NounsListingManager.BackingTooLow.selector);
        mgr.updateBacking(listingId, 0.5 ether, 0);
        vm.stopPrank();
    }
}
// appended: pull robustness
contract PullRobustnessTest is NounsListingManagerForkTest {
    function test_pull_skipsStaleIds() public {
        vm.prank(TREASURY);
        IERC721(NOUNS).transferFrom(TREASURY, address(0xbeef), N1);

        uint256[] memory ids = new uint256[](3);
        ids[0] = N1;
        ids[1] = N2;
        ids[2] = N3;
        vm.startPrank(TREASURY);
        IERC721(NOUNS).setApprovalForAll(address(mgr), true);
        mgr.pull(ids);
        vm.stopPrank();

        assertEq(IERC721(NOUNS).ownerOf(N1), address(0xbeef)); // skipped, not reverted
        assertEq(IERC721(NOUNS).ownerOf(N2), address(mgr));
        assertEq(IERC721(NOUNS).ownerOf(N3), address(mgr));
    }
}
// appended: exact proposal actions replay
contract ProposalActionsTest is NounsListingManagerForkTest {
    function setUp() public override {
        vm.createSelectFork(vm.envString("MAINNET_RPC_URL"));
        mgr = new NounsListingManager(NOUNS, FWA, REWARDS, TREASURY, OPERATOR, 1 ether);
        vm.deal(TREASURY, TREASURY.balance + 40 ether);
    }

    function test_exactProposalActions_all24() public {
        uint256[24] memory fixed24 = [uint256(11), 26, 82, 89, 279, 408, 548, 559, 801, 861, 1914, 1917, 1929, 1933, 1942, 1950, 1954, 1957, 1958, 1969, 1980, 1983, 1988, 1989];
        uint256[] memory ids = new uint256[](24);
        for (uint256 i; i < 24; ++i) ids[i] = fixed24[i];

        uint256 mgrBalBefore = address(mgr).balance;
        vm.startPrank(TREASURY);
        // action 1
        IERC721(NOUNS).setApprovalForAll(address(mgr), true);
        // action 2, via raw call with the encoded args from docs/TRANSACTIONS.md
        (bool ok,) = address(mgr).call(abi.encodeWithSignature("pull(uint256[])", ids));
        require(ok, "pull failed");
        // action 3
        IERC721(NOUNS).setApprovalForAll(address(mgr), false);
        // action 4
        (ok,) = address(mgr).call{value: 30 ether}("");
        require(ok, "fund failed");
        vm.stopPrank();

        for (uint256 i; i < 24; ++i) {
            assertEq(IERC721(NOUNS).ownerOf(ids[i]), address(mgr));
        }
        assertEq(address(mgr).balance - mgrBalBefore, 30 ether);

        // and the program is startable: list one at proposal pricing
        vm.prank(OPERATOR);
        mgr.list(11, 1.22 ether);
    }
}
