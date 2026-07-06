// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Campaign.sol";

contract CampaignFactory {
    address public implementationContract;
    address[] public allCampaigns;

    event CampaignCreated(address indexed campaignAddress, address indexed creator, uint256 goal);

    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation address");
        implementationContract = _implementation;
    }

    function createCampaign(
        uint256 goal,
        address hospitalAddress,
        string[] memory titles,
        uint256[] memory targetAmounts,
        uint256[] memory deadlines
    ) external returns (address) {
        // Deploy a cheap EIP-1167 proxy clone
        address clone = Clones.clone(implementationContract);
        
        // Initialize the clone
        Campaign(clone).initialize(
            msg.sender,
            goal,
            hospitalAddress,
            titles,
            targetAmounts,
            deadlines
        );

        allCampaigns.push(clone);
        emit CampaignCreated(clone, msg.sender, goal);

        return clone;
    }

    function getCampaignCount() external view returns (uint256) {
        return allCampaigns.length;
    }
}