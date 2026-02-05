package com.example.mongo.models;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "earnings_data")
public class EarningsData {
  @Id private String id;

  private String symbol;
  private String period; // annual, quarterly
  private String fiscalDateEnding;
  private Double reportedEPS;
  private Double estimatedEPS;
  private Double surprise;
  private Double surprisePercentage;

  private LocalDateTime fetchedAt;
  private LocalDateTime expiresAt;
}
