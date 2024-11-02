package handlers

import (
    
)

type TransactionResponse struct {
    ID            string    `json:"id"`
    AccountAddress string    `json:"account_address"`
    TokenAddress  string    `json:"token_address"`
    Amount        string    `json:"amount"`
    AmountInEther string    `json:"amount_in_ether"`
    TxHash        string    `json:"tx_hash"`
    EventType     string    `json:"event_type"`
    Timestamp     string    `json:"timestamp"`
    BlockNumber   uint64    `json:"block_number"`
    BlockHash     string    `json:"block_hash"`
}

type TokenSummary struct {
    TokenAddress   string `json:"token_address"`
    TotalMinted   string `json:"total_minted"`
    TotalBurned   string `json:"total_burned"`
    CurrentBalance string `json:"current_balance"`
}

type AccountSummary struct {
    AccountAddress string         `json:"account_address"`
    Tokens        []TokenSummary `json:"tokens"`
    TotalMinted   string         `json:"total_minted"`
    TotalBurned   string         `json:"total_burned"`
    NetBalance    string         `json:"net_balance"`
}