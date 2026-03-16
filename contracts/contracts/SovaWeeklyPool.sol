// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SovaWeeklyPool {
    using ECDSA for bytes32;

    address public owner;
    address public signer;
    uint256 public currentWeek;

    mapping(address => mapping(uint256 => bool)) public claimed;

    event RewardClaimed(address indexed player, uint256 week, uint256 amount);
    event WeekAdvanced(uint256 newWeek);

    constructor(address _signer) {
        owner = msg.sender;
        signer = _signer;
        currentWeek = 1;
    }

    function claimReward(uint256 week, uint256 amount, bytes calldata signature) external {
        require(week <= currentWeek, "Week not ended");
        require(!claimed[msg.sender][week], "Already claimed");

        bytes32 hash = keccak256(abi.encodePacked(msg.sender, week, amount));
        bytes32 ethHash = hash.toEthSignedMessageHash();
        require(ethHash.recover(signature) == signer, "Invalid signature");

        claimed[msg.sender][week] = true;
        payable(msg.sender).transfer(amount);

        emit RewardClaimed(msg.sender, week, amount);
    }

    function advanceWeek() external {
        require(msg.sender == owner, "Not owner");
        currentWeek++;
        emit WeekAdvanced(currentWeek);
    }

    receive() external payable {}

    function setSigner(address _signer) external {
        require(msg.sender == owner, "Not owner");
        signer = _signer;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
