package dev.toolbox.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AllocationDTO {
  private String symbol;
  private double currentValue;
  private double percentage;
  private double targetPercentage;
  private double difference;
}
