package com.example.mongo.models;

import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "stock_holdings")
public class StockHolding {
  @Id private String id;

  private String symbol; // e.g., AAPL, TSLA
  private double quantity;
  private double buyPrice;
  private LocalDate buyDate = LocalDate.now(); // Default to today if not specified
  private double currentPrice;
  private Boolean sold = false; // Indicates if the stock has been sold
  // Getters, setters, etc.
}
