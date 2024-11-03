package database

import (
    "context"
    "fmt"
    "log"
    "time"

    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
    "go.mongodb.org/mongo-driver/bson"
)

type MongoDB struct {
    client     *mongo.Client
    database   *mongo.Database
    collection *mongo.Collection
    poolCollection *mongo.Collection
}

func New() Service {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        log.Fatalf("Failed to connect to MongoDB: %v", err)
    }

    // Ping the database
    err = client.Ping(ctx, nil)
    if err != nil {
        log.Fatalf("Failed to ping MongoDB: %v", err)
    }

    database := client.Database("token_events")
    collection := database.Collection("transactions")
    poolCollection := database.Collection("pool_transactions")

    // Create indexes
    indexes := []mongo.IndexModel{
        {
            Keys: bson.D{{Key: "account_address", Value: 1}},
        },
        {
            Keys: bson.D{{Key: "token_address", Value: 1}},
        },
        {
            Keys: bson.D{{Key: "tx_hash", Value: 1}},
        },
    }
    poolIndexes := []mongo.IndexModel{
        {
            Keys: bson.D{{Key: "pool_address", Value: 1}},
        },
        {
            Keys: bson.D{{Key: "event_type", Value: 1}},
        },
        {
            Keys: bson.D{{Key: "timestamp", Value: 1}},
        },
    }

    _, err = collection.Indexes().CreateMany(ctx, indexes)
    if err != nil {
        log.Fatalf("Failed to create indexes: %v", err)
    }

    _, err = poolCollection.Indexes().CreateMany(ctx, poolIndexes)
    if err != nil {
        log.Fatalf("Failed to create pool indexes: %v", err)
    }

    return &MongoDB{
        client:     client,
        database:   database,
        collection: collection,
        poolCollection: poolCollection,
    }
}

func (m *MongoDB) Health() map[string]string {
    ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel()

    err := m.client.Ping(ctx, nil)
    if err != nil {
        return map[string]string{
            "status": "unhealthy",
            "error":  err.Error(),
        }
    }

    return map[string]string{
        "status": "healthy",
    }
}

func (m *MongoDB) Close(ctx context.Context) error {
    return m.client.Disconnect(ctx)
}

func (m *MongoDB) SaveTransaction(ctx context.Context, tx *Transaction) error {
    _, err := m.collection.InsertOne(ctx, tx)
    if err != nil {
        return fmt.Errorf("failed to save transaction: %v", err)
    }
    return nil
}

func (m *MongoDB) GetTransactionsByAccount(ctx context.Context, accountAddress string) ([]*Transaction, error) {
    cursor, err := m.collection.Find(ctx, bson.M{"account_address": accountAddress})
    if err != nil {
        return nil, fmt.Errorf("failed to get transactions: %v", err)
    }
    defer cursor.Close(ctx)

    var transactions []*Transaction
    if err = cursor.All(ctx, &transactions); err != nil {
        return nil, fmt.Errorf("failed to decode transactions: %v", err)
    }

    return transactions, nil
}

func (m *MongoDB) GetTransactionsByToken(ctx context.Context, tokenAddress string) ([]*Transaction, error) {
    cursor, err := m.collection.Find(ctx, bson.M{"token_address": tokenAddress})
    if err != nil {
        return nil, fmt.Errorf("failed to get transactions: %v", err)
    }
    defer cursor.Close(ctx)

    var transactions []*Transaction
    if err = cursor.All(ctx, &transactions); err != nil {
        return nil, fmt.Errorf("failed to decode transactions: %v", err)
    }

    return transactions, nil
}
// Add new methods to MongoDB struct
func (m *MongoDB) SavePoolTransaction(ctx context.Context, tx *PoolTransaction) error {
    _, err := m.poolCollection.InsertOne(ctx, tx)
    if err != nil {
        return fmt.Errorf("failed to save pool transaction: %v", err)
    }
    return nil
}

func (m *MongoDB) GetPoolTransactions(ctx context.Context, poolAddress string) ([]*PoolTransaction, error) {
    cursor, err := m.poolCollection.Find(ctx, bson.M{"pool_address": poolAddress})
    if err != nil {
        return nil, fmt.Errorf("failed to get pool transactions: %v", err)
    }
    defer cursor.Close(ctx)

    var transactions []*PoolTransaction
    if err = cursor.All(ctx, &transactions); err != nil {
        return nil, fmt.Errorf("failed to decode pool transactions: %v", err)
    }

    return transactions, nil
}