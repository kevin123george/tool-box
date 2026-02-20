package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
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

  @Autowired private AuthUtils authUtils;

  public NetWorthSnapshot captureSnapshot() {
    return captureSnapshot(authUtils.getCurrentUserId());
  }

  public NetWorthSnapshot captureSnapshot(String userId) {
    LocalDate today = LocalDate.now();
    Optional<NetWorthSnapshot> existing = snapshotRepository.findByDateAndUserId(today, userId);

    double totalCash = bankAccountService.getSummary(userId).getTotalBalance();
    double portfolioValue = stockService.getPortfolioStats(userId).currentValue;

    if (existing.isPresent()) {
      NetWorthSnapshot snapshot = existing.get();
      snapshot.setTotalCash(totalCash);
      snapshot.setPortfolioValue(portfolioValue);
      snapshot.setNetWorth(totalCash + portfolioValue);
      return snapshotRepository.save(snapshot);
    } else {
      NetWorthSnapshot snapshot = new NetWorthSnapshot(today, totalCash, portfolioValue);
      snapshot.setUserId(userId);
      return snapshotRepository.save(snapshot);
    }
  }

  public List<NetWorthSnapshot> getHistory() {
    return snapshotRepository.findAllByUserIdOrderByDateAsc(authUtils.getCurrentUserId());
  }

  public List<NetWorthSnapshot> getHistoryBetween(LocalDate start, LocalDate end) {
    return snapshotRepository.findByDateBetweenAndUserIdOrderByDateAsc(start, end, authUtils.getCurrentUserId());
  }

  public Optional<NetWorthSnapshot> getLatestSnapshot() {
    List<NetWorthSnapshot> all = snapshotRepository.findAllByUserIdOrderByDateDesc(authUtils.getCurrentUserId());
    return all.isEmpty() ? Optional.empty() : Optional.of(all.get(0));
  }
}
