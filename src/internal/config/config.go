package config

type BlockchainConfig struct {
	NodeURL         string
	ContractAddress string
}

func GetBlockchainConfig() BlockchainConfig {
	return BlockchainConfig{
		NodeURL:         "http://localhost:8545",
		ContractAddress: "YOUR_CONTRACT_ADDRESS",
	}
}