package com.example.mongo.repos;

import com.example.mongo.models.BankAccount;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

@Configuration
@EnableMongoAuditing
public interface BankAccountRepository extends MongoRepository<BankAccount, String> {

    List<BankAccount> findTop10ByOrderByIdDesc();

}
