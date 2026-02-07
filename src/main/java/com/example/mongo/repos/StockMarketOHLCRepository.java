package com.example.mongo.repos;

import com.example.mongo.models.StockMarketOHLC;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockMarketOHLCRepository extends MongoRepository<StockMarketOHLC, String> {
  Optional<StockMarketOHLC> findFirstBySymbolAndPeriodAndInterval(
      String symbol, String period, String interval);

  void deleteBySymbolAndPeriodAndInterval(String symbol, String period, String interval);
}
