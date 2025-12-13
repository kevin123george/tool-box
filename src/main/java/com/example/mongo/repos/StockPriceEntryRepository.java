package com.example.mongo.repos;

import com.example.mongo.models.StockPriceEntry;
import com.example.mongo.models.StockWatch;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockPriceEntryRepository extends MongoRepository<StockPriceEntry, String> {

  // Find all price entries for a stock
  List<StockPriceEntry> findByStockSymbolOrderByTimestampAsc(String symbol);

  //    // Optional: Get latest price entry for a stock
  //    @Query("SELECT e FROM StockPriceEntry e WHERE e.stock.symbol = :symbol ORDER BY e.timestamp
  // DESC LIMIT 1")
  //    Optional<StockPriceEntry> findLatestBySymbol(String symbol);

  // Optional: Get price entries within a date range
  List<StockPriceEntry> findByStockAndTimestampBetween(
      StockWatch stock, LocalDateTime from, LocalDateTime to);
}
