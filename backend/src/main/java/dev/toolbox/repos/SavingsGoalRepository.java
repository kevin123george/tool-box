package dev.toolbox.repos;

import dev.toolbox.models.SavingsGoal;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SavingsGoalRepository extends MongoRepository<SavingsGoal, String> {

  List<SavingsGoal> findAllByOrderByDeadlineAsc();

  List<SavingsGoal> findByNameContainingIgnoreCase(String name);

  List<SavingsGoal> findAllByUserIdOrderByDeadlineAsc(String userId);

  List<SavingsGoal> findAllByUserId(String userId);
}
