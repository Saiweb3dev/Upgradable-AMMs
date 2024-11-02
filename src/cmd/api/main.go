package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"src/internal/server"
	"src/internal/blockchain"
	"src/internal/shutdown"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize server
	server := server.NewServer()

	// Initialize blockchain listener
	eventListener, err := blockchain.NewEventListener()
	if err != nil {
		log.Fatalf("Failed to create event listener: %v", err)
	}

	// Create error channel to catch any errors from the event listener goroutine
	listenerErrCh := make(chan error, 1)
	
	// Start the event listener in a goroutine
	go func() {
		log.Println("Starting blockchain event listener...")
		if err := eventListener.Start(ctx); err != nil {
			listenerErrCh <- fmt.Errorf("blockchain listener error: %v", err)
		}
	}()

	// Start graceful shutdown handler
	go shutdown.HandleGracefulShutdown(server)

	// Monitor for errors from the event listener
	go func() {
		select {
		case err := <-listenerErrCh:
			log.Printf("Event listener error: %v", err)
			cancel() // Cancel context to trigger shutdown
		case <-ctx.Done():
			return
		}
	}()

	// Start the HTTP server
	log.Println("Starting HTTP server...")
	err = server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		log.Fatalf("HTTP server error: %v", err)
	}
}