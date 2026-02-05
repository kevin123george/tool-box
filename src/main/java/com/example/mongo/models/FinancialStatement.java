package com.example.mongo.models;

import java.time.LocalDateTime;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "financial_statements")
public class FinancialStatement {
  @Id private String id;

  private String symbol;
  private String statementType; // INCOME, BALANCE_SHEET, CASH_FLOW
  private String period; // annual, quarterly
  private String fiscalDateEnding;
  private Map<String, Object> data;

  private LocalDateTime fetchedAt;
  private LocalDateTime expiresAt;
}
