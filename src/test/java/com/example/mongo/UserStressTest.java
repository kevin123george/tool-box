package com.example.mongo;

import com.example.mongo.models.UsersEntity;
import com.example.mongo.repos.UserRepo;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@SpringBootTest
public class UserStressTest {

    @Autowired
    private UserRepo userRepo;

    @Test
    void stressInsertUsers() throws InterruptedException {
        int threads = 10;
        int insertsPerThread = 100;

        ExecutorService executor = Executors.newFixedThreadPool(threads);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                for (int j = 0; j < insertsPerThread; j++) {
                    UsersEntity user = new UsersEntity();
                    user.setName("User-" + UUID.randomUUID());
                    user.setEmail(UUID.randomUUID() + "@test.com");
                    userRepo.save(user);
                }
            });
        }

        executor.shutdown();
        executor.awaitTermination(1, TimeUnit.MINUTES);

        System.out.println("Total users inserted: " + userRepo.count());
    }
}
