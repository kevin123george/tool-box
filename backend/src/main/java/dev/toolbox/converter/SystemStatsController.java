package dev.toolbox.converter;

import dev.toolbox.config.AuthUtils;
import dev.toolbox.models.dto.SystemStatsDTO;
import dev.toolbox.models.dto.UserSummaryDTO;
import dev.toolbox.repos.UserRepo;
import dev.toolbox.services.EmailService;
import dev.toolbox.services.SystemStatsService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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

  @GetMapping("/docker")
  public ResponseEntity<?> getDockerContainers() {
    try {
      ProcessBuilder pb =
          new ProcessBuilder(
              "docker", "ps", "-a",
              "--format",
              "{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.CreatedAt}}");
      pb.redirectErrorStream(true);
      Process process = pb.start();
      String output;
      try (java.io.BufferedReader reader =
          new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
        output = reader.lines().collect(java.util.stream.Collectors.joining("\n"));
      }
      process.waitFor();

      java.util.List<Map<String, String>> containers = new java.util.ArrayList<>();
      for (String line : output.split("\n")) {
        if (line.isBlank()) continue;
        String[] parts = line.split("\t", 6);
        if (parts.length < 5) continue;
        Map<String, String> c = new java.util.LinkedHashMap<>();
        c.put("id", parts[0].trim());
        c.put("name", parts[1].trim());
        c.put("image", parts[2].trim());
        c.put("status", parts[3].trim());
        c.put("ports", parts.length > 4 ? parts[4].trim() : "");
        c.put("created", parts.length > 5 ? parts[5].trim() : "");
        containers.add(c);
      }
      return ResponseEntity.ok(containers);
    } catch (Exception e) {
      return ResponseEntity.ok(java.util.List.of(Map.of("error", e.getMessage())));
    }
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

  // ── Docker management helpers ──────────────────────────────────────────────

  private String runDockerCommand(String... args) throws Exception {
    List<String> cmd = new java.util.ArrayList<>();
    cmd.add("docker");
    cmd.addAll(Arrays.asList(args));
    ProcessBuilder pb = new ProcessBuilder(cmd);
    pb.redirectErrorStream(true);
    Process p = pb.start();
    String out;
    try (BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
      out = r.lines().collect(Collectors.joining("\n"));
    }
    p.waitFor();
    return out;
  }

  @PostMapping("/docker/{name}/start")
  public ResponseEntity<?> dockerStart(@PathVariable String name) {
    try {
      return ResponseEntity.ok(Map.of("output", runDockerCommand("start", name)));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/docker/{name}/stop")
  public ResponseEntity<?> dockerStop(@PathVariable String name) {
    try {
      return ResponseEntity.ok(Map.of("output", runDockerCommand("stop", name)));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @PostMapping("/docker/{name}/restart")
  public ResponseEntity<?> dockerRestart(@PathVariable String name) {
    try {
      return ResponseEntity.ok(Map.of("output", runDockerCommand("restart", name)));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @GetMapping("/docker/{name}/logs")
  public ResponseEntity<?> dockerLogs(
      @PathVariable String name, @RequestParam(defaultValue = "200") int tail) {
    try {
      return ResponseEntity.ok(
          Map.of("logs", runDockerCommand("logs", "--tail=" + tail, "--timestamps", name)));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @GetMapping("/docker/{name}/stats")
  public ResponseEntity<?> dockerStats(@PathVariable String name) {
    try {
      String raw =
          runDockerCommand(
              "stats",
              "--no-stream",
              "--format",
              "{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}\t{{.PIDs}}",
              name);
      if (raw.isBlank()) return ResponseEntity.ok(Map.of("error", "No stats"));
      String[] parts = raw.trim().split("\t");
      Map<String, String> stats = new LinkedHashMap<>();
      stats.put("cpu", parts.length > 0 ? parts[0] : "");
      stats.put("memUsage", parts.length > 1 ? parts[1] : "");
      stats.put("memPerc", parts.length > 2 ? parts[2] : "");
      stats.put("netIO", parts.length > 3 ? parts[3] : "");
      stats.put("blockIO", parts.length > 4 ? parts[4] : "");
      stats.put("pids", parts.length > 5 ? parts[5] : "");
      return ResponseEntity.ok(stats);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }

  @GetMapping("/docker/{name}/inspect")
  public ResponseEntity<?> dockerInspect(@PathVariable String name) {
    try {
      String raw =
          runDockerCommand(
              "inspect",
              "--format",
              "{{.Config.Image}}\t{{.State.Status}}\t{{.RestartCount}}\t{{json .Config.Env}}\t{{json .Mounts}}\t{{.HostConfig.RestartPolicy.Name}}\t{{.Config.WorkingDir}}\t{{.Created}}",
              name);
      if (raw.isBlank()) return ResponseEntity.ok(Map.of("error", "Not found"));
      String[] parts = raw.trim().split("\t", 8);
      Map<String, Object> result = new LinkedHashMap<>();
      result.put("image", parts.length > 0 ? parts[0] : "");
      result.put("state", parts.length > 1 ? parts[1] : "");
      result.put("restartCount", parts.length > 2 ? parts[2] : "");
      result.put("env", parts.length > 3 ? parts[3] : "[]");
      result.put("mounts", parts.length > 4 ? parts[4] : "[]");
      result.put("restartPolicy", parts.length > 5 ? parts[5] : "");
      result.put("workdir", parts.length > 6 ? parts[6] : "");
      result.put("created", parts.length > 7 ? parts[7] : "");
      return ResponseEntity.ok(result);
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
  }
}
