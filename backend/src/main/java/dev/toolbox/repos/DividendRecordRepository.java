package dev.toolbox.repos;

import dev.toolbox.models.DividendRecord;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DividendRecordRepository extends MongoRepository<DividendRecord, String> {

  List<DividendRecord> findByStockSymbol(String stockSymbol);

  List<DividendRecord> findAllByOrderByPaymentDateDesc();

  List<DividendRecord> findByPaymentDateBetween(LocalDate start, LocalDate end);

  List<DividendRecord> findByPaymentDateBetweenOrderByPaymentDateAsc(
      LocalDate start, LocalDate end);

  List<DividendRecord> findAllByUserIdOrderByPaymentDateDesc(String userId);

  List<DividendRecord> findByStockSymbolAndUserId(String stockSymbol, String userId);

  List<DividendRecord> findByPaymentDateBetweenAndUserIdOrderByPaymentDateAsc(
      LocalDate start, LocalDate end, String userId);
}
