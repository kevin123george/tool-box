package dev.toolbox.repos;

import dev.toolbox.models.FxRateHistory;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FxRateHistoryRepository extends MongoRepository<FxRateHistory, String> {

  List<FxRateHistory> findByFromCurrencyAndToCurrencyOrderByFetchedAtAsc(
      String fromCurrency, String toCurrency);

  List<FxRateHistory> findByFromCurrencyAndToCurrencyAndFetchedAtAfterOrderByFetchedAtAsc(
      String fromCurrency, String toCurrency, Instant after);

  Optional<FxRateHistory> findFirstByFromCurrencyAndToCurrencyOrderByFetchedAtDesc(
      String fromCurrency, String toCurrency);

  void deleteByFromCurrencyAndToCurrencyAndFetchedAtBefore(
      String fromCurrency, String toCurrency, Instant cutoff);
}
