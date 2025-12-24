package com.example.mongo;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

import com.example.mongo.models.UsersEntity;
import com.example.mongo.repos.UserRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
public class UserIntegrationTest {

  @Container static MongoDBContainer mongo = new MongoDBContainer("mongo:7.0");

  @DynamicPropertySource
  static void configure(DynamicPropertyRegistry registry) {
    registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
  }

  @Autowired UserRepo userRepo;

  @Autowired MongoTemplate mongoTemplate;

  @BeforeEach
  void cleanDatabase() {
    mongoTemplate.getDb().drop(); // fresh DB before every test
  }

  @Test
  void shouldInsertUser() {
    UsersEntity user = new UsersEntity();
    user.setName("Alice");
    user.setEmail("alice@test.com");

    UsersEntity saved = userRepo.save(user);

    assertThat(saved.getId()).isNotNull();
    assertThat(userRepo.findByEmail("alice@test.com")).isNotNull();
  }

  @Test
  void shouldEnforceUniqueEmail() {
    UsersEntity u1 = new UsersEntity();
    u1.setName("Bob");
    u1.setEmail("bob@test.com");
    userRepo.save(u1);

    UsersEntity u2 = new UsersEntity();
    u2.setName("Duplicate Bob");
    u2.setEmail("bob@test.com");

    try {
      userRepo.save(u2);
    } catch (Exception e) {
      assertThat(e.getMessage()).contains("duplicate key error");
    }
  }
}
