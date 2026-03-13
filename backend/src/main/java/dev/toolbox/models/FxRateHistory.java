package dev.toolbox.models;

import java.time.Instant;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "fx_rate_history")
public class FxRateHistory {

  @Id private String id;

  private String fromCurrency;
  private String toCurrency;
  private Double rate;

  @CreatedDate private Instant fetchedAt;
}
