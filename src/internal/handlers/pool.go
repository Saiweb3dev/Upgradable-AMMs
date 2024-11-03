package handlers

import (
    "context"
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
)

type PoolStatus struct {
    PoolAddress    string    `json:"pool_address"`
    Token0Address  string    `json:"token0_address"`
    Token1Address  string    `json:"token1_address"`
    CurrentPrice   string    `json:"current_price"`
    TVL           string    `json:"tvl"`
    Volume24h     string    `json:"volume_24h"`
    TotalSwaps    int64     `json:"total_swaps"`
    TotalMints    int64     `json:"total_mints"`
    TotalBurns    int64     `json:"total_burns"`
    LastUpdated   time.Time `json:"last_updated"`
}

type PoolService interface {
    GetPoolStatus(ctx context.Context, poolAddress string) (*PoolStatus, error)
}

type PoolHandler struct {
    service PoolService
}

func NewPoolHandler(service PoolService) *PoolHandler {
    return &PoolHandler{
        service: service,
    }
}

func (h *PoolHandler) GetPoolStatus(c *gin.Context) {
    poolAddress := c.Param("address")
    if poolAddress == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "pool address is required"})
        return
    }

    status, err := h.service.GetPoolStatus(c.Request.Context(), poolAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, status)
}