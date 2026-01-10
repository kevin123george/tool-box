package com.example.mongo.repos;

import com.example.mongo.models.StockResearchReport;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockResearchReportRepository
    extends MongoRepository<StockResearchReport, String> {

  // Find reports by date range
  List<StockResearchReport> findByGeneratedAtBetween(LocalDateTime start, LocalDateTime end);

  // Find latest report
  StockResearchReport findFirstByOrderByGeneratedAtDesc();

  // Find reports by sentiment
  List<StockResearchReport> findByOverallSentiment(String sentiment);
}
