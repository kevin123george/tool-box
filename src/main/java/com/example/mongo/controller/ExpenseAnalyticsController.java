package com.example.mongo.controller;

import com.example.mongo.models.dto.AnomalyDTO;
import com.example.mongo.models.dto.CategoryTrendDTO;
import com.example.mongo.models.dto.MonthlyAnalyticsDTO;
import com.example.mongo.services.ExpenseAnalyticsService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class ExpenseAnalyticsController {

  @Autowired private ExpenseAnalyticsService analyticsService;

  @GetMapping("/category-trends")
  public ResponseEntity<List<CategoryTrendDTO>> getCategoryTrends(
      @RequestParam(defaultValue = "6") int months) {
    return ResponseEntity.ok(analyticsService.getCategoryTrends(months));
  }

  @GetMapping("/monthly")
  public ResponseEntity<List<MonthlyAnalyticsDTO>> getMonthlyAnalytics(
      @RequestParam(defaultValue = "6") int months) {
    return ResponseEntity.ok(analyticsService.getMonthlyAnalytics(months));
  }

  @GetMapping("/anomalies")
  public ResponseEntity<List<AnomalyDTO>> getAnomalies() {
    return ResponseEntity.ok(analyticsService.getAnomalies());
  }
}
