package server

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "src/internal/handlers"
    "src/internal/services"
)

func (s *Server) RegisterRoutes() http.Handler {
    r := gin.Default()

    // Initialize services
    txService := services.NewTransactionService(s.db)
    poolService := services.NewPoolService(s.db)
    
    // Initialize handlers
    txHandler := handlers.NewTransactionHandler(txService)
    poolHandler := handlers.NewPoolHandler(poolService)

    // Register routes
    r.GET("/transactions/summary/:address", txHandler.GetAccountSummary)
    r.GET("/pool/status/:address", poolHandler.GetPoolStatus)

    return r
}