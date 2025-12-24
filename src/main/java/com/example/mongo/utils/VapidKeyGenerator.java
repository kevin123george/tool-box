package com.example.mongo.utils;

import java.io.IOException;
import java.nio.file.*;
import java.security.*;
import java.util.Base64;
import java.util.List;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.interfaces.ECPrivateKey;
import org.bouncycastle.jce.interfaces.ECPublicKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jce.spec.ECNamedCurveParameterSpec;

public class VapidKeyGenerator {
  public static void main(String[] args) throws Exception {
    Security.addProvider(new BouncyCastleProvider());

    ECNamedCurveParameterSpec parameterSpec = ECNamedCurveTable.getParameterSpec("prime256v1");
    KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("ECDSA", "BC");
    keyPairGenerator.initialize(parameterSpec);

    KeyPair keyPair = keyPairGenerator.generateKeyPair();

    ECPublicKey publicKey = (ECPublicKey) keyPair.getPublic();
    ECPrivateKey privateKey = (ECPrivateKey) keyPair.getPrivate();

    byte[] publicKeyBytes = publicKey.getQ().getEncoded(false);
    byte[] privateKeyBytes = privateKey.getD().toByteArray();

    String publicKeyBase64 = Base64.getUrlEncoder().withoutPadding().encodeToString(publicKeyBytes);
    String privateKeyBase64 =
        Base64.getUrlEncoder().withoutPadding().encodeToString(privateKeyBytes);

    System.out.println("==================================================");
    System.out.println("Generated VAPID Keys:");
    System.out.println("==================================================");
    System.out.println("Public Key: " + publicKeyBase64);
    System.out.println("Private Key: " + privateKeyBase64);
    System.out.println("==================================================");

    updateApplicationProperties(publicKeyBase64, privateKeyBase64);
  }

  private static void updateApplicationProperties(String publicKey, String privateKey) {
    try {
      Path propsPath = Paths.get("src/main/resources/application.properties");

      if (!Files.exists(propsPath)) {
        System.err.println("❌ application.properties not found at: " + propsPath.toAbsolutePath());
        printManualInstructions(publicKey, privateKey);
        return;
      }

      // Read all lines
      List<String> lines = Files.readAllLines(propsPath);

      // Update or add VAPID properties
      boolean publicKeyFound = false;
      boolean privateKeyFound = false;
      boolean subjectFound = false;

      for (int i = 0; i < lines.size(); i++) {
        String line = lines.get(i).trim();

        if (line.startsWith("vapid.public.key")) {
          lines.set(i, "vapid.public.key=" + publicKey);
          publicKeyFound = true;
        } else if (line.startsWith("vapid.private.key")) {
          lines.set(i, "vapid.private.key=" + privateKey);
          privateKeyFound = true;
        } else if (line.startsWith("vapid.subject")) {
          subjectFound = true;
        }
      }

      // Add missing properties at the end
      if (!publicKeyFound || !privateKeyFound || !subjectFound) {
        lines.add("");
        lines.add("# VAPID Keys for Web Push Notifications");
        if (!publicKeyFound) lines.add("vapid.public.key=" + publicKey);
        if (!privateKeyFound) lines.add("vapid.private.key=" + privateKey);
        if (!subjectFound) lines.add("vapid.subject=mailto:kevin@toolbox.com");
      }

      // Write back
      Files.write(propsPath, lines, StandardOpenOption.WRITE, StandardOpenOption.TRUNCATE_EXISTING);

      System.out.println("✅ Successfully updated application.properties");
      System.out.println("   Location: " + propsPath.toAbsolutePath());
      System.out.println("\n🚀 You can now run your application!");

    } catch (IOException e) {
      System.err.println("❌ Failed to update application.properties: " + e.getMessage());
      printManualInstructions(publicKey, privateKey);
    }
  }

  private static void printManualInstructions(String publicKey, String privateKey) {
    System.out.println("\n⚠️  Please manually add these to application.properties:");
    System.out.println("---------------------------------------------------");
    System.out.println("vapid.public.key=" + publicKey);
    System.out.println("vapid.private.key=" + privateKey);
    System.out.println("vapid.subject=mailto:kevin@toolbox.com");
    System.out.println("---------------------------------------------------");
  }
}
