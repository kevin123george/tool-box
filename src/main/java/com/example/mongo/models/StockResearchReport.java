package com.example.mongo.models;

import com.example.mongo.services.StockResearchService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "stock_research_reports")
public class StockResearchReport {
  @Id private String id;

  private LocalDateTime generatedAt;
  private List<StockHoldingHistory> holdings;
  private Map<String, StockResearchService.StockAnalysis> analyses;
  private String recommendations;
  private String overallSentiment; // BULLISH, BEARISH, NEUTRAL

  // Summary metrics
  private double totalValue;
  private double totalGain;
  private double gainPercentage;
}
