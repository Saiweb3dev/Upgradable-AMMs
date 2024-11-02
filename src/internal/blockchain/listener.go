package blockchain

import (
	"context"
	"log"
	"fmt"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type EventListener struct {
	client          *ethclient.Client
	token1Config    *TokenConfig
	token2Config    *TokenConfig
}

func NewEventListener() (*EventListener, error) {
	// Load token configurations
	token1Config, err := LoadTokenConfig("Token1.json")
	if err != nil {
		return nil, fmt.Errorf("failed to load Token1 config: %v", err)
	}

	token2Config, err := LoadTokenConfig("Token2.json")
	if err != nil {
		return nil, fmt.Errorf("failed to load Token2 config: %v", err)
	}

	return &EventListener{
		token1Config: token1Config,
		token2Config: token2Config,
	}, nil
}

func (el *EventListener) connect() error {
	// Use WebSocket URL for local Hardhat node
	client, err := ethclient.Dial("ws://localhost:8545")
	if err != nil {
		return err
	}
	el.client = client
	return nil
}

func (el *EventListener) Start(ctx context.Context) error {
	if err := el.connect(); err != nil {
		return fmt.Errorf("failed to connect to the Ethereum client: %v", err)
	}

	// Create filter query for both tokens
	query := ethereum.FilterQuery{
		Addresses: []common.Address{
			common.HexToAddress(el.token1Config.Address),
			common.HexToAddress(el.token2Config.Address),
		},
		Topics: [][]common.Hash{
			{
				common.HexToHash("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"), // Transfer event
			},
		},
	}

	logs := make(chan types.Log)
	sub, err := el.client.SubscribeFilterLogs(ctx, query, logs)
	if err != nil {
		return fmt.Errorf("failed to subscribe to contract events: %v", err)
	}

	log.Printf("Started listening for events on tokens: %s, %s", 
		el.token1Config.Address, 
		el.token2Config.Address)

	el.handleEvents(ctx, sub, logs)
	return nil
}

func (el *EventListener) handleEvents(ctx context.Context, sub ethereum.Subscription, logs chan types.Log) {
	for {
		select {
		case err := <-sub.Err():
			log.Printf("Error in event subscription: %v", err)
			return
		case vLog := <-logs:
			el.processEvent(vLog)
		case <-ctx.Done():
			return
		}
	}
}

func (el *EventListener) processEvent(log types.Log) {
	var contractABI string
	switch log.Address.Hex() {
	case el.token1Config.Address:
		contractABI = string(el.token1Config.ABI)
	case el.token2Config.Address:
		contractABI = string(el.token2Config.ABI)
	}

	event, err := ParseEvent(log, contractABI)
	if err != nil {
		fmt.Printf("Failed to parse event: %v\n", err)
		return
	}

	if event.EventType == "" {
		return // Skip if not a mint or burn event
	}

	fmt.Printf("\nNew %s event received:\n", event.EventType)
	fmt.Printf("Token Address: %s\n", event.TokenAddress)
	fmt.Printf("Account: %s\n", event.Account)
	fmt.Printf("Amount: %s\n", event.Amount.String())
	fmt.Printf("Transaction Hash: %s\n", event.TransactionHash.Hex())
	fmt.Printf("Block Number: %d\n", event.BlockNumber)
	fmt.Printf("Block Hash: %s\n", event.BlockHash.Hex())
}