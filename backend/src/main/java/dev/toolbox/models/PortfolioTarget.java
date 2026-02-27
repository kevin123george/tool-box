package dev.toolbox.models;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "portfolio_targets")
public class PortfolioTarget {

  @Id private String id;

  @Indexed private String userId;

  // Map of symbol -> target percentage
  private Map<String, Double> allocations = new HashMap<>();

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  public void setAllocation(String symbol, double percentage) {
    allocations.put(symbol, percentage);
  }

  public double getTotalAllocation() {
    return allocations.values().stream().mapToDouble(Double::doubleValue).sum();
  }
}
