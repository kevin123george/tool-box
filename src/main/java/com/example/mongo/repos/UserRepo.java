package com.example.mongo.repos;

import com.example.mongo.models.UsersEntity;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepo extends MongoRepository<UsersEntity, String> {

  Optional<UsersEntity> findByEmail(String email);

  boolean existsByEmail(String email);
}
