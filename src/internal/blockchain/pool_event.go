package blockchain

import (
    "github.com/ethereum/go-ethereum/common"
    "github.com/ethereum/go-ethereum/core/types"
    "math/big"
)

type PoolEvent struct {
    TransactionHash common.Hash
    BlockNumber     uint64
    BlockHash       common.Hash
    EventType       string    // "Mint", "Burn", "Swap", "Collect", "Flash"
    PoolAddress     string
    Token0Address   string
    Token1Address   string
    Sender         string
    Recipient      string
    Amount0        *big.Int
    Amount1        *big.Int
    SqrtPriceX96   *big.Int
    Liquidity      *big.Int
    Tick           int
    Timestamp      uint64
}

func ParsePoolEvent(log types.Log, contractABI string) (*PoolEvent, error) {
    event := &PoolEvent{
        TransactionHash: log.TxHash,
        BlockNumber:     log.BlockNumber,
        BlockHash:       log.BlockHash,
        PoolAddress:     log.Address.Hex(),
    }

    // Parse based on event signature
    switch log.Topics[0].Hex() {
    case "0x7a53080ba414158be7ec69b987b5fb7d07dee101fe85488f0853ae16239d0bde": // Mint
        event.EventType = "Mint"
        event.Sender = common.HexToAddress(log.Topics[1].Hex()).Hex()
        // Parse other mint-specific data...

    case "0x0c396cd989a39f4459b5fa1aed6a9a8dcdbc45908acfd67e028cd568da98982c": // Burn
        event.EventType = "Burn"
        event.Sender = common.HexToAddress(log.Topics[1].Hex()).Hex()
        // Parse other burn-specific data...

    case "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67": // Swap
        event.EventType = "Swap"
        event.Sender = common.HexToAddress(log.Topics[1].Hex()).Hex()
        event.Recipient = common.HexToAddress(log.Topics[2].Hex()).Hex()
        // Parse other swap-specific data...

    // Add cases for Collect and Flash events...
    }

    return event, nil
}