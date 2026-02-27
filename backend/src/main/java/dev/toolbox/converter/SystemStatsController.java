package dev.toolbox.converter;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.dto.SystemStatsDTO;
import dev.toolbox.models.dto.UserSummaryDTO;
import dev.toolbox.repos.UserRepo;
import dev.toolbox.services.EmailService;
import dev.toolbox.services.SystemStatsService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system")
public class SystemStatsController {

  @Autowired private SystemStatsService statsService;
  @Autowired private UserRepo userRepo;
  @Autowired private AuthUtils authUtils;
  @Autowired private BCryptPasswordEncoder passwordEncoder;
  @Autowired private EmailService emailService;

  @GetMapping("/stats")
  public ResponseEntity<SystemStatsDTO> getStats() {
    return ResponseEntity.ok(statsService.getSystemStats());
  }

  @GetMapping("/users")
  public ResponseEntity<List<UserSummaryDTO>> listUsers() {
    List<UserSummaryDTO> users =
        userRepo.findAll().stream()
            .map(
                u ->
                    new UserSummaryDTO(
                        u.getId(),
                        u.getName(),
                        u.getEmail(),
                        u.getRole(),
                        u.getCreatedAt(),
                        u.getLastLoginAt(),
                        u.getLastSeenAt(),
                        u.isEmailNotificationsEnabled()))
            .toList();
    return ResponseEntity.ok(users);
  }

  @PatchMapping("/users/{id}/role")
  public ResponseEntity<?> updateRole(
      @PathVariable String id, @RequestBody Map<String, String> body) {
    String newRole = body.get("role");
    if (newRole == null || (!newRole.equals("USER") && !newRole.equals("ADMIN"))) {
      return ResponseEntity.badRequest().body(Map.of("error", "role must be USER or ADMIN"));
    }

    String currentUserId = authUtils.getCurrentUserId();
    if (id.equals(currentUserId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "Cannot change your own role"));
    }

    return userRepo
        .findById(id)
        .map(
            user -> {
              user.setRole(newRole);
              userRepo.save(user);
              return ResponseEntity.ok(Map.of("id", id, "role", newRole));
            })
        .orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/users/{id}")
  public ResponseEntity<?> editUser(
      @PathVariable String id, @RequestBody Map<String, String> body) {
    String currentUserId = authUtils.getCurrentUserId();

    return userRepo
        .findById(id)
        .map(
            user -> {
              String name = body.get("name");
              String email = body.get("email");
              String newPassword = body.get("newPassword");
              String role = body.get("role");

              if (name != null && !name.isBlank()) user.setName(name.trim());

              if (email != null && !email.isBlank() && !email.equalsIgnoreCase(user.getEmail())) {
                if (userRepo.existsByEmail(email.trim())) {
                  return ResponseEntity.badRequest().body(Map.of("error", "Email already in use"));
                }
                user.setEmail(email.trim());
              }

              if (newPassword != null && !newPassword.isBlank()) {
                if (newPassword.length() < 6) {
                  return ResponseEntity.badRequest()
                      .body(Map.of("error", "Password must be at least 6 characters"));
                }
                user.setPasswordHash(passwordEncoder.encode(newPassword));
              }

              if (role != null && !role.equals(user.getRole())) {
                if (!role.equals("USER") && !role.equals("ADMIN")) {
                  return ResponseEntity.badRequest()
                      .body(Map.of("error", "role must be USER or ADMIN"));
                }
                if (id.equals(currentUserId)) {
                  return ResponseEntity.badRequest()
                      .body(Map.of("error", "Cannot change your own role"));
                }
                user.setRole(role);
              }

              userRepo.save(user);
              return ResponseEntity.ok(
                  new UserSummaryDTO(
                      user.getId(),
                      user.getName(),
                      user.getEmail(),
                      user.getRole(),
                      user.getCreatedAt(),
                      user.getLastLoginAt(),
                      user.getLastSeenAt(),
                      user.isEmailNotificationsEnabled()));
            })
        .orElse(ResponseEntity.notFound().build());
  }

  @PostMapping("/users/{id}/reset-link")
  public ResponseEntity<?> generateResetLink(@PathVariable String id, HttpServletRequest request) {
    return userRepo
        .findById(id)
        .map(
            user -> {
              String token = UUID.randomUUID().toString();
              user.setResetToken(token);
              user.setResetTokenExpiry(Instant.now().plusSeconds(86400)); // 24h
              userRepo.save(user);

              String baseUrl =
                  request.getScheme()
                      + "://"
                      + request.getServerName()
                      + (request.getServerPort() != 80 && request.getServerPort() != 443
                          ? ":" + request.getServerPort()
                          : "");
              String resetUrl = baseUrl + "/reset-password.html?token=" + token;
              emailService.sendPasswordReset(user.getEmail(), user.getName(), resetUrl);
              return ResponseEntity.ok(Map.of("resetUrl", resetUrl, "expiresIn", "24 hours"));
            })
        .orElse(ResponseEntity.notFound().build());
  }

  @PatchMapping("/users/{id}/email-notifications")
  public ResponseEntity<?> setEmailNotifications(
      @PathVariable String id, @RequestBody Map<String, Boolean> body) {
    return userRepo
        .findById(id)
        .map(
            user -> {
              user.setEmailNotificationsEnabled(body.getOrDefault("enabled", true));
              userRepo.save(user);
              return ResponseEntity.ok(
                  Map.of("emailNotificationsEnabled", user.isEmailNotificationsEnabled()));
            })
        .orElse(ResponseEntity.notFound().build());
  }

  @DeleteMapping("/users/{id}")
  public ResponseEntity<?> deleteUser(@PathVariable String id) {
    String currentUserId = authUtils.getCurrentUserId();
    if (id.equals(currentUserId)) {
      return ResponseEntity.badRequest().body(Map.of("error", "Cannot delete your own account"));
    }

    if (!userRepo.existsById(id)) {
      return ResponseEntity.notFound().build();
    }
    userRepo.deleteById(id);
    return ResponseEntity.ok(Map.of("deleted", id));
  }
}
