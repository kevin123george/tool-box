package com.example.mongo.services;

import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.models.StockResearchReport;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import com.example.mongo.repos.StockResearchReportRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class StockResearchService {

  @Autowired private StockHoldingHistoryRepository holdingRepository;

  @Autowired private StockResearchReportRepository reportRepository;

  @Value("${alpha.vantage.api.key:}")
  private String alphaVantageKey;

  private final RestTemplate restTemplate = new RestTemplate();

  /** Main method to generate research report for user's portfolio */
  public StockResearchReport generateResearchReport() {
    List<StockHoldingHistory> holdings = getLatestHoldings();
    Map<String, StockAnalysis> analyses = new HashMap<>();

    log.info("=== GENERATING RESEARCH REPORT ===");
    log.info("Total holdings to analyze: {}", holdings.size());
    holdings.forEach(h -> log.info("  - {}: {} shares", h.getSymbol(), h.getQuantity()));

    int count = 0;
    for (StockHoldingHistory holding : holdings) {
      count++;
      log.info(
          "\n[{}/{}] ========== Analyzing {} ==========",
          count,
          holdings.size(),
          holding.getSymbol());

      StockAnalysis analysis = analyzeStock(holding.getSymbol());

      log.info("  News articles found: {}", analysis.getNews().size());
      if (!analysis.getNews().isEmpty()) {
        analysis
            .getNews()
            .forEach(
                article ->
                    log.info(
                        "    - {}",
                        article
                            .getTitle()
                            .substring(0, Math.min(60, article.getTitle().length()))));
      }
      log.info("  Sentiment score: {}", String.format("%.3f", analysis.getSentimentScore()));
      log.info("  RSI: {}", analysis.getTechnicalIndicators().getRsi());

      // Generate position-aware recommendation
      analysis.setRecommendation(generatePositionAwareRecommendation(analysis, holding));
      analyses.put(holding.getSymbol(), analysis);

      // Add delay between stocks to avoid rate limiting (3 API calls per stock)
      if (count < holdings.size()) {
        try {
          log.info("  Waiting 2 seconds before next stock to avoid rate limiting...");
          Thread.sleep(2000); // 2 second delay between stocks
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
        }
      }
    }

    log.info("\n=== ANALYSIS COMPLETE ===");
    log.info("Total stocks analyzed: {}", analyses.size());
    log.info("Overall sentiment: {}", calculateOverallSentiment(analyses));

    StockResearchReport report = new StockResearchReport();
    report.setGeneratedAt(LocalDateTime.now());
    report.setHoldings(holdings);
    report.setAnalyses(analyses);
    report.setOverallSentiment(calculateOverallSentiment(analyses));

    // Calculate portfolio metrics
    calculatePortfolioMetrics(report, holdings);

    StockResearchReport saved = reportRepository.save(report);
    log.info("Report saved with ID: {}", saved.getId());

    return saved;
  }

  /** Get latest holding for each unique symbol */
  private List<StockHoldingHistory> getLatestHoldings() {
    List<StockHoldingHistory> allHoldings = (List<StockHoldingHistory>) holdingRepository.findAll();

    Map<String, StockHoldingHistory> latestBySymbol = new HashMap<>();
    for (StockHoldingHistory holding : allHoldings) {
      StockHoldingHistory existing = latestBySymbol.get(holding.getSymbol());
      if (existing == null || holding.getUpdatedAt().isAfter(existing.getUpdatedAt())) {
        latestBySymbol.put(holding.getSymbol(), holding);
      }
    }

    return new ArrayList<>(latestBySymbol.values());
  }

  /** Analyze a single stock */
  private StockAnalysis analyzeStock(String symbol) {
    StockAnalysis analysis = new StockAnalysis();
    analysis.setSymbol(symbol);
    analysis.setNews(fetchNews(symbol));
    analysis.setTechnicalIndicators(fetchTechnicalIndicators(symbol));
    analysis.setSentimentScore(calculateSentiment(analysis.getNews()));

    return analysis;
  }

  /** Generate position-aware recommendation */
  private String generatePositionAwareRecommendation(
      StockAnalysis analysis, StockHoldingHistory holding) {
    double sentiment = analysis.getSentimentScore();
    Double rsi = analysis.getTechnicalIndicators().getRsi();

    // Calculate position metrics
    double currentValue = holding.getCurrentPrice() * holding.getQuantity();
    double costBasis = holding.getBuyPrice() * holding.getQuantity();
    double gain = currentValue - costBasis;
    double gainPct = (gain / costBasis) * 100;

    StringBuilder rec = new StringBuilder();

    // Position status
    rec.append(
        String.format(
            "POSITION: %.2f shares @ $%.2f (Current: $%.2f)\n",
            holding.getQuantity(), holding.getBuyPrice(), holding.getCurrentPrice()));
    rec.append(String.format("P/L: $%.2f (%.2f%%)\n\n", gain, gainPct));

    // Sentiment analysis
    if (sentiment > 0.2) {
      rec.append("BULLISH sentiment (").append(String.format("%.2f", sentiment)).append("). ");
    } else if (sentiment < -0.2) {
      rec.append("BEARISH sentiment (").append(String.format("%.2f", sentiment)).append("). ");
    } else {
      rec.append("NEUTRAL sentiment (").append(String.format("%.2f", sentiment)).append("). ");
    }

    // RSI analysis
    if (rsi != null) {
      if (rsi > 70) {
        rec.append("RSI ").append(String.format("%.1f", rsi)).append(" - OVERBOUGHT. ");
      } else if (rsi < 30) {
        rec.append("RSI ").append(String.format("%.1f", rsi)).append(" - OVERSOLD. ");
      } else {
        rec.append("RSI ").append(String.format("%.1f", rsi)).append(" - NEUTRAL. ");
      }
    }

    rec.append("\n\n");

    // Position-aware recommendation
    if (gainPct < -10) {
      // Significant loss
      if (sentiment > 0.3) {
        rec.append("→ Action: HOLD & AVERAGE DOWN\n");
        rec.append("Despite being down ").append(String.format("%.1f%%", Math.abs(gainPct)));
        rec.append(", positive sentiment suggests potential recovery.");
      } else if (sentiment < -0.3) {
        rec.append("→ Action: CONSIDER CUTTING LOSSES\n");
        rec.append("Down ").append(String.format("%.1f%%", Math.abs(gainPct)));
        rec.append(" with negative sentiment. Risk of further decline.");
      } else {
        rec.append("→ Action: HOLD\n");
        rec.append("Down ").append(String.format("%.1f%%", Math.abs(gainPct)));
        rec.append(". Wait for clearer signals before acting.");
      }
    } else if (gainPct > 20) {
      // Significant gain
      if (sentiment < -0.2 || (rsi != null && rsi > 75)) {
        rec.append("→ Action: TAKE PROFITS\n");
        rec.append("Up ").append(String.format("%.1f%%", gainPct));
        rec.append(". Weakening signals suggest securing gains.");
      } else {
        rec.append("→ Action: HOLD & TRAIL STOP\n");
        rec.append("Up ").append(String.format("%.1f%%", gainPct));
        rec.append(". Still strong. Consider trailing stop loss.");
      }
    } else {
      // Normal range (-10% to +20%)
      if (sentiment > 0.3 && (rsi == null || rsi < 70)) {
        rec.append("→ Action: CONSIDER ADDING\n");
        rec.append("Strong sentiment with room to run. Good entry for averaging up.");
      } else if (sentiment < -0.3 || (rsi != null && rsi > 75)) {
        rec.append("→ Action: CONSIDER REDUCING\n");
        rec.append("Weakening signals. Consider trimming position.");
      } else {
        rec.append("→ Action: HOLD\n");
        rec.append("No strong signals. Maintain current position.");
      }
    }

    return rec.toString();
  }

  /**
   * Fetch news with sentiment from Alpha Vantage AUTHORS FIELD IS AN ARRAY OF STRINGS: ["Author
   * Name"]
   */
  private List<NewsArticle> fetchNews(String symbol) {
    if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
      log.warn("  [NEWS] Alpha Vantage API key not configured");
      return Collections.emptyList();
    }

    try {
      Thread.sleep(1500); // Wait 1.2 seconds BEFORE each API call

      String url =
          String.format(
              "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=%s&limit=10&apikey=%s",
              symbol, alphaVantageKey);

      log.debug("  [NEWS] Fetching news for {}", symbol);

      Map<String, Object> response = restTemplate.getForObject(url, Map.class);

      if (response == null) {
        log.warn("  [NEWS] Null response from Alpha Vantage for {}", symbol);
        return Collections.emptyList();
      }

      if (!response.containsKey("feed")) {
        log.warn("  [NEWS] No 'feed' key in response for {}", symbol);
        if (response.containsKey("Information")) {
          log.error("  [NEWS] API Message: {}", response.get("Information"));
        }
        return Collections.emptyList();
      }

      List<Map<String, Object>> feed = (List<Map<String, Object>>) response.get("feed");
      log.info("  [NEWS] Retrieved {} articles from Alpha Vantage for {}", feed.size(), symbol);

      List<NewsArticle> articles =
          feed.stream()
              .limit(5)
              .map(
                  article -> {
                    NewsArticle news = new NewsArticle();

                    try {
                      news.setTitle((String) article.get("title"));
                      news.setSummary((String) article.get("summary"));
                      news.setUrl((String) article.get("url"));
                      news.setPublishedAt((String) article.get("time_published"));

                      // AUTHORS IS ARRAY OF STRINGS: ["Author Name"]
                      Object authorsObj = article.get("authors");
                      if (authorsObj instanceof List) {
                        List<?> authorsList = (List<?>) authorsObj;
                        if (!authorsList.isEmpty() && authorsList.get(0) instanceof String) {
                          news.setSource((String) authorsList.get(0));
                        }
                      }

                      // Parse sentiment scores
                      Double overallScore = parseDouble(article.get("overall_sentiment_score"));
                      news.setAlphaSentimentScore(overallScore);

                      // Parse ticker sentiment array - FIND THE SPECIFIC TICKER
                      Object tickerSentObj = article.get("ticker_sentiment");
                      if (tickerSentObj instanceof List) {
                        List<?> tickerSentList = (List<?>) tickerSentObj;

                        boolean foundTicker = false;
                        for (Object tsObj : tickerSentList) {
                          if (tsObj instanceof Map) {
                            Map<?, ?> ts = (Map<?, ?>) tsObj;
                            Object tickerObj = ts.get("ticker");

                            if (tickerObj != null
                                && symbol.equalsIgnoreCase(tickerObj.toString())) {
                              news.setRelevanceScore(parseDouble(ts.get("relevance_score")));
                              news.setTickerSentimentScore(
                                  parseDouble(ts.get("ticker_sentiment_score")));
                              foundTicker = true;

                              log.debug(
                                  "    ✓ Found ticker sentiment for {} in article: {}",
                                  symbol,
                                  news.getTickerSentimentScore());
                              break;
                            }
                          }
                        }

                        if (!foundTicker) {
                          log.debug(
                              "    ✗ Article does not have ticker_sentiment for {}: {}",
                              symbol,
                              news.getTitle().substring(0, Math.min(50, news.getTitle().length())));
                        }
                      }
                    } catch (Exception e) {
                      log.error("  [NEWS] Error parsing article: {}", e.getMessage());
                      // Continue with partial data
                    }

                    return news;
                  })
              .collect(Collectors.toList());

      log.info("  [NEWS] Processed {} articles for {}", articles.size(), symbol);

      return articles;

    } catch (Exception e) {
      log.error("  [NEWS] Error fetching news for {}: {}", symbol, e.getMessage());
      e.printStackTrace();
      return Collections.emptyList();
    }
  }

  /** Fetch technical indicators from Alpha Vantage */
  private TechnicalIndicators fetchTechnicalIndicators(String symbol) {
    TechnicalIndicators indicators = new TechnicalIndicators();

    if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
      return indicators;
    }

    try {
      // Fetch RSI
      String rsiUrl =
          String.format(
              "https://www.alphavantage.co/query?function=RSI&symbol=%s&interval=daily&time_period=14&series_type=close&apikey=%s",
              symbol, alphaVantageKey);
      Map rsiResponse = restTemplate.getForObject(rsiUrl, Map.class);
      indicators.setRsi(parseLatestIndicator(rsiResponse, "Technical Analysis: RSI"));

      // Add small delay to avoid rate limiting
      Thread.sleep(500);

      // Fetch MACD
      String macdUrl =
          String.format(
              "https://www.alphavantage.co/query?function=MACD&symbol=%s&interval=daily&series_type=close&apikey=%s",
              symbol, alphaVantageKey);
      Map<String, Object> macdResponse = restTemplate.getForObject(macdUrl, Map.class);
      Double macd = parseLatestIndicator(macdResponse, "Technical Analysis: MACD");
      indicators.setMacd(macd);

    } catch (Exception e) {
      System.err.println(
          "Error fetching technical indicators for " + symbol + ": " + e.getMessage());
    }

    return indicators;
  }

  /** Calculate sentiment score using Alpha Vantage scores */
  private double calculateSentiment(List<NewsArticle> news) {
    if (news.isEmpty()) {
      return 0.0;
    }

    double totalSentiment = 0.0;
    int validCount = 0;

    for (NewsArticle article : news) {
      if (article.getTickerSentimentScore() != null) {
        totalSentiment += article.getTickerSentimentScore();
        validCount++;
      } else if (article.getAlphaSentimentScore() != null) {
        totalSentiment += article.getAlphaSentimentScore();
        validCount++;
      }
    }

    return validCount > 0 ? totalSentiment / validCount : 0.0;
  }

  /** Calculate overall portfolio sentiment */
  private String calculateOverallSentiment(Map<String, StockAnalysis> analyses) {
    double avgSentiment =
        analyses.values().stream()
            .mapToDouble(StockAnalysis::getSentimentScore)
            .average()
            .orElse(0.0);

    if (avgSentiment > 0.3) return "BULLISH";
    if (avgSentiment < -0.3) return "BEARISH";
    return "NEUTRAL";
  }

  /** Calculate portfolio-wide metrics */
  private void calculatePortfolioMetrics(
      StockResearchReport report, List<StockHoldingHistory> holdings) {
    double totalValue = 0.0;
    double totalCost = 0.0;

    for (StockHoldingHistory holding : holdings) {
      totalCost += holding.getBuyPrice() * holding.getQuantity();
      totalValue += holding.getCurrentPrice() * holding.getQuantity();
    }

    report.setTotalValue(totalValue);
    report.setTotalGain(totalValue - totalCost);
    report.setGainPercentage(totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0.0);
  }

  private Double parseDouble(Object value) {
    if (value == null) return null;
    if (value instanceof Number) return ((Number) value).doubleValue();
    try {
      return Double.parseDouble(value.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private Double parseLatestIndicator(Map<String, Object> response, String key) {
    try {
      Map<String, Map<String, String>> data = (Map<String, Map<String, String>>) response.get(key);
      if (data == null || data.isEmpty()) return null;

      String latestDate =
          data.keySet().stream().sorted(Comparator.reverseOrder()).findFirst().orElse(null);

      if (latestDate == null) return null;

      String value = data.get(latestDate).values().stream().findFirst().orElse("0");
      return Double.parseDouble(value);
    } catch (Exception e) {
      return null;
    }
  }

  // Inner classes
  @Setter
  @Getter
  public static class StockAnalysis {
    private String symbol;
    private List<NewsArticle> news;
    private TechnicalIndicators technicalIndicators;
    private double sentimentScore;
    private String recommendation;
  }

  @Setter
  @Getter
  public static class NewsArticle {
    private String title;
    private String summary;
    private String url;
    private String publishedAt;
    private String source;
    private Double alphaSentimentScore;
    private Double tickerSentimentScore;
    private Double relevanceScore;
  }

  @Setter
  @Getter
  public static class TechnicalIndicators {
    private Double rsi;
    private Double macd;
    private Double movingAverage50;
    private Double movingAverage200;
  }
}
