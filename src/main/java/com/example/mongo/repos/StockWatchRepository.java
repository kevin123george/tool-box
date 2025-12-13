package com.example.mongo.repos;

import com.example.mongo.models.StockWatch;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockWatchRepository extends MongoRepository<StockWatch, String> {
  //    List<String> findDistinctStockSymbols();
}
