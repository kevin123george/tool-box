package com.example.mongo.repos;

import com.example.mongo.models.DividendRecord;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DividendRecordRepository extends MongoRepository<DividendRecord, String> {

  List<DividendRecord> findByStockSymbol(String stockSymbol);

  List<DividendRecord> findAllByOrderByPaymentDateDesc();

  List<DividendRecord> findByPaymentDateBetween(LocalDate start, LocalDate end);

  List<DividendRecord> findByPaymentDateBetweenOrderByPaymentDateAsc(LocalDate start, LocalDate end);
}
