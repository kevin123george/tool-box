package com.example.mongo.repos;

import com.example.mongo.models.StockHoldingHistory;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockHoldingHistoryRepository
    extends MongoRepository<StockHoldingHistory, String> {}
