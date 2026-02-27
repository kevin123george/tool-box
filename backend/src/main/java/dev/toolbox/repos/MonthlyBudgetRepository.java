package dev.toolbox.repos;

import dev.toolbox.models.MonthlyBudget;
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

  Optional<MonthlyBudget> findByMonthAndUserId(YearMonth month, String userId);

  List<MonthlyBudget> findAllByUserIdOrderByMonthDesc(String userId);
}
