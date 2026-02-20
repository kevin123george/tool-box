package com.example.mongo.models;

import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "stock_holding_histories")
public class StockHoldingHistory {
  @Id private String id;

  @Indexed private String userId;

  private String stockHoldingId;
  private String symbol;
  private double quantity;
  private double buyPrice;
  private LocalDate buyDate;
  private double currentPrice;
  private LocalDateTime updatedAt;
}
