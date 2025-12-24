package com.example.mongo.repos;

import com.example.mongo.models.PushSubscription;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PushSubscriptionRepository extends MongoRepository<PushSubscription, String> {
  Optional<PushSubscription> findByEndpoint(String endpoint);

  List<PushSubscription> findAll();
}
