# Fitness Tracking Integration Plan

## Overview
Integrate the fitness tracking module with the existing tool-box dashboard and enhance the fitness tab with additional features like calendar integration, push notifications, and workout planning.

## Current State
The fitness module has been created with basic functionality:
- Backend: WorkoutLog, WeightEntry entities, repositories, FitnessService, FitnessController
- Frontend: Fitness tab with weekly schedule, workout logging, weight tracking, stats

## Integration Tasks

---

## Phase 1: Dashboard Integration

### 1.1 Update DashboardDTO
**File:** `src/main/java/com/example/mongo/models/dto/DashboardDTO.java`

Add fitness fields:
```java
// Fitness
private int fitnessCurrentStreak;
private int fitnessThisWeek;
private Double currentWeight;
private Double weightChange;
```

### 1.2 Update DashboardController
**File:** `src/main/java/com/example/mongo/controller/DashboardController.java`

- Inject `FitnessService`
- Fetch fitness stats and add to dashboard response
- Include current streak, this week's workouts, latest weight

### 1.3 Update Dashboard Frontend
**File:** `toolbox-frontend/public/index.html`

Add fitness summary card to dashboard:
```html
<div class="stat-card">
    <div class="stat-label">Workout Streak</div>
    <div class="stat-value positive" id="dashFitnessStreak">0 days</div>
</div>
<div class="stat-card">
    <div class="stat-label">This Week</div>
    <div class="stat-value" id="dashFitnessWeek">0 workouts</div>
</div>
```

### 1.4 Update Dashboard JavaScript
**File:** `toolbox-frontend/public/app.js`

Update `renderDashboard()` and `loadDashboardFallback()` to display fitness stats.

---

## Phase 2: Calendar Integration

### 2.1 Add Fitness Events to Calendar API
**File:** `src/main/java/com/example/mongo/controller/CalendarController.java` (or existing calendar endpoint)

Add method to fetch workout events:
```java
@GetMapping("/events/fitness")
public List<CalendarEventDTO> getFitnessEvents(
    @RequestParam int year,
    @RequestParam int month
)
```

### 2.2 Update CalendarEventDTO
**File:** `src/main/java/com/example/mongo/models/dto/CalendarEventDTO.java`

Ensure it supports fitness event type:
```java
// Event types: INCOME, EXPENSE, SUBSCRIPTION, DIVIDEND, WORKOUT
private String type;
private String subType; // e.g., PUSH, PULL, LEGS for workouts
```

### 2.3 Update Calendar Frontend
**File:** `toolbox-frontend/public/app.js`

Update calendar rendering to show workout events with appropriate styling:
- Green checkmark for completed workouts
- Orange circle for planned/incomplete workouts
- Display exercise type on hover

---

## Phase 3: Workout Planning & Templates

### 3.1 Create WorkoutTemplate Entity
**File:** `src/main/java/com/example/mongo/models/WorkoutTemplate.java`

```java
@Document(collection = "workout_templates")
public class WorkoutTemplate {
    @Id private String id;
    private String name;                    // e.g., "Push Day A"
    private ExerciseType exerciseType;
    private List<ExerciseDetail> exercises;
    private Integer estimatedDuration;
    private String notes;
}
```

### 3.2 Create WorkoutPlan Entity
**File:** `src/main/java/com/example/mongo/models/WorkoutPlan.java`

```java
@Document(collection = "workout_plans")
public class WorkoutPlan {
    @Id private String id;
    private String name;                    // e.g., "PPL Split"
    private Map<DayOfWeek, String> schedule; // Map day to template ID
    private boolean active;
}
```

### 3.3 Create Repositories
**Files:**
- `src/main/java/com/example/mongo/repos/WorkoutTemplateRepository.java`
- `src/main/java/com/example/mongo/repos/WorkoutPlanRepository.java`

### 3.4 Update FitnessService
**File:** `src/main/java/com/example/mongo/services/FitnessService.java`

Add methods:
```java
// Templates
WorkoutTemplate createTemplate(WorkoutTemplate template);
List<WorkoutTemplate> getAllTemplates();
void deleteTemplate(String id);

// Plans
WorkoutPlan createPlan(WorkoutPlan plan);
WorkoutPlan getActivePlan();
void setActivePlan(String planId);

// Quick log from template
WorkoutLog logFromTemplate(String templateId, LocalDate date);
```

### 3.5 Update FitnessController
**File:** `src/main/java/com/example/mongo/controller/FitnessController.java`

Add endpoints:
```
GET    /api/fitness/templates           - List templates
POST   /api/fitness/templates           - Create template
DELETE /api/fitness/templates/{id}      - Delete template

GET    /api/fitness/plans               - List plans
POST   /api/fitness/plans               - Create plan
PUT    /api/fitness/plans/{id}/activate - Set active plan
DELETE /api/fitness/plans/{id}          - Delete plan

POST   /api/fitness/workouts/from-template/{templateId} - Quick log
```

### 3.6 Add Template UI to Frontend
**File:** `toolbox-frontend/public/index.html`

Add section in fitness tab:
```html
<!-- Workout Templates -->
<div class="add-box" style="margin-top:20px;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">Workout Templates</h3>
        <button class="btn" onclick="showAddTemplateModal()">ADD TEMPLATE</button>
    </div>
    <div id="templatesList"></div>
</div>

<!-- Active Plan -->
<div class="add-box" style="margin-top:20px;">
    <h3 style="margin-top:0;">Weekly Plan</h3>
    <div id="activePlanDisplay"></div>
</div>
```

---

## Phase 4: Push Notifications for Fitness

### 4.1 Update WebPushService
**File:** `src/main/java/com/example/mongo/services/WebPushService.java`

Add method for fitness reminders:
```java
public void sendWorkoutReminder(String title, String message);
```

### 4.2 Create FitnessAlertService
**File:** `src/main/java/com/example/mongo/services/FitnessAlertService.java`

```java
@Service
public class FitnessAlertService {
    // Check if user missed workout based on active plan
    public void checkMissedWorkouts();

    // Send streak milestone notifications
    public void checkStreakMilestones();

    // Remind to log weight if not logged today
    public void checkWeightLogReminder();
}
```

### 4.3 Add Scheduled Tasks
**File:** `src/main/java/com/example/mongo/config/SchedulingConfig.java`

Add scheduled task for daily fitness checks:
```java
@Scheduled(cron = "0 0 20 * * *") // 8 PM daily
public void dailyFitnessCheck() {
    fitnessAlertService.checkMissedWorkouts();
    fitnessAlertService.checkWeightLogReminder();
}
```

---

## Phase 5: Analytics & Progress Charts

### 5.1 Add Analytics Endpoints
**File:** `src/main/java/com/example/mongo/controller/FitnessController.java`

```
GET /api/fitness/analytics/workouts-by-type  - Pie chart data
GET /api/fitness/analytics/weekly-volume     - Bar chart (workouts per week)
GET /api/fitness/analytics/weight-trend      - Line chart with moving average
GET /api/fitness/analytics/streak-history    - Streak over time
```

### 5.2 Create FitnessAnalyticsDTO
**File:** `src/main/java/com/example/mongo/models/dto/FitnessAnalyticsDTO.java`

```java
@Data
public class FitnessAnalyticsDTO {
    private Map<String, Integer> workoutsByType;
    private List<WeeklyVolume> weeklyVolume;
    private List<WeightTrend> weightTrend;
    private double averageWorkoutsPerWeek;
    private int consistencyScore; // 0-100
}
```

### 5.3 Add Analytics Section to Frontend
**File:** `toolbox-frontend/public/index.html`

Add charts section:
```html
<!-- Fitness Analytics -->
<div class="finance-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:20px;">
    <div class="add-box">
        <h3 style="margin-top:0;">Workouts by Type</h3>
        <div style="height:200px;">
            <canvas id="workoutTypeChart"></canvas>
        </div>
    </div>
    <div class="add-box">
        <h3 style="margin-top:0;">Weekly Volume</h3>
        <div style="height:200px;">
            <canvas id="weeklyVolumeChart"></canvas>
        </div>
    </div>
</div>
```

---

## Phase 6: Body Measurements Tracking

### 6.1 Create BodyMeasurement Entity
**File:** `src/main/java/com/example/mongo/models/BodyMeasurement.java`

```java
@Document(collection = "body_measurements")
public class BodyMeasurement {
    @Id private String id;
    private LocalDate date;
    private Double chest;      // cm
    private Double waist;      // cm
    private Double hips;       // cm
    private Double bicepsLeft;
    private Double bicepsRight;
    private Double thighLeft;
    private Double thighRight;
    private Double bodyFatPercent;
    private String notes;
    @CreatedDate private Instant createdAt;
}
```

### 6.2 Add Measurements UI
Simple form to log measurements monthly with progress tracking.

---

## Files to Create/Modify Summary

### New Files (Phase 3-6)
1. `src/main/java/com/example/mongo/models/WorkoutTemplate.java`
2. `src/main/java/com/example/mongo/models/WorkoutPlan.java`
3. `src/main/java/com/example/mongo/models/BodyMeasurement.java`
4. `src/main/java/com/example/mongo/repos/WorkoutTemplateRepository.java`
5. `src/main/java/com/example/mongo/repos/WorkoutPlanRepository.java`
6. `src/main/java/com/example/mongo/repos/BodyMeasurementRepository.java`
7. `src/main/java/com/example/mongo/services/FitnessAlertService.java`
8. `src/main/java/com/example/mongo/models/dto/FitnessAnalyticsDTO.java`

### Modify (Phase 1-2)
1. `src/main/java/com/example/mongo/models/dto/DashboardDTO.java` - Add fitness fields
2. `src/main/java/com/example/mongo/controller/DashboardController.java` - Include fitness in dashboard
3. `src/main/java/com/example/mongo/services/FitnessService.java` - Add template/plan methods
4. `src/main/java/com/example/mongo/controller/FitnessController.java` - Add new endpoints
5. `src/main/java/com/example/mongo/config/SchedulingConfig.java` - Add fitness scheduled tasks
6. `toolbox-frontend/public/index.html` - Dashboard cards, templates UI, analytics charts
7. `toolbox-frontend/public/app.js` - Dashboard integration, template functions, chart rendering

---

## Implementation Priority

### Must Have (Phase 1-2) - COMPLETED
- [x] Dashboard integration with fitness stats
- [x] Calendar integration showing workouts

### Should Have (Phase 3) - COMPLETED
- [x] Workout templates
- [x] Weekly workout plans

### Phase 5 - COMPLETED
- [x] Advanced analytics charts (workouts by type, weekly volume)
- [x] Consistency score and averages

### Skipped (as requested)
- Phase 4: Push notifications for reminders
- Phase 6: Body measurements tracking

---

## Verification Steps

1. Start MongoDB: `mongod` or Docker
2. Run backend: `./gradlew bootRun` (port 9099)
3. Run frontend: `cd toolbox-frontend && bun run dev` (port 3000)
4. Test integration:
   - Dashboard shows fitness streak and this week count
   - Calendar displays workout events
   - Templates can be created and used for quick logging
   - Analytics charts render correctly
5. Verify push notifications (if implemented)
