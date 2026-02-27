package dev.toolbox.models.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioAllocationDTO {
  private List<AllocationDTO> allocations;
  private double totalValue;
  private Map<String, String> rebalanceSuggestions;
}
