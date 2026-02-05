package com.example.mongo.repos;

import com.example.mongo.models.FinancialStatement;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FinancialStatementRepository extends MongoRepository<FinancialStatement, String> {

  List<FinancialStatement> findBySymbolAndStatementTypeAndPeriod(
      String symbol, String statementType, String period);

  void deleteBySymbolAndStatementTypeAndPeriod(
      String symbol, String statementType, String period);
}
