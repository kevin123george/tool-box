package dev.toolbox.repos;

import dev.toolbox.models.StockWatch;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockWatchRepository extends MongoRepository<StockWatch, String> {

  List<StockWatch> findBySymbol(String symbol);

  List<StockWatch> findAllByUserId(String userId);

  Optional<StockWatch> findBySymbolAndUserId(String symbol, String userId);

  boolean existsBySymbolAndUserId(String symbol, String userId);

  void deleteBySymbolAndUserId(String symbol, String userId);

  default List<String> findDistinctStockSymbols() {
    return findAll().stream().map(StockWatch::getSymbol).collect(Collectors.toList());
  }

  default List<String> findDistinctStockSymbolsByUserId(String userId) {
    return findAllByUserId(userId).stream().map(StockWatch::getSymbol).collect(Collectors.toList());
  }
}
