package dev.toolbox.config;

import dev.toolbox.models.WorkoutLog;
import dev.toolbox.models.WorkoutLog.ExerciseDetail;
import dev.toolbox.models.WorkoutPlan;
import dev.toolbox.models.WorkoutTemplate;
import dev.toolbox.repos.WorkoutPlanRepository;
import dev.toolbox.repos.WorkoutTemplateRepository;
import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class FitnessDataInitializer implements CommandLineRunner {

  @Autowired private WorkoutTemplateRepository templateRepository;
  @Autowired private WorkoutPlanRepository planRepository;

  @Override
  public void run(String... args) {
    // Only initialize if no templates exist
    if (templateRepository.count() > 0) {
      return;
    }

    // Create default templates and save to get IDs
    WorkoutTemplate pushDay = templateRepository.save(createPushTemplate());
    WorkoutTemplate pullDay = templateRepository.save(createPullTemplate());
    WorkoutTemplate legsDay = templateRepository.save(createLegsTemplate());
    WorkoutTemplate cardioDay = templateRepository.save(createCardioTemplate());
    WorkoutTemplate restDay = templateRepository.save(createRestTemplate());
    WorkoutTemplate coreDay = templateRepository.save(createCoreTemplate());

    // Create default PPL plan (Push/Pull/Legs + Core + Cardio)
    WorkoutPlan pplPlan = new WorkoutPlan();
    pplPlan.setName("Home Workout Plan");
    pplPlan.setActive(true);
    pplPlan.setNotes(
        "6-day home workout plan. Mon-Push, Tue-Pull, Wed-Legs, Thu-Cardio, Fri-Core, Sat-Rest. Sunday is full rest.");

    Map<DayOfWeek, String> schedule = new HashMap<>();
    schedule.put(DayOfWeek.MONDAY, pushDay.getId());
    schedule.put(DayOfWeek.TUESDAY, pullDay.getId());
    schedule.put(DayOfWeek.WEDNESDAY, legsDay.getId());
    schedule.put(DayOfWeek.THURSDAY, cardioDay.getId());
    schedule.put(DayOfWeek.FRIDAY, coreDay.getId());
    schedule.put(DayOfWeek.SATURDAY, restDay.getId());
    // Sunday is full rest (no template assigned)
    pplPlan.setSchedule(schedule);

    planRepository.save(pplPlan);

    System.out.println("Fitness data initialized: 6 templates + Home Workout Plan created");
  }

  private WorkoutTemplate createPushTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Push Day");
    template.setExerciseType(WorkoutLog.ExerciseType.PUSH);
    template.setEstimatedDuration(45);
    template.setNotes("Chest, Shoulders, Triceps - Home Workout");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Push-ups", 4, 15, null));
    exercises.add(createExercise("Diamond Push-ups", 3, 12, null));
    exercises.add(createExercise("Wide Push-ups", 3, 15, null));
    exercises.add(createExercise("Pike Push-ups (shoulders)", 3, 10, null));
    exercises.add(createExercise("Tricep Dips (on chair)", 3, 12, null));
    exercises.add(createExercise("Plank Shoulder Taps", 3, 20, null));
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createPullTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Pull Day");
    template.setExerciseType(WorkoutLog.ExerciseType.PULL);
    template.setEstimatedDuration(45);
    template.setNotes("Back, Biceps - Home Workout with Pull-up Bar");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Pull-ups", 4, 8, null));
    exercises.add(createExercise("Chin-ups (palms facing you)", 3, 8, null));
    exercises.add(createExercise("Negative Pull-ups (slow down)", 3, 5, null));
    exercises.add(createExercise("Australian Rows (under table)", 3, 12, null));
    exercises.add(createExercise("Bicep Curls (if dumbbells)", 3, 12, null));
    exercises.add(createExercise("Superman Hold", 3, 30, null));
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createLegsTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Legs Day");
    template.setExerciseType(WorkoutLog.ExerciseType.LEGS);
    template.setEstimatedDuration(45);
    template.setNotes("Quads, Hamstrings, Glutes, Calves - Home Workout");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Bodyweight Squats", 4, 20, null));
    exercises.add(createExercise("Lunges (each leg)", 3, 12, null));
    exercises.add(createExercise("Bulgarian Split Squats", 3, 10, null));
    exercises.add(createExercise("Glute Bridges", 3, 15, null));
    exercises.add(createExercise("Single Leg Glute Bridge", 3, 10, null));
    exercises.add(createExercise("Calf Raises", 4, 20, null));
    exercises.add(createExercise("Wall Sit", 3, 45, null)); // 45 seconds
    template.setExercises(exercises);

    return template;
  }

  private WorkoutTemplate createCardioTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Cardio Day");
    template.setExerciseType(WorkoutLog.ExerciseType.CARDIO);
    template.setEstimatedDuration(40);
    template.setNotes("Treadmill + Core Work");

    List<ExerciseDetail> exercises = new ArrayList<>();

    ExerciseDetail warmup = new ExerciseDetail();
    warmup.setName("Treadmill Warmup Walk");
    warmup.setDurationSeconds(300); // 5 min
    warmup.setNotes("Slow pace to warm up");
    exercises.add(warmup);

    ExerciseDetail running = new ExerciseDetail();
    running.setName("Treadmill Run/Jog");
    running.setDurationSeconds(1200); // 20 min
    running.setNotes("Moderate pace, increase incline for challenge");
    exercises.add(running);

    ExerciseDetail cooldown = new ExerciseDetail();
    cooldown.setName("Treadmill Cooldown Walk");
    cooldown.setDurationSeconds(300); // 5 min
    cooldown.setNotes("Slow pace");
    exercises.add(cooldown);

    ExerciseDetail stretching = new ExerciseDetail();
    stretching.setName("Stretching");
    stretching.setDurationSeconds(600); // 10 min
    stretching.setNotes("Full body stretch");
    exercises.add(stretching);

    template.setExercises(exercises);
    return template;
  }

  private WorkoutTemplate createRestTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Rest Day");
    template.setExerciseType(WorkoutLog.ExerciseType.REST);
    template.setEstimatedDuration(15);
    template.setNotes("Active Recovery - Light movement helps recovery");

    List<ExerciseDetail> exercises = new ArrayList<>();

    ExerciseDetail walk = new ExerciseDetail();
    walk.setName("Light Treadmill Walk (optional)");
    walk.setDurationSeconds(600); // 10 min
    walk.setNotes("Very slow pace, just to get moving");
    exercises.add(walk);

    ExerciseDetail stretch = new ExerciseDetail();
    stretch.setName("Gentle Stretching");
    stretch.setDurationSeconds(300); // 5 min
    stretch.setNotes("Focus on tight areas");
    exercises.add(stretch);

    template.setExercises(exercises);
    return template;
  }

  private WorkoutTemplate createCoreTemplate() {
    WorkoutTemplate template = new WorkoutTemplate();
    template.setName("Core Day");
    template.setExerciseType(WorkoutLog.ExerciseType.CORE);
    template.setEstimatedDuration(30);
    template.setNotes("Abs and Core Stability - No equipment needed");

    List<ExerciseDetail> exercises = new ArrayList<>();
    exercises.add(createExercise("Plank", 3, 60, null)); // 60 seconds
    exercises.add(createExercise("Crunches", 3, 20, null));
    exercises.add(createExercise("Bicycle Crunches", 3, 20, null));
    exercises.add(createExercise("Leg Raises", 3, 15, null));
    exercises.add(createExercise("Mountain Climbers", 3, 30, null));
    exercises.add(createExercise("Russian Twists", 3, 20, null));
    exercises.add(createExercise("Dead Bug", 3, 10, null));
    template.setExercises(exercises);

    return template;
  }

  private ExerciseDetail createExercise(String name, int sets, int reps, Double weight) {
    ExerciseDetail exercise = new ExerciseDetail();
    exercise.setName(name);
    exercise.setSets(sets);
    exercise.setReps(reps);
    exercise.setWeight(weight);
    return exercise;
  }
}
