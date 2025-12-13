package com.example.mongo.models;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "stock_watches")
public class StockWatch {

  @Id private String symbol;

  private double initialPrice;

  private double currentPrice;

  private LocalDateTime addedAt = LocalDateTime.now();

  private List<StockPriceEntry> priceHistory;
}
