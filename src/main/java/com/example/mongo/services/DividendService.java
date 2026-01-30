package com.example.mongo.services;

import com.example.mongo.models.DividendFrequency;
import com.example.mongo.models.DividendRecord;
import com.example.mongo.models.dto.DividendSummaryDTO;
import com.example.mongo.repos.DividendRecordRepository;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DividendService {

  @Autowired private DividendRecordRepository dividendRepository;

  public List<DividendRecord> getAllDividends() {
    return dividendRepository.findAllByOrderByPaymentDateDesc();
  }

  public DividendRecord getDividendById(String id) {
    return dividendRepository
        .findById(id)
        .orElseThrow(() -> new RuntimeException("Dividend record not found: " + id));
  }

  public List<DividendRecord> getDividendsBySymbol(String symbol) {
    return dividendRepository.findByStockSymbol(symbol);
  }

  public DividendRecord createDividend(DividendRecord record) {
    return dividendRepository.save(record);
  }

  public DividendRecord updateDividend(String id, DividendRecord updated) {
    DividendRecord existing = getDividendById(id);
    existing.setStockSymbol(updated.getStockSymbol());
    existing.setAmount(updated.getAmount());
    existing.setCurrency(updated.getCurrency());
    existing.setPaymentDate(updated.getPaymentDate());
    existing.setExDividendDate(updated.getExDividendDate());
    existing.setFrequency(updated.getFrequency());
    existing.setNotes(updated.getNotes());
    return dividendRepository.save(existing);
  }

  public void deleteDividend(String id) {
    dividendRepository.deleteById(id);
  }

  public DividendSummaryDTO getSummary() {
    List<DividendRecord> all = dividendRepository.findAll();

    double totalReceived = all.stream().mapToDouble(DividendRecord::getAmount).sum();

    Map<String, Double> totalByStock =
        all.stream()
            .collect(
                Collectors.groupingBy(
                    DividendRecord::getStockSymbol, Collectors.summingDouble(DividendRecord::getAmount)));

    Map<Integer, Double> dividendsByYear =
        all.stream()
            .filter(d -> d.getPaymentDate() != null)
            .collect(
                Collectors.groupingBy(
                    d -> d.getPaymentDate().getYear(), Collectors.summingDouble(DividendRecord::getAmount)));

    double annualProjection = calculateAnnualProjection(all);

    return new DividendSummaryDTO(totalReceived, totalByStock, annualProjection, dividendsByYear);
  }

  private double calculateAnnualProjection(List<DividendRecord> dividends) {
    return dividends.stream()
        .filter(d -> d.getFrequency() != null)
        .mapToDouble(
            d -> {
              double multiplier =
                  switch (d.getFrequency()) {
                    case MONTHLY -> 12;
                    case QUARTERLY -> 4;
                    case SEMI_ANNUAL -> 2;
                    case ANNUAL -> 1;
                  };
              return d.getAmount() * multiplier;
            })
        .sum();
  }

  public List<DividendRecord> getDividendsForMonth(int year, int month) {
    LocalDate start = LocalDate.of(year, month, 1);
    LocalDate end = start.plusMonths(1).minusDays(1);
    return dividendRepository.findByPaymentDateBetweenOrderByPaymentDateAsc(start, end);
  }
}
