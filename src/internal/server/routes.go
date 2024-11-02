package server

import (
    "net/http"

    "github.com/gin-gonic/gin"

)

func (s *Server) RegisterRoutes() http.Handler {
    r := gin.Default()


    // Add new routes for transactions
    r.GET("/transactions/account/:address", s.GetTransactionsByAccount)
    r.GET("/transactions/token/:address", s.GetTransactionsByToken)

    return r
}

// ... your existing handlers ...

// Add new handlers
func (s *Server) GetTransactionsByAccount(c *gin.Context) {
    accountAddress := c.Param("address")
    if accountAddress == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
        return
    }

    transactions, err := s.db.GetTransactionsByAccount(c.Request.Context(), accountAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, transactions)
}

func (s *Server) GetTransactionsByToken(c *gin.Context) {
    tokenAddress := c.Param("address")
    if tokenAddress == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "address is required"})
        return
    }

    transactions, err := s.db.GetTransactionsByToken(c.Request.Context(), tokenAddress)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusOK, transactions)
}