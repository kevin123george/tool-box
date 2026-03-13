package dev.toolbox.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.toolbox.models.FxRateHistory;
import dev.toolbox.repos.FxRateHistoryRepository;
import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class FxRateService {

  @Autowired private FxRateHistoryRepository fxRateHistoryRepository;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private File findProjectRoot() {
    File cwd = new File(".");
    if (new File(cwd, "fx_fetcher.py").exists()) return cwd;
    File upTwo = new File("../..");
    if (new File(upTwo, "fx_fetcher.py").exists()) return upTwo;
    // Scripts copied next to jar by deploy.sh
    try {
      java.net.URL loc =
          FxRateService.class.getProtectionDomain().getCodeSource().getLocation();
      File jarDir = new File(loc.toURI()).getParentFile();
      if (new File(jarDir, "fx_fetcher.py").exists()) return jarDir;
    } catch (Exception ignored) {
    }
    return cwd;
  }

  private String findPythonExecutable(File projectRoot) {
    String[] candidates = {
      "../../../scripts/venv/bin/python3", // relative to CWD (jar dir)
      projectRoot.getPath() + "/scripts/venv/bin/python3", // dev bootRun
      projectRoot.getPath() + "/venv/bin/python3", // legacy
    };
    for (String path : candidates) {
      if (new File(path).exists()) return path;
    }
    return "python3";
  }

  @SuppressWarnings("unchecked")
  public FxRateHistory fetchAndSave(String from, String to) {
    String fromUpper = from.toUpperCase();
    String toUpper = to.toUpperCase();
    log.info("[FxRate] Fetching rate for {}/{}", fromUpper, toUpper);

    try {
      File projectRoot = findProjectRoot();
      String pythonExecutable = findPythonExecutable(projectRoot);
      String scriptPath = new File(projectRoot, "fx_fetcher.py").getAbsolutePath();
      ProcessBuilder pb =
          new ProcessBuilder(pythonExecutable, scriptPath, fromUpper, toUpper);
      pb.directory(projectRoot);

      Process process = pb.start();
      StringBuilder output = new StringBuilder();
      Thread stderrThread =
          new Thread(
              () -> {
                try (BufferedReader r =
                    new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                  while (r.readLine() != null) {}
                } catch (Exception ignored) {
                }
              });
      stderrThread.start();
      try (BufferedReader reader =
          new BufferedReader(new InputStreamReader(process.getInputStream()))) {
        String line;
        while ((line = reader.readLine()) != null) output.append(line);
      }
      stderrThread.join(3000);
      int exitCode = process.waitFor();

      if (exitCode != 0) {
        log.error("[FxRate] Python script failed for {}/{}: {}", fromUpper, toUpper, output);
        return null;
      }

      Map<String, Object> result = objectMapper.readValue(output.toString(), Map.class);
      if (result.containsKey("error")) {
        log.error("[FxRate] Error fetching {}/{}: {}", fromUpper, toUpper, result.get("error"));
        return null;
      }

      Double rate = parseDouble(result.get("rate"));
      if (rate == null) {
        log.error("[FxRate] No rate field in response for {}/{}", fromUpper, toUpper);
        return null;
      }

      FxRateHistory entry = new FxRateHistory();
      entry.setFromCurrency(fromUpper);
      entry.setToCurrency(toUpper);
      entry.setRate(rate);
      FxRateHistory saved = fxRateHistoryRepository.save(entry);
      log.info("[FxRate] Saved rate {}/{} = {}", fromUpper, toUpper, rate);
      return saved;

    } catch (Exception e) {
      log.error("[FxRate] Exception fetching {}/{}: {}", fromUpper, toUpper, e.getMessage());
      return null;
    }
  }

  public List<FxRateHistory> getHistory(String from, String to, int days) {
    String fromUpper = from.toUpperCase();
    String toUpper = to.toUpperCase();
    if (days <= 0) {
      return fxRateHistoryRepository
          .findByFromCurrencyAndToCurrencyOrderByFetchedAtAsc(fromUpper, toUpper);
    }
    Instant after = Instant.now().minus(days, ChronoUnit.DAYS);
    return fxRateHistoryRepository
        .findByFromCurrencyAndToCurrencyAndFetchedAtAfterOrderByFetchedAtAsc(
            fromUpper, toUpper, after);
  }

  public Optional<FxRateHistory> getLatestRate(String from, String to) {
    return fxRateHistoryRepository
        .findFirstByFromCurrencyAndToCurrencyOrderByFetchedAtDesc(
            from.toUpperCase(), to.toUpperCase());
  }

  public void pruneOldData() {
    Instant cutoff = Instant.now().minus(90, ChronoUnit.DAYS);
    log.info("[FxRate] Pruning entries older than 90 days (before {})", cutoff);
    fxRateHistoryRepository.deleteByFromCurrencyAndToCurrencyAndFetchedAtBefore(
        "INR", "EUR", cutoff);
  }

  private Double parseDouble(Object val) {
    if (val == null) return null;
    try {
      return Double.parseDouble(val.toString());
    } catch (NumberFormatException e) {
      return null;
    }
  }
}
