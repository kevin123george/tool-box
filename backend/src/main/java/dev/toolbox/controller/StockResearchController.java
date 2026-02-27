package dev.toolbox.controller;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.StockResearchReport;
import dev.toolbox.repos.StockResearchReportRepository;
import dev.toolbox.services.StockResearchService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/research")
public class StockResearchController {

  @Autowired private StockResearchService researchService;

  @Autowired private StockResearchReportRepository reportRepository;

  @Autowired private AuthUtils authUtils;

  /** Generate a new research report */
  @PostMapping("/generate")
  public StockResearchReport generateReport() {
    return researchService.generateResearchReport(authUtils.getCurrentUserId());
  }

  /** Get latest research report */
  @GetMapping("/latest")
  public StockResearchReport getLatestReport() {
    return reportRepository.findFirstByUserIdOrderByGeneratedAtDesc(authUtils.getCurrentUserId());
  }

  /** Get all research reports */
  @GetMapping
  public List<StockResearchReport> getAllReports() {
    return reportRepository.findAllByUserId(authUtils.getCurrentUserId());
  }

  /** Get report by ID */
  @GetMapping("/{id}")
  public StockResearchReport getReportById(@PathVariable String id) {
    return reportRepository.findByIdAndUserId(id, authUtils.getCurrentUserId());
  }
}
