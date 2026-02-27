package dev.toolbox.services;

import dev.toolbox.models.UsersEntity;
import dev.toolbox.repos.UserRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@Order(1)
@Slf4j
public class DataMigrationService implements CommandLineRunner {

  @Autowired private UserRepo userRepo;
  @Autowired private MongoTemplate mongoTemplate;
  @Autowired private BCryptPasswordEncoder passwordEncoder;

  @Value("${app.seed.kevin.name}")
  private String kevinName;

  @Value("${app.seed.kevin.email}")
  private String kevinEmail;

  @Value("${app.seed.kevin.password}")
  private String kevinPassword;

  private static final String[] PERSONAL_COLLECTIONS = {
    "bank_accounts",
    "memos",
    "monthly_budgets",
    "recurring_transactions",
    "savings_goals",
    "financial_goals",
    "price_alerts",
    "push_subscriptions",
    "net_worth_snapshots",
    "portfolio_targets",
    "stock_watches",
    "stock_holdings",
    "stock_holding_histories",
    "stock_price_entries",
    "subscriptions",
    "dividend_records",
    "weight_entries",
    "workout_logs",
    "workout_plans",
    "workout_templates",
    "expense_records",
    "income_records"
  };

  @Override
  public void run(String... args) {
    log.info("DataMigrationService: Starting seed and migration...");

    // Step 1: Ensure Kevin exists
    UsersEntity kevin = userRepo.findByEmail(kevinEmail).orElse(null);
    if (kevin == null) {
      kevin = new UsersEntity();
      kevin.setName(kevinName);
      kevin.setEmail(kevinEmail);
      kevin.setPasswordHash(passwordEncoder.encode(kevinPassword));
      kevin.setRole("ADMIN");
      kevin = userRepo.save(kevin);
      log.info("DataMigrationService: Created user Kevin with id={}", kevin.getId());
    } else {
      log.info("DataMigrationService: Kevin already exists with id={}", kevin.getId());
    }

    String kevinId = kevin.getId();

    // Step 2: Migrate all personal collections
    for (String collection : PERSONAL_COLLECTIONS) {
      try {
        Query query = new Query(Criteria.where("userId").exists(false));
        Update update = new Update().set("userId", kevinId);
        var result = mongoTemplate.updateMulti(query, update, collection);
        if (result.getModifiedCount() > 0) {
          log.info(
              "DataMigrationService: Migrated {} docs in '{}'",
              result.getModifiedCount(),
              collection);
        }
      } catch (Exception e) {
        log.warn(
            "DataMigrationService: Could not migrate collection '{}': {}",
            collection,
            e.getMessage());
      }
    }

    log.info("DataMigrationService: Migration complete.");
  }
}
