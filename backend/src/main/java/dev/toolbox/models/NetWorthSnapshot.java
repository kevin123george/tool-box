package dev.toolbox.models;

import java.time.Instant;
import java.time.LocalDate;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@CompoundIndex(def = "{'userId': 1, 'date': 1}", unique = true)
@Document(collection = "net_worth_snapshots")
public class NetWorthSnapshot {

  @Id private String id;

  @Indexed private String userId;

  private LocalDate date;

  private double totalCash;
  private double portfolioValue;
  private double netWorth;

  @CreatedDate private Instant createdAt;

  public NetWorthSnapshot(LocalDate date, double totalCash, double portfolioValue) {
    this.date = date;
    this.totalCash = totalCash;
    this.portfolioValue = portfolioValue;
    this.netWorth = totalCash + portfolioValue;
  }
}
