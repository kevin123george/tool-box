package com.example.mongo.config;

import com.example.mongo.repos.UserRepo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

  private static final long SEEN_THROTTLE_MS = 60_000; // 1 write per user per minute

  @Autowired private JwtUtil jwtUtil;
  @Autowired private UserRepo userRepo;

  private final ConcurrentHashMap<String, Long> lastSeenWritten = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {

    String authHeader = request.getHeader("Authorization");
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
      String token = authHeader.substring(7);
      if (jwtUtil.validateToken(token)) {
        String userId = jwtUtil.getUserIdFromToken(token);
        String role = jwtUtil.getRoleFromToken(token);
        String grantedRole = "ROLE_" + (role != null ? role.toUpperCase() : "USER");
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(
                userId, null, List.of(new SimpleGrantedAuthority(grantedRole)));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Throttled lastSeenAt update — at most one DB write per user per minute
        long now = System.currentTimeMillis();
        Long lastWrite = lastSeenWritten.get(userId);
        if (lastWrite == null || now - lastWrite > SEEN_THROTTLE_MS) {
          lastSeenWritten.put(userId, now);
          userRepo
              .findById(userId)
              .ifPresent(
                  user -> {
                    user.setLastSeenAt(Instant.ofEpochMilli(now));
                    userRepo.save(user);
                  });
        }
      }
    }

    filterChain.doFilter(request, response);
  }
}
