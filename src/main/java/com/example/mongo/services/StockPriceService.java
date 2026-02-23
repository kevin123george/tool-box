package com.example.mongo.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StockPriceService {

  private final ObjectMapper objectMapper = new ObjectMapper();

  /**
   * Find the best available Python executable Priority: venv python3 > system python3 > system
   * python
   */
  private String findPythonExecutable() {
    // Try venv first (relative to where JAR is running)
    String venvPython = "../venv/bin/python3";
    if (new java.io.File(venvPython).exists()) {
      return venvPython;
    }

    // Fall back to system python3
    return "python3";
  }

  public Map<String, Object> getStockPrice(String ticker, String currency)
      throws IOException, InterruptedException {
    // Path to the Python script
    String pythonScript = "stock_fetcher.py";

    // Use python3 explicitly from venv or system
    String pythonExecutable = findPythonExecutable();

    // Build the command
    ProcessBuilder processBuilder =
        new ProcessBuilder(
            pythonExecutable, pythonScript, ticker, currency != null ? currency : "USD");

    // Redirect error stream to output stream
    processBuilder.redirectErrorStream(true);

    // Start the process
    Process process = processBuilder.start();

    // Read the output
    StringBuilder output = new StringBuilder();
    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(process.getInputStream()))) {
      String line;
      while ((line = reader.readLine()) != null) {
        output.append(line);
      }
    }

    // Wait for the process to complete
    int exitCode = process.waitFor();

    if (exitCode != 0) {
      throw new RuntimeException(
          "Python script failed with exit code: " + exitCode + ", output: " + output);
    }

    // Parse JSON response from Python
    JsonNode jsonNode = objectMapper.readTree(output.toString());

    Map<String, Object> result = new HashMap<>();
    result.put("ticker", jsonNode.get("ticker").asText());
    result.put("timestamp", jsonNode.get("timestamp").asText());
    result.put("price", jsonNode.get("price").asDouble());
    result.put("currency", jsonNode.get("currency").asText());
    result.put("base_price_usd", jsonNode.get("base_price_usd").asDouble());
    result.put("exchange_rate", jsonNode.get("exchange_rate").asDouble());

    return result;
  }

  public List<Map<String, Object>> getStockHistory(String ticker, String startDate, String currency)
      throws IOException, InterruptedException {
    String pythonScript = "stock_history_fetcher.py";
    String pythonExecutable = findPythonExecutable();

    ProcessBuilder processBuilder =
        new ProcessBuilder(
            pythonExecutable, pythonScript, ticker, startDate, currency != null ? currency : "USD");
    processBuilder.redirectErrorStream(true);

    Process process = processBuilder.start();
    StringBuilder output = new StringBuilder();
    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(process.getInputStream()))) {
      String line;
      while ((line = reader.readLine()) != null) output.append(line);
    }

    int exitCode = process.waitFor();
    if (exitCode != 0) {
      throw new RuntimeException(
          "History script failed with exit code: " + exitCode + ", output: " + output);
    }

    JsonNode root = objectMapper.readTree(output.toString());
    List<Map<String, Object>> result = new ArrayList<>();
    if (root.isArray()) {
      for (JsonNode node : root) {
        Map<String, Object> entry = new HashMap<>();
        entry.put("date", node.get("date").asText());
        entry.put("price", node.get("price").asDouble());
        result.add(entry);
      }
    }
    return result;
  }
}
