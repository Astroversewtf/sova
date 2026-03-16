// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SovaSplitter {
    address public owner;
    address public jackpotContract;
    address public weeklyPoolContract;
    address public teamWallet;

    uint256 public jackpotShare;   // ex: 60
    uint256 public weeklyShare;    // ex: 30
    uint256 public teamShare;      // ex: 10

    event Split(uint256 total, uint256 toJackpot, uint256 toWeekly, uint256 toTeam);

    constructor(
        address _jackpot,
        address _weeklyPool,
        address _teamWallet,
        uint256 _jackpotShare,
        uint256 _weeklyShare,
        uint256 _teamShare
    ) {
        require(_jackpotShare + _weeklyShare + _teamShare == 100, "Must equal 100");
        owner = msg.sender;
        jackpotContract = _jackpot;
        weeklyPoolContract = _weeklyPool;
        teamWallet = _teamWallet;
        jackpotShare = _jackpotShare;
        weeklyShare = _weeklyShare;
        teamShare = _teamShare;
    }

    receive() external payable {
        _split(msg.value);
    }

    function _split(uint256 amount) internal {
        uint256 toJackpot = (amount * jackpotShare) / 100;
        uint256 toWeekly = (amount * weeklyShare) / 100;
        uint256 toTeam = amount - toJackpot - toWeekly;

        payable(jackpotContract).transfer(toJackpot);
        payable(weeklyPoolContract).transfer(toWeekly);
        payable(teamWallet).transfer(toTeam);

        emit Split(amount, toJackpot, toWeekly, toTeam);
    }

    function setShares(uint256 _jackpot, uint256 _weekly, uint256 _team) external {
        require(msg.sender == owner, "Not owner");
        require(_jackpot + _weekly + _team == 100, "Must equal 100");
        jackpotShare = _jackpot;
        weeklyShare = _weekly;
        teamShare = _team;
    }

    function setAddresses(address _jackpot, address _weeklyPool, address _teamWallet) external {
        require(msg.sender == owner, "Not owner");
        jackpotContract = _jackpot;
        weeklyPoolContract = _weeklyPool;
        teamWallet = _teamWallet;
    }
}
