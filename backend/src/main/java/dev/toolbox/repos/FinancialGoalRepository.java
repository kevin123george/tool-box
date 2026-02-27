package dev.toolbox.repos;

import dev.toolbox.models.FinancialGoal;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FinancialGoalRepository extends MongoRepository<FinancialGoal, String> {

  List<FinancialGoal> findAllByUserId(String userId);
}
