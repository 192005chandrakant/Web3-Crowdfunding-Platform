// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";

contract CampaignFactory {
    address[] public allCampaigns;

    event CampaignCreated(address indexed campaignAddress, address indexed creator, uint256 goal);

    function createCampaign(
        uint256 goal,
        address hospitalAddress,
        string[] memory titles,
        uint256[] memory targetAmounts,
        uint256[] memory deadlines
    ) external returns (address campaignAddress) {
        Campaign campaign = new Campaign(msg.sender, goal, hospitalAddress, titles, targetAmounts, deadlines);
        campaignAddress = address(campaign);
        allCampaigns.push(campaignAddress);
        emit CampaignCreated(campaignAddress, msg.sender, goal);
    }

    function getCampaignCount() external view returns (uint256) {
        return allCampaigns.length;
    }
}