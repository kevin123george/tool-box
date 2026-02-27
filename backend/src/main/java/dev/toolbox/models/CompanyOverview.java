package dev.toolbox.models;

import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@Document(collection = "company_overviews")
public class CompanyOverview {
  @Id private String id;

  @Indexed(unique = true)
  private String symbol;

  private String name;
  private String sector;
  private String industry;
  private String exchange;
  private Double marketCap;
  private Double peRatio;
  private Double pegRatio;
  private Double pbRatio;
  private Double psRatio;
  private Double evToEbitda;
  private Double eps;
  private Double roe;
  private Double roa;
  private Double profitMargin;
  private Double operatingMargin;
  private Double dividendYield;
  private Double beta;
  private Double weekHigh52;
  private Double weekLow52;
  private Long sharesOutstanding;
  private Double analystTargetPrice;
  private Double debtToEquity;
  private Double currentRatio;
  private Double revenuePerShare;
  private Double bookValue;
  private Double currentPrice;

  private LocalDateTime fetchedAt;
  private LocalDateTime expiresAt;
}
