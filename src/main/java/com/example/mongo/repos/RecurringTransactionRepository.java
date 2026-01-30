package com.example.mongo.repos;

import com.example.mongo.models.RecurringTransaction;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecurringTransactionRepository extends MongoRepository<RecurringTransaction, String> {

  List<RecurringTransaction> findByActiveTrue();

  List<RecurringTransaction> findByNextDueDateLessThanEqualAndActiveTrue(LocalDate date);

  List<RecurringTransaction> findByCategory(String category);
}
