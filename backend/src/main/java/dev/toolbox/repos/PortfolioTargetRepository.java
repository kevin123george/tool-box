package dev.toolbox.repos;

import dev.toolbox.models.PortfolioTarget;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PortfolioTargetRepository extends MongoRepository<PortfolioTarget, String> {
  // We'll typically just have one target document

  List<PortfolioTarget> findAllByUserId(String userId);

  Optional<PortfolioTarget> findFirstByUserId(String userId);
}
