package server

import (
    "fmt"
    "net/http"
    "os"
    "strconv"
    "time"

    _ "github.com/joho/godotenv/autoload"
    "src/internal/database"
)

type Server struct {
    port int
    db   database.Service
}

func NewServer(db database.Service) *http.Server {
    port, _ := strconv.Atoi(os.Getenv("PORT"))
    newServer := &Server{
        port: port,
        db:   db,
    }

    server := &http.Server{
        Addr:         fmt.Sprintf(":%d", newServer.port),
        Handler:      newServer.RegisterRoutes(),
        IdleTimeout:  time.Minute,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
    }

    return server
}