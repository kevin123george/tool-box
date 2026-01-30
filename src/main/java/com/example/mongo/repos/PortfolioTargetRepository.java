package com.example.mongo.repos;

import com.example.mongo.models.PortfolioTarget;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PortfolioTargetRepository extends MongoRepository<PortfolioTarget, String> {
  // We'll typically just have one target document
}
