package com.example.mongo.models;

import java.time.Instant;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "price_alerts")
public class PriceAlert {

  @Id private String id;

  @Indexed private String userId;

  private String symbol;
  private double targetPrice;
  private AlertDirection direction;
  private boolean triggered = false;
  private boolean active = true;
  private Instant triggeredAt;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public PriceAlert(String symbol, double targetPrice, AlertDirection direction) {
    this.symbol = symbol;
    this.targetPrice = targetPrice;
    this.direction = direction;
  }
}
