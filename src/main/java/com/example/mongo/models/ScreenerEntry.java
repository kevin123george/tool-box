package com.example.mongo.models;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "screener_entries")
public class ScreenerEntry {
  @Id private String id;

  @Indexed(unique = true)
  private String symbol;

  private String name;
  private String sector;
  private String industry;
  private Double marketCap;
  private Double peRatio;
  private Double pbRatio;
  private Double dividendYield;
  private Double revenueGrowthYOY;
  private Double eps;
  private Double roe;
  private Double debtToEquity;
  private Double profitMargin;
  private Double currentPrice;

  private LocalDateTime fetchedAt;
  private LocalDateTime expiresAt;
}
