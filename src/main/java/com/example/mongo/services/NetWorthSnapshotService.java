package com.example.mongo.services;

import com.example.mongo.models.NetWorthSnapshot;
import com.example.mongo.repos.NetWorthSnapshotRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NetWorthSnapshotService {

  @Autowired private NetWorthSnapshotRepository snapshotRepository;

  @Autowired private BankAccountService bankAccountService;

  @Autowired private StockService stockService;

  public NetWorthSnapshot captureSnapshot() {
    LocalDate today = LocalDate.now();
    Optional<NetWorthSnapshot> existing = snapshotRepository.findByDate(today);

    double totalCash = bankAccountService.getSummary().getTotalBalance();
    double portfolioValue = stockService.getPortfolioStats().currentValue;

    if (existing.isPresent()) {
      NetWorthSnapshot snapshot = existing.get();
      snapshot.setTotalCash(totalCash);
      snapshot.setPortfolioValue(portfolioValue);
      snapshot.setNetWorth(totalCash + portfolioValue);
      return snapshotRepository.save(snapshot);
    } else {
      NetWorthSnapshot snapshot = new NetWorthSnapshot(today, totalCash, portfolioValue);
      return snapshotRepository.save(snapshot);
    }
  }

  public List<NetWorthSnapshot> getHistory() {
    return snapshotRepository.findAllByOrderByDateAsc();
  }

  public List<NetWorthSnapshot> getHistoryBetween(LocalDate start, LocalDate end) {
    return snapshotRepository.findByDateBetweenOrderByDateAsc(start, end);
  }

  public Optional<NetWorthSnapshot> getLatestSnapshot() {
    List<NetWorthSnapshot> all = snapshotRepository.findAllByOrderByDateDesc();
    return all.isEmpty() ? Optional.empty() : Optional.of(all.get(0));
  }
}
