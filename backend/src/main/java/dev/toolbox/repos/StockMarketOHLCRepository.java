package dev.toolbox.repos;

import dev.toolbox.models.StockMarketOHLC;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockMarketOHLCRepository extends MongoRepository<StockMarketOHLC, String> {
  Optional<StockMarketOHLC> findFirstBySymbolAndPeriodAndInterval(
      String symbol, String period, String interval);

  void deleteBySymbolAndPeriodAndInterval(String symbol, String period, String interval);
}
