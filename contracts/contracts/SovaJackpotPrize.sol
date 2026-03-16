// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SovaJackpotPrize {
    using ECDSA for bytes32;

    address public owner;
    address public signer;

    mapping(uint256 => bool) public claimed;

    event JackpotClaimed(address indexed player, uint256 requestId, uint256 amount);

    constructor(address _signer) {
        owner = msg.sender;
        signer = _signer;
    }

    function claimJackpot(uint256 requestId, bytes calldata signature) external {
        require(!claimed[requestId], "Already claimed");
        require(address(this).balance > 0, "No prize available");

        bytes32 hash = keccak256(abi.encodePacked(msg.sender, requestId));
        bytes32 ethHash = hash.toEthSignedMessageHash();
        require(ethHash.recover(signature) == signer, "Invalid signature");

        uint256 prize = address(this).balance;
        claimed[requestId] = true;
        payable(msg.sender).transfer(prize);

        emit JackpotClaimed(msg.sender, requestId, prize);
    }

    function setSigner(address _signer) external {
        require(msg.sender == owner, "Not owner");
        signer = _signer;
    }

    receive() external payable {}

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
