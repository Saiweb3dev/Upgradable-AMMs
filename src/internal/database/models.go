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