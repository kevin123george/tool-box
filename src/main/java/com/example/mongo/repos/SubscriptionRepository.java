package com.example.mongo.repos;

import com.example.mongo.models.Subscription;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionRepository extends MongoRepository<Subscription, String> {

  List<Subscription> findByActiveTrue();

  List<Subscription> findByNextBillingDateBetweenAndActiveTrue(LocalDate start, LocalDate end);

  List<Subscription> findByCategory(String category);

  List<Subscription> findAllByUserId(String userId);

  List<Subscription> findByActiveTrueAndUserId(String userId);

  List<Subscription> findByNextBillingDateBetweenAndActiveTrueAndUserId(
      java.time.LocalDate start, java.time.LocalDate end, String userId);
}
