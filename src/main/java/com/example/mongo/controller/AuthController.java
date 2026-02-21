package com.example.mongo.controller;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.config.JwtUtil;
import com.example.mongo.models.UsersEntity;
import com.example.mongo.models.dto.AuthRequest;
import com.example.mongo.models.dto.AuthResponse;
import com.example.mongo.models.dto.RegisterRequest;
import com.example.mongo.repos.UserRepo;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.Map;
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
    Instant now = Instant.now();
    user.setLastLoginAt(now);
    user.setLastSeenAt(now);
    userRepo.save(user);
    String token = jwtUtil.generateToken(user);
    return ResponseEntity.ok(
        new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole()));
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
    return ResponseEntity.ok(
        new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole()));
  }

  @GetMapping("/reset-password/validate")
  public ResponseEntity<?> validateResetToken(
      @org.springframework.web.bind.annotation.RequestParam String token) {
    return userRepo
        .findByResetToken(token)
        .filter(
            u -> u.getResetTokenExpiry() != null && Instant.now().isBefore(u.getResetTokenExpiry()))
        .map(
            u ->
                ResponseEntity.ok(
                    Map.of("valid", true, "name", u.getName(), "email", u.getEmail())))
        .orElse(
            ResponseEntity.badRequest()
                .body(Map.of("valid", false, "error", "Reset link is invalid or has expired")));
  }

  @PostMapping("/reset-password")
  public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
    String token = body.get("token");
    String password = body.get("newPassword");
    if (token == null || password == null || password.length() < 6) {
      return ResponseEntity.badRequest().body("Password must be at least 6 characters");
    }
    return userRepo
        .findByResetToken(token)
        .filter(
            u -> u.getResetTokenExpiry() != null && Instant.now().isBefore(u.getResetTokenExpiry()))
        .map(
            u -> {
              u.setPasswordHash(passwordEncoder.encode(password));
              u.setResetToken(null);
              u.setResetTokenExpiry(null);
              userRepo.save(u);
              return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
            })
        .orElse(
            ResponseEntity.badRequest()
                .body(Map.of("error", "Reset link is invalid or has expired")));
  }

  @GetMapping("/me")
  public ResponseEntity<?> me() {
    String userId = authUtils.getCurrentUserId();
    UsersEntity user = userRepo.findById(userId).orElse(null);
    if (user == null) {
      return ResponseEntity.status(404).body("User not found");
    }
    return ResponseEntity.ok(
        new AuthResponse(null, user.getId(), user.getName(), user.getEmail(), user.getRole()));
  }
}
