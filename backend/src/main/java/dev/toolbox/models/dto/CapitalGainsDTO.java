package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CapitalGainsDTO {
  private String symbol;
  private double buyPrice;
  private double currentPrice;
  private double quantity;
  private double unrealizedGain;
  private double taxRate;
  private double estimatedTax;
  private long holdingPeriodDays;
}
