package com.example.mongo.repos;

import com.example.mongo.models.UsersEntity;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepo extends MongoRepository<UsersEntity, String> {

  UsersEntity findByEmail(String email);
}
