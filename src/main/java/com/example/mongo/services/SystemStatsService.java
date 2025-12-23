package com.example.mongo.services;

import com.example.mongo.models.dto.SystemStatsDTO;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.lang.management.*;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.file.Files;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SystemStatsService {

  private final com.sun.management.OperatingSystemMXBean osBean;
  private final MemoryMXBean memoryBean;
  private final RuntimeMXBean runtimeBean;
  private final ThreadMXBean threadBean;

  public SystemStatsService() {
    this.osBean =
        (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
    this.memoryBean = ManagementFactory.getMemoryMXBean();
    this.runtimeBean = ManagementFactory.getRuntimeMXBean();
    this.threadBean = ManagementFactory.getThreadMXBean();
  }

  public SystemStatsDTO getSystemStats() {
    SystemStatsDTO.SystemStatsDTOBuilder builder = SystemStatsDTO.builder();

    // CPU Stats
    builder
        .availableProcessors(osBean.getAvailableProcessors())
        .systemCpuLoad(osBean.getCpuLoad() * 100)
        .processCpuLoad(osBean.getProcessCpuLoad() * 100)
        .loadAverage(getLoadAverage());

    // System Memory
    long totalMemory = osBean.getTotalMemorySize() / (1024 * 1024); // MB
    long freeMemory = osBean.getFreeMemorySize() / (1024 * 1024); // MB
    long usedMemory = totalMemory - freeMemory;

    builder
        .systemTotalMemoryMB(totalMemory)
        .systemFreeMemoryMB(freeMemory)
        .systemUsedMemoryMB(usedMemory)
        .systemMemoryUsagePercent((double) usedMemory / totalMemory * 100);

    // Swap Memory
    long swapTotal = osBean.getTotalSwapSpaceSize() / (1024 * 1024); // MB
    long swapFree = osBean.getFreeSwapSpaceSize() / (1024 * 1024); // MB
    long swapUsed = swapTotal - swapFree;

    builder
        .swapTotalMB(swapTotal)
        .swapFreeMB(swapFree)
        .swapUsedMB(swapUsed)
        .swapUsagePercent(swapTotal > 0 ? (double) swapUsed / swapTotal * 100 : 0);

    // Disk Stats
    File root = new File("/");
    long totalSpace = root.getTotalSpace() / (1024 * 1024 * 1024); // GB
    long freeSpace = root.getFreeSpace() / (1024 * 1024 * 1024); // GB
    long usedSpace = totalSpace - freeSpace;

    builder
        .diskTotalSpaceGB(totalSpace)
        .diskFreeSpaceGB(freeSpace)
        .diskUsedSpaceGB(usedSpace)
        .diskUsagePercent((double) usedSpace / totalSpace * 100);

    // JVM Memory (just for reference of this app)
    MemoryUsage heapUsage = memoryBean.getHeapMemoryUsage();
    builder
        .jvmHeapUsed(heapUsage.getUsed() / (1024 * 1024))
        .jvmHeapMax(heapUsage.getMax() / (1024 * 1024))
        .jvmHeapUsagePercent((double) heapUsage.getUsed() / heapUsage.getMax() * 100);

    // Network Info
    try {
      builder.hostname(InetAddress.getLocalHost().getHostName()).ipAddresses(getIpAddresses());

      long[] networkStats = getNetworkStats();
      builder.networkRxBytes(networkStats[0]).networkTxBytes(networkStats[1]);
    } catch (Exception e) {
      log.error("Failed to get network info: {}", e.getMessage());
    }

    // System Info
    builder
        .osName(System.getProperty("os.name"))
        .osVersion(System.getProperty("os.version"))
        .osArch(System.getProperty("os.arch"))
        .systemUptimeSeconds(getSystemUptime());

    // Application Runtime
    builder
        .applicationUptimeMillis(runtimeBean.getUptime())
        .applicationStartTime(Instant.ofEpochMilli(runtimeBean.getStartTime()).toString())
        .threadCount(threadBean.getThreadCount())
        .peakThreadCount(threadBean.getPeakThreadCount());

    return builder.build();
  }

  private double[] getLoadAverage() {
    double[] loadAvg = new double[3];
    try {
      // Try to read from /proc/loadavg (Linux)
      File loadAvgFile = new File("/proc/loadavg");
      if (loadAvgFile.exists()) {
        String content = Files.readString(loadAvgFile.toPath()).trim();
        String[] parts = content.split("\\s+");
        loadAvg[0] = Double.parseDouble(parts[0]); // 1 min
        loadAvg[1] = Double.parseDouble(parts[1]); // 5 min
        loadAvg[2] = Double.parseDouble(parts[2]); // 15 min
      } else {
        // Fallback to Java API (only gives 1 min average)
        double avg = osBean.getSystemLoadAverage();
        loadAvg[0] = avg;
        loadAvg[1] = avg;
        loadAvg[2] = avg;
      }
    } catch (Exception e) {
      log.error("Failed to read load average: {}", e.getMessage());
    }
    return loadAvg;
  }

  private long getSystemUptime() {
    try {
      // Read from /proc/uptime (Linux)
      File uptimeFile = new File("/proc/uptime");
      if (uptimeFile.exists()) {
        String content = Files.readString(uptimeFile.toPath()).trim();
        String[] parts = content.split("\\s+");
        return (long) Double.parseDouble(parts[0]);
      }
    } catch (Exception e) {
      log.error("Failed to read system uptime: {}", e.getMessage());
    }
    return 0;
  }

  private long[] getNetworkStats() {
    long rxBytes = 0;
    long txBytes = 0;

    try {
      File netDev = new File("/proc/net/dev");
      if (netDev.exists()) {
        try (BufferedReader reader = new BufferedReader(new FileReader(netDev))) {
          String line;
          reader.readLine(); // Skip header
          reader.readLine(); // Skip header

          while ((line = reader.readLine()) != null) {
            line = line.trim();
            // Skip loopback
            if (line.startsWith("lo:")) {
              continue;
            }

            // Match eth0, ens33, enp0s3, wlan0, etc.
            if (line.matches("^(eth|ens|enp|wlan).*")) {
              String[] parts = line.split("\\s+");
              rxBytes += Long.parseLong(parts[1]); // RX bytes
              txBytes += Long.parseLong(parts[9]); // TX bytes
            }
          }
        }
      }
    } catch (Exception e) {
      log.error("Failed to read network stats: {}", e.getMessage());
    }

    return new long[] {rxBytes, txBytes};
  }

  private List<String> getIpAddresses() {
    List<String> ips = new ArrayList<>();
    try {
      Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
      while (interfaces.hasMoreElements()) {
        NetworkInterface iface = interfaces.nextElement();
        if (iface.isLoopback() || !iface.isUp()) {
          continue;
        }

        Enumeration<InetAddress> addresses = iface.getInetAddresses();
        while (addresses.hasMoreElements()) {
          InetAddress addr = addresses.nextElement();
          if (addr instanceof Inet4Address) {
            ips.add(addr.getHostAddress());
          }
        }
      }
    } catch (Exception e) {
      log.error("Failed to get IP addresses: {}", e.getMessage());
    }
    return ips;
  }
}
