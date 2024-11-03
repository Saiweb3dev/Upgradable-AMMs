package services

import (
    "context"
    "math/big"
    "time"
    "src/internal/database"
    "src/internal/handlers"
)

type PoolService struct {
    db database.Service
}

func NewPoolService(db database.Service) *PoolService {
    return &PoolService{
        db: db,
    }
}

func (s *PoolService) GetPoolStatus(ctx context.Context, poolAddress string) (*handlers.PoolStatus, error) {
    // Get all pool transactions for the last 24 hours
    transactions, err := s.db.GetPoolTransactions(ctx, poolAddress)
    if err != nil {
        return nil, err
    }

    status := &handlers.PoolStatus{
        PoolAddress:  poolAddress,
        LastUpdated: time.Now(),
    }

    // Calculate basic metrics
    volume24h := new(big.Int)
    now := time.Now()
    twentyFourHoursAgo := now.Add(-24 * time.Hour)

    for _, tx := range transactions {
        // Set token addresses from the first transaction
        if status.Token0Address == "" {
            status.Token0Address = tx.Token0Address
            status.Token1Address = tx.Token1Address
        }

        // Count events by type
        switch tx.EventType {
        case "Swap":
            status.TotalSwaps++
            // Add to 24h volume if within time window
            if tx.Timestamp.After(twentyFourHoursAgo) {
                amount0 := new(big.Int)
                amount0.SetString(tx.Amount0, 10)
                volume24h.Add(volume24h, amount0)
            }
        case "Mint":
            status.TotalMints++
        case "Burn":
            status.TotalBurns++
        }
    }

    // Convert volume to string
    status.Volume24h = volume24h.String()

    // Set a placeholder current price (you'll need to implement actual price calculation)
    status.CurrentPrice = "1.0"

    // Set a placeholder TVL (you'll need to implement actual TVL calculation)
    status.TVL = "0"

    return status, nil
}