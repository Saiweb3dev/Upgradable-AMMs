package database

import (
    "context"
)

type Service interface {
    Health() map[string]string
    SaveTransaction(ctx context.Context, tx *Transaction) error
    GetTransactionsByAccount(ctx context.Context, accountAddress string) ([]*Transaction, error)
    GetTransactionsByToken(ctx context.Context, tokenAddress string) ([]*Transaction, error)
    SavePoolTransaction(ctx context.Context, tx *PoolTransaction) error
    GetPoolTransactions(ctx context.Context, poolAddress string) ([]*PoolTransaction, error)
    Close(ctx context.Context) error
}