package handlers

import (
    "context"
    "net/http"
    "github.com/gin-gonic/gin"
)

type TransactionService interface {
    GetAccountSummary(ctx context.Context, accountAddress string) (*AccountSummary, error)
}

type TransactionHandler struct {
    service TransactionService
}

func NewTransactionHandler(service TransactionService) *TransactionHandler {
    return &TransactionHandler{
        service: service,
    }
}

func (h *TransactionHandler) GetAccountSummary(c *gin.Context) {
    accountAddress := c.Param("address")
    if accountAddress == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
        return
    }

    summary, err := h.service.GetAccountSummary(c.Request.Context(), accountAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, summary)
}