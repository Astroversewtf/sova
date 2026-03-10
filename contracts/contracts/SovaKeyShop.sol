// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SovaKeyShop {
    address public owner;
    uint256 public keyPrice;

    event KeysPurchased(address indexed buyer, uint256 quantity, uint256 totalPaid);
    event KeyPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(uint256 _keyPrice) {
        owner = msg.sender;
        keyPrice = _keyPrice;
    }

    function buyKeys(uint256 quantity) external payable {
        require(quantity > 0, "Must buy at least 1");
        require(msg.value == quantity * keyPrice, "Wrong AVAX amount");

        emit KeysPurchased(msg.sender, quantity, msg.value);
    }

    function setKeyPrice(uint256 _newPrice) external {
        require(msg.sender == owner, "Not owner");
        uint256 oldPrice = keyPrice;
        keyPrice = _newPrice;
        emit KeyPriceUpdated(oldPrice, _newPrice);
    }

    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
}
