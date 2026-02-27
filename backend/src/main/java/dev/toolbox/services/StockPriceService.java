package dev.toolbox.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class StockPriceService {

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final PythonPricePool pricePool;

  @Autowired
  public StockPriceService(PythonPricePool pricePool) {
    this.pricePool = pricePool;
  }

  /** Delegate live price fetch to the persistent daemon pool (no Python startup overhead). */
  public Map<String, Object> getStockPrice(String ticker, String currency) throws Exception {
    return pricePool.getPrice(ticker, currency != null ? currency : "USD");
  }

  // ── helpers used by getStockHistory() below ──────────────────────────────

  private String findPythonExecutable() {
    String[] candidates = {
      "../../../scripts/venv/bin/python3",
      "scripts/venv/bin/python3",
      "../venv/bin/python3",
    };
    for (String path : candidates) {
      if (new java.io.File(path).exists()) return path;
    }
    return "python3";
  }

  private String resolveScript(String scriptName) {
    java.io.File cwd = new java.io.File(scriptName);
    if (cwd.exists()) return scriptName;
    try {
      java.net.URL loc =
          StockPriceService.class.getProtectionDomain().getCodeSource().getLocation();
      java.io.File jarDir = new java.io.File(loc.toURI()).getParentFile();
      java.io.File next = new java.io.File(jarDir, scriptName);
      if (next.exists()) return next.getAbsolutePath();
    } catch (Exception ignored) {
    }
    return scriptName;
  }

  public List<Map<String, Object>> getStockHistory(String ticker, String startDate, String currency)
      throws IOException, InterruptedException {
    String pythonScript = resolveScript("stock_history_fetcher.py");
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
