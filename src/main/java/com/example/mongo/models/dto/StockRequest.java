package com.example.mongo.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import lombok.Data;

@Data
public class StockRequest {
  @NotBlank(message = "Symbol is required")
  private String symbol;

  @Positive(message = "Quantity must be positive")
  private double quantity;

  @Positive(message = "Buy price must be positive")
  private double buyPrice;

  private LocalDate buyDate;
  private double currentPrice;
}
