package com.example.mongo.services;

import com.example.mongo.models.StockMarketOHLC;
import com.example.mongo.models.dto.OHLCData;
import com.example.mongo.repos.StockMarketOHLCRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class MarketDataService {

  @Autowired private StockMarketOHLCRepository ohlcRepo;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private File findProjectRoot() {
    File cwd = new File(".");
    if (new File(cwd, "market_data_fetcher.py").exists()) {
      return cwd;
    }
    File upTwo = new File("../..");
    if (new File(upTwo, "market_data_fetcher.py").exists()) {
      return upTwo;
    }
    return cwd;
  }

  private String findPythonExecutable(File projectRoot) {
    File venvPython = new File(projectRoot, "venv/bin/python3");
    if (venvPython.exists()) {
      return venvPython.getAbsolutePath();
    }
    return "python3";
  }

  @SuppressWarnings("unchecked")
  public List<OHLCData> getOHLCData(String symbol, String period, String interval) {
    String upper = symbol.toUpperCase();

    // Check cache
    Optional<StockMarketOHLC> cached =
        ohlcRepo.findFirstBySymbolAndPeriodAndInterval(upper, period, interval);
    if (cached.isPresent()
        && cached.get().getExpiresAt() != null
        && cached.get().getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[MarketData] Returning cached OHLC for {} {} {}", upper, period, interval);
      return convertToOHLCData(cached.get().getData());
    }

    // Call Python
    log.info("[MarketData] Fetching OHLC for {} {} {}", upper, period, interval);
    Map<String, Object> result = callPython(upper, period, interval);
    if (result.isEmpty() || result.containsKey("error")) {
      log.error("[MarketData] Python error: {}", result.get("error"));
      // Return stale cache if available
      return cached.map(c -> convertToOHLCData(c.getData())).orElse(Collections.emptyList());
    }

    // Save to cache
    List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
    if (data == null || data.isEmpty()) {
      return Collections.emptyList();
    }

    ohlcRepo.deleteBySymbolAndPeriodAndInterval(upper, period, interval);

    StockMarketOHLC ohlc = new StockMarketOHLC();
    ohlc.setSymbol(upper);
    ohlc.setPeriod(period);
    ohlc.setInterval(interval);
    ohlc.setData(data);
    ohlc.setSourceCurrency((String) result.get("sourceCurrency"));
    ohlc.setExchangeRate(dbl(result.get("exchangeRate")));
    ohlc.setFetchedAt(LocalDateTime.now());
    ohlc.setExpiresAt(calculateExpiry(interval));
    ohlcRepo.save(ohlc);

    return convertToOHLCData(data);
  }

  private LocalDateTime calculateExpiry(String interval) {
    return switch (interval) {
      case "1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h" ->
          LocalDateTime.now().plusMinutes(15);
      case "1d" -> LocalDateTime.now().plusHours(4);
      case "1wk" -> LocalDateTime.now().plusHours(24);
      case "1mo" -> LocalDateTime.now().plusDays(7);
      default -> LocalDateTime.now().plusHours(4);
    };
  }

  private List<OHLCData> convertToOHLCData(List<Map<String, Object>> data) {
    if (data == null) return Collections.emptyList();
    List<OHLCData> result = new ArrayList<>();
    for (Map<String, Object> item : data) {
      OHLCData d =
          OHLCData.builder()
              .time(null)
              .open(dblVal(item.get("open")))
              .high(dblVal(item.get("high")))
              .low(dblVal(item.get("low")))
              .close(dblVal(item.get("close")))
              .volume(dblVal(item.get("volume")))
              .build();
      result.add(d);
    }
    return result;
  }

  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> getOHLCDataRaw(String symbol, String period, String interval) {
    String upper = symbol.toUpperCase();

    // Check cache
    Optional<StockMarketOHLC> cached =
        ohlcRepo.findFirstBySymbolAndPeriodAndInterval(upper, period, interval);
    if (cached.isPresent()
        && cached.get().getExpiresAt() != null
        && cached.get().getExpiresAt().isAfter(LocalDateTime.now())) {
      log.info("[MarketData] Returning cached OHLC for {} {} {}", upper, period, interval);
      return cached.get().getData();
    }

    // Call Python
    log.info("[MarketData] Fetching OHLC for {} {} {}", upper, period, interval);
    Map<String, Object> result = callPython(upper, period, interval);
    if (result.isEmpty() || result.containsKey("error")) {
      return cached.map(StockMarketOHLC::getData).orElse(Collections.emptyList());
    }

    List<Map<String, Object>> data = (List<Map<String, Object>>) result.get("data");
    if (data == null || data.isEmpty()) {
      return Collections.emptyList();
    }

    ohlcRepo.deleteBySymbolAndPeriodAndInterval(upper, period, interval);

    StockMarketOHLC ohlc = new StockMarketOHLC();
    ohlc.setSymbol(upper);
    ohlc.setPeriod(period);
    ohlc.setInterval(interval);
    ohlc.setData(data);
    ohlc.setSourceCurrency((String) result.get("sourceCurrency"));
    ohlc.setExchangeRate(dbl(result.get("exchangeRate")));
    ohlc.setFetchedAt(LocalDateTime.now());
    ohlc.setExpiresAt(calculateExpiry(interval));
    ohlcRepo.save(ohlc);

    return data;
  }

  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> searchTickers(String query) {
    try {
      File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);
      String scriptPath = new File(projectRoot, "market_data_fetcher.py").getAbsolutePath();
      ProcessBuilder pb = new ProcessBuilder(pythonExecutable, scriptPath, query, "search");
      pb.directory(projectRoot);
      pb.redirectErrorStream(true);

      Process process = pb.start();
      StringBuilder output = new StringBuilder();
      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) {
          output.append(line);
        }
      }

      int exitCode = process.waitFor();
      if (exitCode != 0) {
        log.error("[MarketData] Ticker search failed for '{}': {}", query, output);
        return Collections.emptyList();
      }

      Map<String, Object> result = objectMapper.readValue(output.toString(), Map.class);
      if (result.containsKey("error")) {
        log.error("[MarketData] Search error for '{}': {}", query, result.get("error"));
        return Collections.emptyList();
      }

      List<Map<String, Object>> results =
          (List<Map<String, Object>>) result.get("results");
      return results != null ? results : Collections.emptyList();
    } catch (Exception e) {
      log.error("[MarketData] Exception searching tickers for '{}': {}", query, e.getMessage());
      return Collections.emptyList();
    }
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> callPython(String symbol, String period, String interval) {
    try {
      File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);
      String scriptPath = new File(projectRoot, "market_data_fetcher.py").getAbsolutePath();
      ProcessBuilder pb =
          new ProcessBuilder(pythonExecutable, scriptPath, symbol, "ohlc", period, interval);
      pb.directory(projectRoot);
      pb.redirectErrorStream(true);

      Process process = pb.start();
      StringBuilder output = new StringBuilder();
      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) {
          output.append(line);
        }
      }

      int exitCode = process.waitFor();
      if (exitCode != 0) {
        log.error("[MarketData] Python script failed for {}: {}", symbol, output);
        return Collections.emptyMap();
      }

      Map<String, Object> result = objectMapper.readValue(output.toString(), Map.class);
      if (result.containsKey("error")) {
        log.error("[MarketData] Error for {}: {}", symbol, result.get("error"));
        return result;
      }
      return result;
    } catch (Exception e) {
      log.error("[MarketData] Exception calling Python for {}: {}", symbol, e.getMessage());
      return Collections.emptyMap();
    }
  }

  private Double dbl(Object val) {
    if (val == null) return null;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private double dblVal(Object val) {
    if (val == null) return 0.0;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return 0.0;
    }
  }
}
