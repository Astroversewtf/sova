// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract SovaJackpot is VRFConsumerBaseV2Plus {
    uint256 public s_subscriptionId;
    bytes32 public s_keyHash;
    uint32 public s_callbackGasLimit = 100000;
    uint16 public s_requestConfirmations = 3;

    struct SeedRequest {
        address player;
        bool fulfilled;
        uint256 seed;
        uint256 timestamp;
    }

    mapping(uint256 => SeedRequest) public requests;
    mapping(address => uint256[]) public playerRequests;

    event SeedRequested(uint256 indexed requestId, address indexed player);
    event SeedFulfilled(uint256 indexed requestId, address indexed player, uint256 seed);

    constructor(
        address vrfCoordinator,
        uint256 subscriptionId,
        bytes32 keyHash
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        s_subscriptionId = subscriptionId;
        s_keyHash = keyHash;
    }

    function requestSeed(address player) external onlyOwner returns (uint256 requestId) {
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: s_requestConfirmations,
                callbackGasLimit: s_callbackGasLimit,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        requests[requestId] = SeedRequest({
            player: player,
            fulfilled: false,
            seed: 0,
            timestamp: 0
        });

        playerRequests[player].push(requestId);

        emit SeedRequested(requestId, player);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        SeedRequest storage req = requests[requestId];
        require(req.player != address(0), "Request not found");

        req.fulfilled = true;
        req.seed = randomWords[0];
        req.timestamp = block.timestamp;

        emit SeedFulfilled(requestId, req.player, req.seed);
    }

    function getResult(uint256 requestId) external view returns (
        address player,
        bool fulfilled,
        uint256 seed,
        uint256 timestamp
    ) {
        SeedRequest storage req = requests[requestId];
        return (req.player, req.fulfilled, req.seed, req.timestamp);
    }

    function getPlayerRequests(address player) external view returns (uint256[] memory) {
        return playerRequests[player];
    }

    function setCallbackGasLimit(uint32 _gasLimit) external onlyOwner {
        s_callbackGasLimit = _gasLimit;
    }

    function setRequestConfirmations(uint16 _confirmations) external onlyOwner {
        s_requestConfirmations = _confirmations;
    }
}
