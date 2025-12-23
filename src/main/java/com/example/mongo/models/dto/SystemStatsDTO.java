package com.example.mongo.models.dto;

import java.util.List;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemStatsDTO {
  // CPU Stats
  private int availableProcessors;
  private double systemCpuLoad;
  private double processCpuLoad;
  private double[] loadAverage; // 1min, 5min, 15min

  // System Memory Stats
  private long systemTotalMemoryMB;
  private long systemFreeMemoryMB;
  private long systemUsedMemoryMB;
  private double systemMemoryUsagePercent;

  // Swap Memory
  private long swapTotalMB;
  private long swapFreeMB;
  private long swapUsedMB;
  private double swapUsagePercent;

  // Disk Stats
  private long diskTotalSpaceGB;
  private long diskFreeSpaceGB;
  private long diskUsedSpaceGB;
  private double diskUsagePercent;

  // JVM Stats (for the app itself)
  private long jvmHeapUsed;
  private long jvmHeapMax;
  private double jvmHeapUsagePercent;

  // Network Stats
  private String hostname;
  private List<String> ipAddresses;
  private long networkRxBytes;
  private long networkTxBytes;

  // System Info
  private String osName;
  private String osVersion;
  private String osArch;
  private long systemUptimeSeconds;

  // Process Info
  private long applicationUptimeMillis;
  private String applicationStartTime;
  private int threadCount;
  private int peakThreadCount;
}
