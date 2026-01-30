package com.example.mongo.models.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CapitalGainsSummaryDTO {
  private List<CapitalGainsDTO> holdings;
  private double totalUnrealizedGain;
  private double totalEstimatedTax;
}
