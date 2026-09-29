// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Anchor {
    mapping(bytes32 => uint256) public anchoredAt;

    event RootAnchored(bytes32 indexed merkleRoot, uint256 timestamp);

    function submitMerkleRoot(bytes32 merkleRoot) external {
        anchoredAt[merkleRoot] = block.timestamp;
        emit RootAnchored(merkleRoot, block.timestamp);
    }

    function verifyAnchor(bytes32 merkleRoot) external view returns (bool) {
        return anchoredAt[merkleRoot] != 0;
    }
}
