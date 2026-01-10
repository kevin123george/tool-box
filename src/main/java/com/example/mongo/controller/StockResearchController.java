package com.example.mongo.controller;

import com.example.mongo.models.StockResearchReport;
import com.example.mongo.repos.StockResearchReportRepository;
import com.example.mongo.service.StockResearchService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/research")
@CrossOrigin
public class StockResearchController {

  @Autowired private StockResearchService researchService;

  @Autowired private StockResearchReportRepository reportRepository;

  /** Generate a new research report */
  @PostMapping("/generate")
  public StockResearchReport generateReport() {
    return researchService.generateResearchReport();
  }

  /** Get latest research report */
  @GetMapping("/latest")
  public StockResearchReport getLatestReport() {
    return reportRepository.findFirstByOrderByGeneratedAtDesc();
  }

  /** Get all research reports */
  @GetMapping
  public List<StockResearchReport> getAllReports() {
    return reportRepository.findAll();
  }

  /** Get report by ID */
  @GetMapping("/{id}")
  public StockResearchReport getReportById(@PathVariable String id) {
    return reportRepository.findById(id).orElse(null);
  }
}
