package dev.toolbox.models;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "stock_market_ohlc")
public class StockMarketOHLC {
  @Id private String id;

  private String symbol;
  private String period;
  private String interval;
  private List<Map<String, Object>> data;
  private String sourceCurrency;
  private Double exchangeRate;
  private LocalDateTime fetchedAt;
  private LocalDateTime expiresAt;
}
