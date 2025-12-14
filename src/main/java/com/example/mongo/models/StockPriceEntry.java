package com.example.mongo.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDateTime;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "stock_price_entries")
@Data
public class StockPriceEntry {

  @Id private Long id;

  private double price;

  private LocalDateTime timestamp = LocalDateTime.now();

  @JsonIgnore private StockWatch stock;

  // Getters and Setters
}
