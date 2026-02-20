package com.example.mongo.services;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.BankAccount;
import com.example.mongo.models.dto.FinanceSummaryDTO;
import com.example.mongo.repos.BankAccountRepository;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class BankAccountService {

  private final BankAccountRepository repo;
  private final AuthUtils authUtils;

  public Page<BankAccount> getAll(Pageable pageable) {

    Pageable sortedPageable =
        PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("createdAt")));

    String userId = authUtils.getCurrentUserId();
    List<BankAccount> all = repo.findAllByUserId(userId);
    all.sort(Comparator.comparing(BankAccount::getLastModified, Comparator.nullsLast(Comparator.reverseOrder())));
    int start = (int) sortedPageable.getOffset();
    int end = Math.min(start + sortedPageable.getPageSize(), all.size());
    return new PageImpl<>(
        start < all.size() ? all.subList(start, end) : Collections.emptyList(),
        sortedPageable, all.size());
  }

  public BankAccount getById(String id) {
    return repo.findById(id).orElse(null);
  }

  public BankAccount create(BankAccount bank) {
    bank.setUserId(authUtils.getCurrentUserId());
    return repo.save(bank);
  }

  public BankAccount update(String id, BankAccount updated) {
    BankAccount existing = repo.findById(id).orElse(null);
    if (existing == null) return null;

    existing.setBank(updated.getBank());
    existing.setBalance(updated.getBalance());
    existing.setCurrency(updated.getCurrency());
    existing.setMode(updated.getMode());

    return repo.save(existing);
  }

  public void delete(String id) {
    repo.deleteById(id);
  }

  public FinanceSummaryDTO getSummary() {
    return getSummary(authUtils.getCurrentUserId());
  }

  public FinanceSummaryDTO getSummary(String userId) {
    List<BankAccount> accounts = repo.findAllByUserId(userId);

    FinanceSummaryDTO dto = new FinanceSummaryDTO();

    // Total money
    dto.setTotalBalance(accounts.stream().mapToDouble(BankAccount::getBalance).sum());

    // Total by bank
    dto.setTotalByBank(
        accounts.stream()
            .collect(
                Collectors.groupingBy(
                    BankAccount::getBank, Collectors.summingDouble(BankAccount::getBalance))));

    // Total by mode
    dto.setTotalByMode(
        accounts.stream()
            .collect(
                Collectors.groupingBy(
                    BankAccount::getMode, Collectors.summingDouble(BankAccount::getBalance))));

    return dto;
  }
}
