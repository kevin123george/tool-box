package dev.toolbox.controller;

import dev.toolbox.models.FxRateHistory;
import dev.toolbox.services.FxRateService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/fx")
@CrossOrigin(origins = "*")
public class FxRateController {

  @Autowired private FxRateService fxRateService;

  @GetMapping("/history")
  public List<FxRateHistory> getHistory(
      @RequestParam(defaultValue = "INR") String from,
      @RequestParam(defaultValue = "EUR") String to,
      @RequestParam(defaultValue = "30") int days) {
    return fxRateService.getHistory(from, to, days);
  }

  @GetMapping("/latest")
  public FxRateHistory getLatest(
      @RequestParam(defaultValue = "INR") String from,
      @RequestParam(defaultValue = "EUR") String to) {
    return fxRateService.getLatestRate(from, to).orElse(null);
  }

  @PostMapping("/refresh")
  public FxRateHistory refresh(
      @RequestParam(defaultValue = "INR") String from,
      @RequestParam(defaultValue = "EUR") String to) {
    return fxRateService.fetchAndSave(from, to);
  }
}
