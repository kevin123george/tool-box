package dev.toolbox.models;

import java.time.Instant;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "price_alerts")
public class PriceAlert {

  @Id private String id;

  @Indexed private String userId;

  private String symbol;

  /** New condition type — replaces direction for new alerts. */
  private AlertCondition alertCondition;

  /** Used by PRICE_ABOVE / PRICE_BELOW. */
  private double targetPrice;

  /** Used by DAILY_CHANGE_* and PNL_* (e.g. 5.0 means 5%). */
  private double targetPercent;

  /**
   * Legacy field — kept for backward compatibility with existing DB documents. New alerts set
   * alertCondition instead.
   */
  @Deprecated private AlertDirection direction;

  private boolean triggered = false;
  private boolean active = true;
  private Instant triggeredAt;

  @CreatedDate private Instant createdAt;
  @LastModifiedDate private Instant lastModified;

  /** Resolve effective condition, falling back to legacy direction field. */
  public AlertCondition effectiveCondition() {
    if (alertCondition != null) return alertCondition;
    if (direction == AlertDirection.ABOVE) return AlertCondition.PRICE_ABOVE;
    if (direction == AlertDirection.BELOW) return AlertCondition.PRICE_BELOW;
    return null;
  }
}
