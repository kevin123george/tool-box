package com.example.mongo.services;

import com.example.mongo.models.BankAccount;
import com.example.mongo.models.dto.FinanceSummaryDTO;
import com.example.mongo.repos.BankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BankAccountService {

    private final BankAccountRepository repo;

//    public List<BankAccount> getAll() {
//        return repo.findTop10ByOrderByIdDesc();
//    }


    public Page<BankAccount> getAll(Pageable pageable) {
        return repo.findAll(pageable);
    }

    public BankAccount getById(String id) {
        return repo.findById(id).orElse(null);
    }

    public BankAccount create(BankAccount bank) {
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
        List<BankAccount> accounts = repo.findAll();

        FinanceSummaryDTO dto = new FinanceSummaryDTO();

        // Total money
        dto.setTotalBalance(
                accounts.stream()
                        .mapToDouble(BankAccount::getBalance)
                        .sum()
        );

        // Total by bank
        dto.setTotalByBank(
                accounts.stream()
                        .collect(Collectors.groupingBy(
                                BankAccount::getBank,
                                Collectors.summingDouble(BankAccount::getBalance)
                        ))
        );

        // Total by mode
        dto.setTotalByMode(
                accounts.stream()
                        .collect(Collectors.groupingBy(
                                BankAccount::getMode,
                                Collectors.summingDouble(BankAccount::getBalance)
                        ))
        );

        return dto;
    }
}
