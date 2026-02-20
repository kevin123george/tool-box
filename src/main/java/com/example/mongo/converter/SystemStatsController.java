package com.example.mongo.converter;

import com.example.mongo.config.AuthUtils;
import com.example.mongo.models.UsersEntity;
import com.example.mongo.models.dto.SystemStatsDTO;
import com.example.mongo.models.dto.UserSummaryDTO;
import com.example.mongo.repos.UserRepo;
import com.example.mongo.services.SystemStatsService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system")
public class SystemStatsController {

  @Autowired private SystemStatsService statsService;
  @Autowired private UserRepo userRepo;
  @Autowired private AuthUtils authUtils;

  @GetMapping("/stats")
  public ResponseEntity<SystemStatsDTO> getStats() {
    return ResponseEntity.ok(statsService.getSystemStats());
  }

  @GetMapping("/users")
  public ResponseEntity<List<UserSummaryDTO>> listUsers() {
    List<UserSummaryDTO> users =
        userRepo.findAll().stream()
            .map(u -> new UserSummaryDTO(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.getCreatedAt()))
            .toList();
    return ResponseEntity.ok(users);
  }

  @PatchMapping("/users/{id}/role")
  public ResponseEntity<?> updateRole(@PathVariable String id, @RequestBody Map<String, String> body) {
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
