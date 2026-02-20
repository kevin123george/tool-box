package com.example.mongo.controller;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.config.JwtUtil;
import com.example.mongo.models.UsersEntity;
import com.example.mongo.models.dto.AuthRequest;
import com.example.mongo.models.dto.AuthResponse;
import com.example.mongo.models.dto.RegisterRequest;
import com.example.mongo.repos.UserRepo;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  @Autowired private UserRepo userRepo;
  @Autowired private JwtUtil jwtUtil;
  @Autowired private BCryptPasswordEncoder passwordEncoder;
  @Autowired private AuthUtils authUtils;

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody AuthRequest req) {
    UsersEntity user = userRepo.findByEmail(req.getEmail()).orElse(null);
    if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
      return ResponseEntity.status(401).body("Invalid credentials");
    }
    String token = jwtUtil.generateToken(user);
    return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole()));
  }

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    if (userRepo.existsByEmail(req.getEmail())) {
      return ResponseEntity.badRequest().body("Email already registered");
    }
    UsersEntity user = new UsersEntity();
    user.setName(req.getName());
    user.setEmail(req.getEmail());
    user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
    user.setRole("USER");
    user = userRepo.save(user);
    String token = jwtUtil.generateToken(user);
    return ResponseEntity.ok(new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole()));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me() {
    String userId = authUtils.getCurrentUserId();
    UsersEntity user = userRepo.findById(userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(404).body("User not found");
    }
    return ResponseEntity.ok(new AuthResponse(null, user.getId(), user.getName(), user.getEmail(), user.getRole()));
  }
}
