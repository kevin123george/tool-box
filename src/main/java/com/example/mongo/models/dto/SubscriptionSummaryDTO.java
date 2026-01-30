package com.example.mongo.models.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionSummaryDTO {
  private double totalMonthly;
  private double totalAnnual;
  private int activeCount;
  private Map<String, Double> costByCategory;
}
