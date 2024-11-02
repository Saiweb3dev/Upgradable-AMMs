package blockchain

import (
    "encoding/json"
    "os"
    "path/filepath"
		"fmt"
)

type TokenConfig struct {
    Address string          `json:"address"`
    ABI     json.RawMessage `json:"abi"`
}

func LoadTokenConfig(filename string) (*TokenConfig, error) {
    // Get the current working directory
    cwd, err := os.Getwd()
    if err != nil {
        return nil, err
    }

    // Navigate up one level if we're in the src directory
    if filepath.Base(cwd) == "src" {
        cwd = filepath.Dir(cwd)
    }

    // Construct the path to the deployments directory
    path := filepath.Join(cwd, "deployments", "hardhat", filename)
    
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read config file %s: %v", path, err)
    }

    var config TokenConfig
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("failed to parse config file %s: %v", path, err)
    }

    return &config, nil
}