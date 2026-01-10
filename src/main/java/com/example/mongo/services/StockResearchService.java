package com.example.mongo.service;

import com.example.mongo.models.StockHoldingHistory;
import com.example.mongo.models.StockResearchReport;
import com.example.mongo.repos.StockHoldingHistoryRepository;
import com.example.mongo.repos.StockResearchReportRepository;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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

    for (StockHoldingHistory holding : holdings) {
      StockAnalysis analysis = analyzeStock(holding.getSymbol());
      // Generate position-aware recommendation
      analysis.setRecommendation(generatePositionAwareRecommendation(analysis, holding));
      analyses.put(holding.getSymbol(), analysis);
    }

    StockResearchReport report = new StockResearchReport();
    report.setGeneratedAt(LocalDateTime.now());
    report.setHoldings(holdings);
    report.setAnalyses(analyses);
    report.setOverallSentiment(calculateOverallSentiment(analyses));

    // Calculate portfolio metrics
    calculatePortfolioMetrics(report, holdings);

    return reportRepository.save(report);
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

  /** Fetch news with sentiment from Alpha Vantage */
  private List<NewsArticle> fetchNews(String symbol) {
    if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
      return Collections.emptyList();
    }

    try {
      String url =
          String.format(
              "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=%s&limit=10&apikey=%s",
              symbol, alphaVantageKey);

      Map<String, Object> response = restTemplate.getForObject(url, Map.class);

      if (response == null || !response.containsKey("feed")) {
        return Collections.emptyList();
      }

      List<Map<String, Object>> feed = (List<Map<String, Object>>) response.get("feed");

      return feed.stream()
          .limit(5)
          .map(
              article -> {
                NewsArticle news = new NewsArticle();
                news.setTitle((String) article.get("title"));
                news.setSummary((String) article.get("summary"));
                news.setUrl((String) article.get("url"));
                news.setPublishedAt((String) article.get("time_published"));

                List<Map<String, String>> authors =
                    (List<Map<String, String>>) article.get("authors");
                if (authors != null && !authors.isEmpty()) {
                  news.setSource(authors.get(0).get("name"));
                }

                Double overallScore = parseDouble(article.get("overall_sentiment_score"));
                news.setAlphaSentimentScore(overallScore);

                List<Map<String, Object>> tickerSentiment =
                    (List<Map<String, Object>>) article.get("ticker_sentiment");
                if (tickerSentiment != null) {
                  for (Map<String, Object> ts : tickerSentiment) {
                    if (symbol.equalsIgnoreCase((String) ts.get("ticker"))) {
                      news.setRelevanceScore(parseDouble(ts.get("relevance_score")));
                      news.setTickerSentimentScore(parseDouble(ts.get("ticker_sentiment_score")));
                      break;
                    }
                  }
                }

                return news;
              })
          .collect(Collectors.toList());
    } catch (Exception e) {
      System.err.println("Error fetching news for " + symbol + ": " + e.getMessage());
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
      Map<String, Object> rsiResponse = restTemplate.getForObject(rsiUrl, Map.class);
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
  public static class StockAnalysis {
    private String symbol;
    private List<NewsArticle> news;
    private TechnicalIndicators technicalIndicators;
    private double sentimentScore;
    private String recommendation;

    public String getSymbol() {
      return symbol;
    }

    public void setSymbol(String symbol) {
      this.symbol = symbol;
    }

    public List<NewsArticle> getNews() {
      return news;
    }

    public void setNews(List<NewsArticle> news) {
      this.news = news;
    }

    public TechnicalIndicators getTechnicalIndicators() {
      return technicalIndicators;
    }

    public void setTechnicalIndicators(TechnicalIndicators indicators) {
      this.technicalIndicators = indicators;
    }

    public double getSentimentScore() {
      return sentimentScore;
    }

    public void setSentimentScore(double score) {
      this.sentimentScore = score;
    }

    public String getRecommendation() {
      return recommendation;
    }

    public void setRecommendation(String recommendation) {
      this.recommendation = recommendation;
    }
  }

  public static class NewsArticle {
    private String title;
    private String summary;
    private String url;
    private String publishedAt;
    private String source;
    private Double alphaSentimentScore;
    private Double tickerSentimentScore;
    private Double relevanceScore;

    public String getTitle() {
      return title;
    }

    public void setTitle(String title) {
      this.title = title;
    }

    public String getSummary() {
      return summary;
    }

    public void setSummary(String summary) {
      this.summary = summary;
    }

    public String getUrl() {
      return url;
    }

    public void setUrl(String url) {
      this.url = url;
    }

    public String getPublishedAt() {
      return publishedAt;
    }

    public void setPublishedAt(String publishedAt) {
      this.publishedAt = publishedAt;
    }

    public String getSource() {
      return source;
    }

    public void setSource(String source) {
      this.source = source;
    }

    public Double getAlphaSentimentScore() {
      return alphaSentimentScore;
    }

    public void setAlphaSentimentScore(Double score) {
      this.alphaSentimentScore = score;
    }

    public Double getTickerSentimentScore() {
      return tickerSentimentScore;
    }

    public void setTickerSentimentScore(Double score) {
      this.tickerSentimentScore = score;
    }

    public Double getRelevanceScore() {
      return relevanceScore;
    }

    public void setRelevanceScore(Double score) {
      this.relevanceScore = score;
    }
  }

  public static class TechnicalIndicators {
    private Double rsi;
    private Double macd;
    private Double movingAverage50;
    private Double movingAverage200;

    public Double getRsi() {
      return rsi;
    }

    public void setRsi(Double rsi) {
      this.rsi = rsi;
    }

    public Double getMacd() {
      return macd;
    }

    public void setMacd(Double macd) {
      this.macd = macd;
    }

    public Double getMovingAverage50() {
      return movingAverage50;
    }

    public void setMovingAverage50(Double ma) {
      this.movingAverage50 = ma;
    }

    public Double getMovingAverage200() {
      return movingAverage200;
    }

    public void setMovingAverage200(Double ma) {
      this.movingAverage200 = ma;
    }
  }
}
