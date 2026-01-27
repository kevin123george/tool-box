package com.example.mongo.repos;

import com.example.mongo.models.StockWatch;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockWatchRepository extends MongoRepository<StockWatch, String> {
  default List<String> findDistinctStockSymbols() {
    return findAll().stream().map(StockWatch::getSymbol).collect(Collectors.toList());
  }
}
