package services

import (
    "context"
    "math/big"

    "src/internal/handlers"
    "src/internal/database"
)

type TransactionService struct {
    db database.Service
}

func NewTransactionService(db database.Service) *TransactionService {
    return &TransactionService{
        db: db,
    }
}

func (s *TransactionService) GetAccountSummary(ctx context.Context, accountAddress string) (*handlers.AccountSummary, error) {
    transactions, err := s.db.GetTransactionsByAccount(ctx, accountAddress)
    if err != nil {
        return nil, err
    }

    // Map to store token-specific summaries
    tokenSummaries := make(map[string]*struct {
        minted *big.Int
        burned *big.Int
    })

    totalMinted := new(big.Int)
    totalBurned := new(big.Int)

    // Process all transactions
    for _, tx := range transactions {
        amount := new(big.Int)
        amount.SetString(tx.Amount, 10)

        // Initialize token summary if not exists
        if _, exists := tokenSummaries[tx.TokenAddress]; !exists {
            tokenSummaries[tx.TokenAddress] = &struct {
                minted *big.Int
                burned *big.Int
            }{
                minted: new(big.Int),
                burned: new(big.Int),
            }
        }

        if tx.EventType == "Mint" {
            tokenSummaries[tx.TokenAddress].minted.Add(tokenSummaries[tx.TokenAddress].minted, amount)
            totalMinted.Add(totalMinted, amount)
        } else if tx.EventType == "Burn" {
            tokenSummaries[tx.TokenAddress].burned.Add(tokenSummaries[tx.TokenAddress].burned, amount)
            totalBurned.Add(totalBurned, amount)
        }
    }

    // Create response
    summary := &handlers.AccountSummary{
        AccountAddress: accountAddress,
        Tokens:        make([]handlers.TokenSummary, 0),
        TotalMinted:   weiToEther(totalMinted.String()),
        TotalBurned:   weiToEther(totalBurned.String()),
        NetBalance:    weiToEther(new(big.Int).Sub(totalMinted, totalBurned).String()),
    }

    // Add token-specific summaries
    for tokenAddr, tokenSum := range tokenSummaries {
        balance := new(big.Int).Sub(tokenSum.minted, tokenSum.burned)
        summary.Tokens = append(summary.Tokens, handlers.TokenSummary{
            TokenAddress:   tokenAddr,
            TotalMinted:   weiToEther(tokenSum.minted.String()),
            TotalBurned:   weiToEther(tokenSum.burned.String()),
            CurrentBalance: weiToEther(balance.String()),
        })
    }

    return summary, nil
}

// Helper function to convert wei to ether
func weiToEther(wei string) string {
    weiInt := new(big.Int)
    weiInt.SetString(wei, 10)
    
    divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
    
    etherBig := new(big.Float).SetInt(weiInt)
    etherBig.Quo(etherBig, new(big.Float).SetInt(divisor))
    
    return etherBig.Text('f', 18)
}