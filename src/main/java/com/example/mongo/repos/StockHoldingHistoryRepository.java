package com.example.mongo.repos;

import com.example.mongo.models.StockHoldingHistory;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockHoldingHistoryRepository
    extends MongoRepository<StockHoldingHistory, String> {

  // Find all by symbol, ordered by date ascending
  List<StockHoldingHistory> findBySymbolOrderByUpdatedAtAsc(String symbol);

  // Find all by symbol, ordered by date descending
  List<StockHoldingHistory> findBySymbolOrderByUpdatedAtDesc(String symbol);

  // Find by symbol and date range
  List<StockHoldingHistory> findBySymbolAndUpdatedAtBetween(
      String symbol, LocalDateTime from, LocalDateTime to);

  // Find by date range
  List<StockHoldingHistory> findByUpdatedAtBetween(LocalDateTime from, LocalDateTime to);
}
