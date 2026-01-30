package com.example.mongo.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "dividend_records")
public class DividendRecord {

  @Id private String id;

  private String stockSymbol;
  private double amount;
  private String currency = "EUR";
  private LocalDate paymentDate;
  private LocalDate exDividendDate;
  private DividendFrequency frequency;
  private String notes;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public DividendRecord(String stockSymbol, double amount, LocalDate paymentDate) {
    this.stockSymbol = stockSymbol;
    this.amount = amount;
    this.paymentDate = paymentDate;
  }
}
