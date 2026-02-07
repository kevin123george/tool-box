package com.example.mongo.repos;

import com.example.mongo.models.CompanyOverview;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CompanyOverviewRepository extends MongoRepository<CompanyOverview, String> {

  Optional<CompanyOverview> findFirstBySymbol(String symbol);

  List<CompanyOverview> findAllBySymbol(String symbol);

  void deleteBySymbol(String symbol);
}
