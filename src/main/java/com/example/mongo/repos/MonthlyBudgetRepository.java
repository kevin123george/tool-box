package com.example.mongo.repos;

import com.example.mongo.models.MonthlyBudget;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MonthlyBudgetRepository extends MongoRepository<MonthlyBudget, String> {

  Optional<MonthlyBudget> findByMonth(YearMonth month);

  List<MonthlyBudget> findAllByOrderByMonthDesc();

  List<MonthlyBudget> findAllByOrderByMonthAsc();
}
