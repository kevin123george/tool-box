package com.example.mongo.repos;

import com.example.mongo.models.PriceAlert;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PriceAlertRepository extends MongoRepository<PriceAlert, String> {

  List<PriceAlert> findByActiveTrue();

  List<PriceAlert> findBySymbol(String symbol);

  List<PriceAlert> findBySymbolAndActiveTrue(String symbol);

  List<PriceAlert> findByTriggeredTrue();
}
