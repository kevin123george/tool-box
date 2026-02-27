package dev.toolbox.repos;

import dev.toolbox.models.BankAccount;
import java.util.List;
import java.util.Optional;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.MongoRepository;

@Configuration
@EnableMongoAuditing
public interface BankAccountRepository extends MongoRepository<BankAccount, String> {

  List<BankAccount> findTop10ByOrderByIdDesc();

  List<BankAccount> findAllByUserId(String userId);

  Optional<BankAccount> findByIdAndUserId(String id, String userId);
}
