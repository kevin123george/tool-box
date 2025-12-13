package com.example.mongo.controller;

import com.example.mongo.models.UsersEntity;
import com.example.mongo.repos.UserRepo;
import org.springframework.web.bind.annotation.*;

@RestController("/sample")
public class SampleController {

  private final UserRepo userRepo;

  public SampleController(UserRepo userRepo) {
    this.userRepo = userRepo;
  }

  @PostMapping("/test")
  public UsersEntity test(@RequestBody UsersEntity user) {
    return userRepo.save(user);
  }

  @PutMapping("/test")
  public UsersEntity update(@RequestBody UsersEntity user) {
    return userRepo.save(user);
  }

  @GetMapping("/test/{id}")
  public UsersEntity get(@PathVariable String id) {
    return userRepo.findById(id).orElse(null);
  }

  @GetMapping("/tests")
  public Iterable<UsersEntity> getAll() {
    return userRepo.findAll();
  }

  @DeleteMapping("/test/{id}")
  public void delete(@PathVariable String id) {
    userRepo.deleteById(id);
  }
}
