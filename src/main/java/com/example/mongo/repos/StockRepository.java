package com.example.mongo.repos;

import com.example.mongo.models.StockHolding;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockRepository extends MongoRepository<StockHolding, String> {}
