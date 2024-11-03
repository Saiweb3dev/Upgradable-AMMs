package database

import (
    "time"
    "go.mongodb.org/mongo-driver/bson/primitive"
)

type Transaction struct {
    ID            primitive.ObjectID `bson:"_id,omitempty"`
    AccountAddress string           `bson:"account_address"`
    TokenAddress  string           `bson:"token_address"`
    Amount        string           `bson:"amount"`
    TxHash        string           `bson:"tx_hash"`
    EventType     string           `bson:"event_type"` // "Mint" or "Burn"
    Timestamp     time.Time        `bson:"timestamp"`
    BlockNumber   uint64           `bson:"block_number"`
    BlockHash     string           `bson:"block_hash"`
}

// Model for pool events
type PoolTransaction struct {
    ID            primitive.ObjectID `bson:"_id,omitempty"`
    PoolAddress   string            `bson:"pool_address"`
    Token0Address string            `bson:"token0_address"`
    Token1Address string            `bson:"token1_address"`
    EventType     string            `bson:"event_type"`
    Sender        string            `bson:"sender"`
    Recipient     string            `bson:"recipient,omitempty"`
    Amount0       string            `bson:"amount0"`
    Amount1       string            `bson:"amount1"`
    SqrtPriceX96  string            `bson:"sqrt_price_x96,omitempty"`
    Liquidity     string            `bson:"liquidity,omitempty"`
    Tick          int               `bson:"tick,omitempty"`
    TxHash        string            `bson:"tx_hash"`
    BlockNumber   uint64            `bson:"block_number"`
    BlockHash     string            `bson:"block_hash"`
    Timestamp     time.Time         `bson:"timestamp"`
}