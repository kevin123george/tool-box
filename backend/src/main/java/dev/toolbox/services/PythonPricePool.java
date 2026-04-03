package dev.toolbox.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Pool of persistent Python daemon processes for fetching live stock prices. Eliminates per-call
 * Python startup overhead (~0.5–1 s) by keeping N processes alive. Each daemon reads JSON requests
 * from stdin and writes JSON responses to stdout.
 */
@Slf4j
@Service
public class PythonPricePool {

  private static final int POOL_SIZE = 4;

  private final ObjectMapper objectMapper = new ObjectMapper();
  private final BlockingQueue<DaemonHandle> pool = new ArrayBlockingQueue<>(POOL_SIZE);

  private String pythonExec;
  private String daemonScript;

  @PostConstruct
  public void init() {
    pythonExec = findPythonExecutable();
    daemonScript = resolveScript("stock_daemon.py");
    log.info("[PricePool] python={} script={}", pythonExec, daemonScript);
    for (int i = 0; i < POOL_SIZE; i++) {
      try {
        pool.put(spawn());
      } catch (Exception e) {
        log.error("[PricePool] Failed to start daemon #{}: {}", i, e.getMessage());
      }
    }
    log.info("[PricePool] Initialized — {} daemons ready (pool size {})", pool.size(), POOL_SIZE);
  }

  private DaemonHandle spawn() throws IOException {
    // -u = unbuffered I/O: ensures stdout/stderr are flushed immediately, even on crash
    ProcessBuilder pb = new ProcessBuilder(pythonExec, "-u", daemonScript);
    Process proc = pb.start();

    // Drain stderr at WARN so Python tracebacks appear in the log
    Process procRef = proc;
    Thread drainer =
        new Thread(
            () -> {
              try (BufferedReader r =
                  new BufferedReader(new InputStreamReader(procRef.getErrorStream()))) {
                String line;
                while ((line = r.readLine()) != null) {
                  log.warn("[PricePool daemon stderr pid={}] {}", procRef.pid(), line);
                }
              } catch (IOException ignored) {
              }
            },
            "price-daemon-stderr-" + proc.pid());
    drainer.setDaemon(true);
    drainer.start();

    BufferedWriter stdin = new BufferedWriter(new OutputStreamWriter(proc.getOutputStream()));
    BufferedReader stdout = new BufferedReader(new InputStreamReader(proc.getInputStream()));
    log.info("[PricePool] Spawned daemon pid={}", proc.pid());
    return new DaemonHandle(proc, stdin, stdout);
  }

  /**
   * Fetch a live price via the daemon pool. Blocks until a daemon is available (pool size controls
   * max concurrency).
   *
   * <p>Only kills and replaces the daemon on I/O failures (stdout closed, parse error). Logical
   * errors from Python (market closed, delisted ticker, etc.) are propagated without touching the
   * daemon — it stays healthy in the pool.
   */
  public Map<String, Object> getPrice(String ticker, String currency) throws Exception {
    DaemonHandle daemon = pool.take(); // blocks until one is free
    boolean returnedToPool = false;
    try {
      if (!daemon.process().isAlive()) {
        log.warn("[PricePool] Daemon was dead — replacing before use");
        daemon = spawn();
      }

      String request =
          objectMapper.writeValueAsString(
              Map.of("ticker", ticker.toUpperCase(), "currency", currency.toUpperCase()));
      daemon.stdin().write(request);
      daemon.stdin().newLine();
      daemon.stdin().flush();

      String responseLine = daemon.stdout().readLine();
      if (responseLine == null) {
        // I/O failure — daemon exited unexpectedly; caller's catch will replace it
        throw new IOException("Daemon stdout closed unexpectedly");
      }

      JsonNode node = objectMapper.readTree(responseLine);

      // Daemon is alive and responded — return it to the pool regardless of logical outcome
      pool.put(daemon);
      returnedToPool = true;

      if (node.has("error")) {
        // Logical failure (market closed, bad symbol, etc.) — daemon is healthy
        throw new RuntimeException("Daemon reported: " + node.get("error").asText());
      }

      Map<String, Object> result = new HashMap<>();
      result.put("ticker", node.get("ticker").asText());
      result.put("timestamp", node.get("timestamp").asText());
      result.put("price", node.get("price").asDouble());
      result.put("currency", node.get("currency").asText());
      result.put("base_price_usd", node.get("base_price_usd").asDouble());
      result.put("exchange_rate", node.get("exchange_rate").asDouble());
      if (node.has("previous_close") && !node.get("previous_close").isNull()) {
        result.put("previous_close", node.get("previous_close").asDouble());
      }
      return result;

    } catch (Exception e) {
      if (!returnedToPool) {
        // I/O or infrastructure failure — daemon may be corrupted; kill and replace
        try {
          daemon.process().destroyForcibly();
        } catch (Exception ignored) {
        }
        try {
          pool.put(spawn());
        } catch (Exception ex) {
          log.error("[PricePool] Failed to spawn replacement daemon: {}", ex.getMessage());
        }
      }
      throw e;
    }
  }

  @PreDestroy
  public void destroy() {
    DaemonHandle h;
    while ((h = pool.poll()) != null) {
      h.process().destroyForcibly();
    }
    log.info("[PricePool] All daemon processes destroyed");
  }

  private String findPythonExecutable() {
    // CWD is backend/build/libs/ when jar is started; venv is at ../../../scripts/venv
    String[] candidates = {
      "../../../scripts/venv/bin/python3", // deployed: backend/build/libs/ → project/scripts/venv
      "scripts/venv/bin/python3", // dev bootRun from project root
      "../venv/bin/python3", // legacy layout
    };
    for (String path : candidates) {
      if (new java.io.File(path).exists()) return path;
    }
    return "python3";
  }

  private String resolveScript(String scriptName) {
    String[] candidates = {
            "scripts/" + scriptName,
            "./scripts/" + scriptName,
            scriptName
    };

    for (String path : candidates) {
      java.io.File f = new java.io.File(path);
      if (f.exists()) {
        log.info("[PricePool] Using script path: {}", f.getAbsolutePath());
        return f.getPath();
      }
    }
    log.warn("[PricePool] Script not found, falling back to {}", scriptName);
    return scriptName;
  }

  private record DaemonHandle(Process process, BufferedWriter stdin, BufferedReader stdout) {}
}
