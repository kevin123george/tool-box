package com.example.mongo.models.dto;

import java.util.Map;
import lombok.Data;

@Data
public class FinanceSummaryDTO {

  private double totalBalance; // Sum of all accounts
  private Map<String, Double> totalByBank; // Example: {N26: 1000, Wise: 500}
  private Map<String, Double> totalByMode; // Example: {Savings: 2000, Current: 800}
}
