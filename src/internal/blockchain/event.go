package blockchain

import (
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"math/big"
)

type Event struct {
	TransactionHash common.Hash
	BlockNumber     uint64
	BlockHash       common.Hash
	EventType       string    // "Mint" or "Burn"
	TokenAddress    string    // Which token contract
	Account         string    // Address involved in the event
	Amount          *big.Int  // Amount minted or burned
}

func ParseEvent(log types.Log, contractABI string) (*Event, error) {
	// Basic event info
	event := &Event{
		TransactionHash: log.TxHash,
		BlockNumber:     log.BlockNumber,
		BlockHash:       log.BlockHash,
		TokenAddress:    log.Address.Hex(),
	}

	// Parse based on event signature
	switch log.Topics[0].Hex() {
	case "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": // Transfer event
		if log.Topics[1] == common.HexToHash("0x0000000000000000000000000000000000000000000000000000000000000000") {
			// Mint event (from address is 0x0)
			event.EventType = "Mint"
			event.Account = common.HexToAddress(log.Topics[2].Hex()).Hex()
		} else if log.Topics[2] == common.HexToHash("0x0000000000000000000000000000000000000000000000000000000000000000") {
			// Burn event (to address is 0x0)
			event.EventType = "Burn"
			event.Account = common.HexToAddress(log.Topics[1].Hex()).Hex()
		}
		
		// Parse amount from data
		amount := new(big.Int)
		amount.SetBytes(log.Data)
		event.Amount = amount
	}

	return event, nil
}