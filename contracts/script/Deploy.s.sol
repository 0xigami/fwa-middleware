// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {NounsListingManager} from "../src/NounsListingManager.sol";

/// Production deploy: forge script script/Deploy.s.sol --broadcast --verify
/// Dry-run instance: override COLLECTION / TREASURY / OPERATOR / MIN_BACKING via env.
contract Deploy is Script {
    function run() external {
        address collection = vm.envOr("COLLECTION", 0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03); // Nouns
        address fwa = 0xB276F62DB0ce8CA2Ca5bc522695bE604521eAc1c;
        address rewards = 0x6a1a1C0CfB3D3C538e13D36d608a5bcaa992fc78;
        address treasury = vm.envOr("TREASURY", 0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71); // Nouns timelock
        address operator = vm.envOr("OPERATOR", 0x387a161C6b25aA854100aBaED39274e51aaffffd); // gami.eth
        uint256 minBacking = vm.envOr("MIN_BACKING", uint256(1 ether));

        require(operator != address(0), "zero operator");
        require(treasury != address(0), "zero treasury");

        vm.startBroadcast();
        NounsListingManager mgr = new NounsListingManager(collection, fwa, rewards, treasury, operator, minBacking);
        vm.stopBroadcast();

        require(mgr.operator() == operator, "operator readback");
        require(mgr.MIN_BACKING() == minBacking, "minBacking readback");
        console2.log("NounsListingManager:", address(mgr));
    }
}
