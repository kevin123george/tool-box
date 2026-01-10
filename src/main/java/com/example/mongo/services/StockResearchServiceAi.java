// package com.example.mongo.service;
//
// import com.example.mongo.models.StockHoldingHistory;
// import com.example.mongo.models.StockResearchReport;
// import com.example.mongo.repos.StockHoldingHistoryRepository;
// import com.example.mongo.repos.StockResearchReportRepository;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.stereotype.Service;
// import org.springframework.web.client.RestTemplate;
// import org.springframework.http.*;
//
// import java.time.LocalDateTime;
// import java.util.*;
// import java.util.stream.Collectors;
//
/// **
// * AI-POWERED VERSION with Claude API
// * Swap this file with StockResearchService_NoAI.java to enable AI recommendations
// */
// @Service
// public class StockResearchServiceAi {
//
//    @Autowired
//    private StockHoldingHistoryRepository holdingRepository;
//
//    @Autowired
//    private StockResearchReportRepository reportRepository;
//
//    @Value("${alpha.vantage.api.key:}")
//    private String alphaVantageKey;
//
//    @Value("${anthropic.api.key:}")
//    private String anthropicApiKey;
//
//    private final RestTemplate restTemplate = new RestTemplate();
//
//    /**
//     * Main method to generate research report with AI analysis
//     */
//    public StockResearchReport generateResearchReport() {
//        List<StockHoldingHistory> holdings = getLatestHoldings();
//        Map<String, StockAnalysis> analyses = new HashMap<>();
//
//        // Collect data for each stock
//        for (StockHoldingHistory holding : holdings) {
//            StockAnalysis analysis = analyzeStock(holding.getSymbol());
//            analyses.put(holding.getSymbol(), analysis);
//        }
//
//        // Use Claude AI to generate comprehensive recommendations
//        String aiRecommendations = generateAIRecommendations(holdings, analyses);
//
//        StockResearchReport report = new StockResearchReport();
//        report.setGeneratedAt(LocalDateTime.now());
//        report.setHoldings(holdings);
//        report.setAnalyses(analyses);
//        report.setRecommendations(aiRecommendations);
//        report.setOverallSentiment(calculateOverallSentiment(analyses));
//
//        calculatePortfolioMetrics(report, holdings);
//
//        return reportRepository.save(report);
//    }
//
//    /**
//     * Get latest holding for each unique symbol
//     */
//    private List<StockHoldingHistory> getLatestHoldings() {
//        List<StockHoldingHistory> allHoldings = (List<StockHoldingHistory>)
// holdingRepository.findAll();
//
//        Map<String, StockHoldingHistory> latestBySymbol = new HashMap<>();
//        for (StockHoldingHistory holding : allHoldings) {
//            StockHoldingHistory existing = latestBySymbol.get(holding.getSymbol());
//            if (existing == null || holding.getUpdatedAt().isAfter(existing.getUpdatedAt())) {
//                latestBySymbol.put(holding.getSymbol(), holding);
//            }
//        }
//
//        return new ArrayList<>(latestBySymbol.values());
//    }
//
//    /**
//     * Analyze a single stock
//     */
//    private StockAnalysis analyzeStock(String symbol) {
//        StockAnalysis analysis = new StockAnalysis();
//        analysis.setSymbol(symbol);
//        analysis.setNews(fetchNews(symbol));
//        analysis.setTechnicalIndicators(fetchTechnicalIndicators(symbol));
//        analysis.setSentimentScore(calculateSentiment(analysis.getNews()));
//
//        return analysis;
//    }
//
//    /**
//     * Fetch news with sentiment from Alpha Vantage
//     */
//    private List<NewsArticle> fetchNews(String symbol) {
//        if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
//            return Collections.emptyList();
//        }
//
//        try {
//            String url = String.format(
//
// "https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=%s&limit=10&apikey=%s",
//                    symbol, alphaVantageKey
//            );
//
//            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
//
//            if (response == null || !response.containsKey("feed")) {
//                return Collections.emptyList();
//            }
//
//            List<Map<String, Object>> feed = (List<Map<String, Object>>) response.get("feed");
//
//            return feed.stream()
//                    .limit(5)
//                    .map(article -> {
//                        NewsArticle news = new NewsArticle();
//                        news.setTitle((String) article.get("title"));
//                        news.setSummary((String) article.get("summary"));
//                        news.setUrl((String) article.get("url"));
//                        news.setPublishedAt((String) article.get("time_published"));
//
//                        List<Map<String, String>> authors = (List<Map<String, String>>)
// article.get("authors");
//                        if (authors != null && !authors.isEmpty()) {
//                            news.setSource(authors.get(0).get("name"));
//                        }
//
//                        Double overallScore = parseDouble(article.get("overall_sentiment_score"));
//                        news.setAlphaSentimentScore(overallScore);
//
//                        List<Map<String, Object>> tickerSentiment = (List<Map<String, Object>>)
// article.get("ticker_sentiment");
//                        if (tickerSentiment != null) {
//                            for (Map<String, Object> ts : tickerSentiment) {
//                                if (symbol.equalsIgnoreCase((String) ts.get("ticker"))) {
//
// news.setRelevanceScore(parseDouble(ts.get("relevance_score")));
//
// news.setTickerSentimentScore(parseDouble(ts.get("ticker_sentiment_score")));
//                                    break;
//                                }
//                            }
//                        }
//
//                        return news;
//                    })
//                    .collect(Collectors.toList());
//        } catch (Exception e) {
//            System.err.println("Error fetching news for " + symbol + ": " + e.getMessage());
//            return Collections.emptyList();
//        }
//    }
//
//    /**
//     * Fetch technical indicators from Alpha Vantage
//     */
//    private TechnicalIndicators fetchTechnicalIndicators(String symbol) {
//        TechnicalIndicators indicators = new TechnicalIndicators();
//
//        if (alphaVantageKey == null || alphaVantageKey.isEmpty()) {
//            return indicators;
//        }
//
//        try {
//            // Fetch RSI
//            String rsiUrl = String.format(
//
// "https://www.alphavantage.co/query?function=RSI&symbol=%s&interval=daily&time_period=14&series_type=close&apikey=%s",
//                    symbol, alphaVantageKey
//            );
//            Map<String, Object> rsiResponse = restTemplate.getForObject(rsiUrl, Map.class);
//            indicators.setRsi(parseLatestIndicator(rsiResponse, "Technical Analysis: RSI"));
//
//            Thread.sleep(500);
//
//            // Fetch MACD
//            String macdUrl = String.format(
//
// "https://www.alphavantage.co/query?function=MACD&symbol=%s&interval=daily&series_type=close&apikey=%s",
//                    symbol, alphaVantageKey
//            );
//            Map<String, Object> macdResponse = restTemplate.getForObject(macdUrl, Map.class);
//            Double macd = parseLatestIndicator(macdResponse, "Technical Analysis: MACD");
//            indicators.setMacd(macd);
//
//        } catch (Exception e) {
//            System.err.println("Error fetching technical indicators for " + symbol + ": " +
// e.getMessage());
//        }
//
//        return indicators;
//    }
//
//    /**
//     * Calculate sentiment score using Alpha Vantage scores
//     */
//    private double calculateSentiment(List<NewsArticle> news) {
//        if (news.isEmpty()) {
//            return 0.0;
//        }
//
//        double totalSentiment = 0.0;
//        int validCount = 0;
//
//        for (NewsArticle article : news) {
//            if (article.getTickerSentimentScore() != null) {
//                totalSentiment += article.getTickerSentimentScore();
//                validCount++;
//            } else if (article.getAlphaSentimentScore() != null) {
//                totalSentiment += article.getAlphaSentimentScore();
//                validCount++;
//            }
//        }
//
//        return validCount > 0 ? totalSentiment / validCount : 0.0;
//    }
//
//    /**
//     * Generate AI-powered recommendations using Claude
//     */
//    private String generateAIRecommendations(List<StockHoldingHistory> holdings, Map<String,
// StockAnalysis> analyses) {
//        if (anthropicApiKey == null || anthropicApiKey.isEmpty()) {
//            return "AI recommendations unavailable - API key not configured. Using rule-based
// analysis.";
//        }
//
//        try {
//            // Build comprehensive context for Claude
//            StringBuilder context = new StringBuilder();
//            context.append("You are an expert financial advisor analyzing a stock portfolio.
// Provide clear, actionable recommendations.\n\n");
//
//            context.append("CURRENT HOLDINGS:\n");
//            context.append("═══════════════════════════════════════════════════════════════\n");
//            for (StockHoldingHistory holding : holdings) {
//                double currentValue = holding.getCurrentPrice() * holding.getQuantity();
//                double costBasis = holding.getBuyPrice() * holding.getQuantity();
//                double gain = currentValue - costBasis;
//                double gainPct = (gain / costBasis) * 100;
//
//                context.append(String.format("%s: %.2f shares @ $%.2f\n",
//                        holding.getSymbol(), holding.getQuantity(), holding.getBuyPrice()));
//                context.append(String.format("  Current: $%.2f | Value: $%.2f | P/L: $%.2f
// (%.2f%%)\n\n",
//                        holding.getCurrentPrice(), currentValue, gain, gainPct));
//            }
//
//            context.append("\nMARKET DATA & ANALYSIS:\n");
//            context.append("═══════════════════════════════════════════════════════════════\n");
//            for (Map.Entry<String, StockAnalysis> entry : analyses.entrySet()) {
//                String symbol = entry.getKey();
//                StockAnalysis analysis = entry.getValue();
//
//                context.append(String.format("\n%s Analysis:\n", symbol));
//                context.append(String.format("  Sentiment Score: %.3f ",
// analysis.getSentimentScore()));
//                if (analysis.getSentimentScore() > 0.2) {
//                    context.append("(BULLISH)\n");
//                } else if (analysis.getSentimentScore() < -0.2) {
//                    context.append("(BEARISH)\n");
//                } else {
//                    context.append("(NEUTRAL)\n");
//                }
//
//                TechnicalIndicators tech = analysis.getTechnicalIndicators();
//                if (tech.getRsi() != null) {
//                    context.append(String.format("  RSI(14): %.1f ", tech.getRsi()));
//                    if (tech.getRsi() > 70) {
//                        context.append("(OVERBOUGHT)\n");
//                    } else if (tech.getRsi() < 30) {
//                        context.append("(OVERSOLD)\n");
//                    } else {
//                        context.append("(NEUTRAL)\n");
//                    }
//                }
//
//                if (tech.getMacd() != null) {
//                    context.append(String.format("  MACD: %.3f %s\n",
//                            tech.getMacd(), tech.getMacd() > 0 ? "(Bullish)" : "(Bearish)"));
//                }
//
//                context.append("\n  Recent News:\n");
//                for (NewsArticle news : analysis.getNews()) {
//                    if (news.getTickerSentimentScore() != null) {
//                        context.append(String.format("  • [Sentiment: %.2f] %s\n",
//                                news.getTickerSentimentScore(), news.getTitle()));
//                    } else {
//                        context.append(String.format("  • %s\n", news.getTitle()));
//                    }
//                }
//            }
//
//            context.append("\n\nPROVIDE RECOMMENDATIONS:\n");
//            context.append("For each stock, give:\n");
//            context.append("1. Clear action: BUY/HOLD/SELL (or specific actions like TAKE PROFITS,
// AVERAGE DOWN)\n");
//            context.append("2. Brief reasoning (2-3 sentences)\n");
//            context.append("3. Key risk factors\n");
//            context.append("4. Price targets if relevant\n\n");
//            context.append("Consider the investor's current position (gains/losses) in your
// recommendations.\n");
//            context.append("Be direct and actionable. Format clearly with stock symbols as
// headers.");
//
//            // Call Claude API
//            HttpHeaders headers = new HttpHeaders();
//            headers.setContentType(MediaType.APPLICATION_JSON);
//            headers.set("x-api-key", anthropicApiKey);
//            headers.set("anthropic-version", "2023-06-01");
//
//            Map<String, Object> requestBody = new HashMap<>();
//            requestBody.put("model", "claude-sonnet-4-20250514");
//            requestBody.put("max_tokens", 2048);
//            requestBody.put("messages", Arrays.asList(
//                    Map.of("role", "user", "content", context.toString())
//            ));
//
//            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
//            ResponseEntity<Map> response = restTemplate.exchange(
//                    "https://api.anthropic.com/v1/messages",
//                    HttpMethod.POST,
//                    request,
//                    Map.class
//            );
//
//            List<Map<String, Object>> content = (List<Map<String, Object>>)
// response.getBody().get("content");
//            return (String) content.get(0).get("text");
//
//        } catch (Exception e) {
//            System.err.println("Error calling Claude API: " + e.getMessage());
//            e.printStackTrace();
//
//            // Fallback to rule-based recommendations
//            return generateFallbackRecommendations(holdings, analyses);
//        }
//    }
//
//    /**
//     * Fallback rule-based recommendations if AI fails
//     */
//    private String generateFallbackRecommendations(List<StockHoldingHistory> holdings, Map<String,
// StockAnalysis> analyses) {
//        StringBuilder rec = new StringBuilder();
//        rec.append("AI UNAVAILABLE - RULE-BASED ANALYSIS:\n");
//        rec.append("═══════════════════════════════════════════\n\n");
//
//        for (StockHoldingHistory holding : holdings) {
//            StockAnalysis analysis = analyses.get(holding.getSymbol());
//            if (analysis == null) continue;
//
//            double currentValue = holding.getCurrentPrice() * holding.getQuantity();
//            double costBasis = holding.getBuyPrice() * holding.getQuantity();
//            double gain = currentValue - costBasis;
//            double gainPct = (gain / costBasis) * 100;
//
//            rec.append(String.format("%s:\n", holding.getSymbol()));
//            rec.append(String.format("Position: %.2f shares @ $%.2f (Current: $%.2f)\n",
//                    holding.getQuantity(), holding.getBuyPrice(), holding.getCurrentPrice()));
//            rec.append(String.format("P/L: $%.2f (%.2f%%)\n\n", gain, gainPct));
//
//            double sentiment = analysis.getSentimentScore();
//            Double rsi = analysis.getTechnicalIndicators().getRsi();
//
//            // Simple rule-based logic
//            if (gainPct < -10) {
//                if (sentiment > 0.3) {
//                    rec.append("→ HOLD & AVERAGE DOWN - Despite loss, positive sentiment suggests
// recovery\n");
//                } else {
//                    rec.append("→ CONSIDER CUTTING LOSSES - Negative momentum with significant
// loss\n");
//                }
//            } else if (gainPct > 20) {
//                if (sentiment < -0.2 || (rsi != null && rsi > 75)) {
//                    rec.append("→ TAKE PROFITS - Strong gains with weakening signals\n");
//                } else {
//                    rec.append("→ HOLD & TRAIL STOP - Continue riding momentum\n");
//                }
//            } else {
//                if (sentiment > 0.3 && (rsi == null || rsi < 70)) {
//                    rec.append("→ CONSIDER BUYING - Strong sentiment with room to run\n");
//                } else if (sentiment < -0.3) {
//                    rec.append("→ CONSIDER REDUCING - Weakening fundamentals\n");
//                } else {
//                    rec.append("→ HOLD - No strong signals\n");
//                }
//            }
//
//            rec.append("\n");
//        }
//
//        return rec.toString();
//    }
//
//    /**
//     * Calculate overall portfolio sentiment
//     */
//    private String calculateOverallSentiment(Map<String, StockAnalysis> analyses) {
//        double avgSentiment = analyses.values().stream()
//                .mapToDouble(StockAnalysis::getSentimentScore)
//                .average()
//                .orElse(0.0);
//
//        if (avgSentiment > 0.3) return "BULLISH";
//        if (avgSentiment < -0.3) return "BEARISH";
//        return "NEUTRAL";
//    }
//
//    /**
//     * Calculate portfolio-wide metrics
//     */
//    private void calculatePortfolioMetrics(StockResearchReport report, List<StockHoldingHistory>
// holdings) {
//        double totalValue = 0.0;
//        double totalCost = 0.0;
//
//        for (StockHoldingHistory holding : holdings) {
//            totalCost += holding.getBuyPrice() * holding.getQuantity();
//            totalValue += holding.getCurrentPrice() * holding.getQuantity();
//        }
//
//        report.setTotalValue(totalValue);
//        report.setTotalGain(totalValue - totalCost);
//        report.setGainPercentage(totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 :
// 0.0);
//    }
//
//    private Double parseDouble(Object value) {
//        if (value == null) return null;
//        if (value instanceof Number) return ((Number) value).doubleValue();
//        try {
//            return Double.parseDouble(value.toString());
//        } catch (NumberFormatException e) {
//            return null;
//        }
//    }
//
//    private Double parseLatestIndicator(Map<String, Object> response, String key) {
//        try {
//            Map<String, Map<String, String>> data = (Map<String, Map<String, String>>)
// response.get(key);
//            if (data == null || data.isEmpty()) return null;
//
//            String latestDate = data.keySet().stream()
//                    .sorted(Comparator.reverseOrder())
//                    .findFirst()
//                    .orElse(null);
//
//            if (latestDate == null) return null;
//
//            String value = data.get(latestDate).values().stream().findFirst().orElse("0");
//            return Double.parseDouble(value);
//        } catch (Exception e) {
//            return null;
//        }
//    }
//
//    // Inner classes
//    public static class StockAnalysis {
//        private String symbol;
//        private List<NewsArticle> news;
//        private TechnicalIndicators technicalIndicators;
//        private double sentimentScore;
//        private String recommendation;
//
//        public String getSymbol() { return symbol; }
//        public void setSymbol(String symbol) { this.symbol = symbol; }
//        public List<NewsArticle> getNews() { return news; }
//        public void setNews(List<NewsArticle> news) { this.news = news; }
//        public TechnicalIndicators getTechnicalIndicators() { return technicalIndicators; }
//        public void setTechnicalIndicators(TechnicalIndicators indicators) {
// this.technicalIndicators = indicators; }
//        public double getSentimentScore() { return sentimentScore; }
//        public void setSentimentScore(double score) { this.sentimentScore = score; }
//        public String getRecommendation() { return recommendation; }
//        public void setRecommendation(String recommendation) { this.recommendation =
// recommendation; }
//    }
//
//    public static class NewsArticle {
//        private String title;
//        private String summary;
//        private String url;
//        private String publishedAt;
//        private String source;
//        private Double alphaSentimentScore;
//        private Double tickerSentimentScore;
//        private Double relevanceScore;
//
//        public String getTitle() { return title; }
//        public void setTitle(String title) { this.title = title; }
//        public String getSummary() { return summary; }
//        public void setSummary(String summary) { this.summary = summary; }
//        public String getUrl() { return url; }
//        public void setUrl(String url) { this.url = url; }
//        public String getPublishedAt() { return publishedAt; }
//        public void setPublishedAt(String publishedAt) { this.publishedAt = publishedAt; }
//        public String getSource() { return source; }
//        public void setSource(String source) { this.source = source; }
//        public Double getAlphaSentimentScore() { return alphaSentimentScore; }
//        public void setAlphaSentimentScore(Double score) { this.alphaSentimentScore = score; }
//        public Double getTickerSentimentScore() { return tickerSentimentScore; }
//        public void setTickerSentimentScore(Double score) { this.tickerSentimentScore = score; }
//        public Double getRelevanceScore() { return relevanceScore; }
//        public void setRelevanceScore(Double score) { this.relevanceScore = score; }
//    }
//
//    public static class TechnicalIndicators {
//        private Double rsi;
//        private Double macd;
//        private Double movingAverage50;
//        private Double movingAverage200;
//
//        public Double getRsi() { return rsi; }
//        public void setRsi(Double rsi) { this.rsi = rsi; }
//        public Double getMacd() { return macd; }
//        public void setMacd(Double macd) { this.macd = macd; }
//        public Double getMovingAverage50() { return movingAverage50; }
//        public void setMovingAverage50(Double ma) { this.movingAverage50 = ma; }
//        public Double getMovingAverage200() { return movingAverage200; }
//        public void setMovingAverage200(Double ma) { this.movingAverage200 = ma; }
//    }
// }
