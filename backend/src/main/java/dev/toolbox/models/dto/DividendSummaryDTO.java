package dev.toolbox.models.dto;

import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DividendSummaryDTO {
  private double totalReceived;
  private Map<String, Double> totalByStock;
  private double annualProjection;
  private Map<Integer, Double> dividendsByYear;
}
