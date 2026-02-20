package com.example.mongo.config;

import com.example.mongo.models.UsersEntity;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

  @Value("${jwt.secret}")
  private String secret;

  @Value("${jwt.expiration-ms}")
  private long expirationMs;

  private SecretKey getKey() {
    return Keys.hmacShaKeyFor(secret.getBytes());
  }

  public String generateToken(UsersEntity user) {
    return Jwts.builder()
        .subject(user.getId())
        .claim("name", user.getName())
        .claim("role", user.getRole())
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + expirationMs))
        .signWith(getKey())
        .compact();
  }

  public boolean validateToken(String token) {
    try {
      Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token);
      return true;
    } catch (Exception e) {
      return false;
    }
  }

  public String getUserIdFromToken(String token) {
    Claims claims =
        Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token).getPayload();
    return claims.getSubject();
  }

  public String getRoleFromToken(String token) {
    Claims claims =
        Jwts.parser().verifyWith(getKey()).build().parseSignedClaims(token).getPayload();
    return claims.get("role", String.class);
  }
}
