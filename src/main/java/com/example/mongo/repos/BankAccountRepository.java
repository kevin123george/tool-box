package com.example.mongo.repos;

import com.example.mongo.models.BankAccount;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BankAccountRepository extends MongoRepository<BankAccount, String> { }
