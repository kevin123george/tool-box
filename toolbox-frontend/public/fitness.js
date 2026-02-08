/* ===========================================================
   FITNESS TRACKER
=============================================================*/

let weightChart = null;

async function loadFitnessTab() {
    // Set default dates (using local timezone)
    const todayStr = formatLocalDate(new Date());
    document.getElementById('workoutDate').value = todayStr;
    document.getElementById('weightDate').value = todayStr;

    // Load templates first (needed by other functions)
    await loadTemplates();

    // Load today's workout and plans
    await Promise.all([
        loadTodaysWorkout(),
        loadPlans()
    ]);

    // Load remaining data in parallel
    await Promise.all([
        loadFitnessStats(),
        loadWeeklyWorkouts(),
        loadWeightData(),
        loadWorkoutHistory(),
        loadFitnessAnalytics()
    ]);
}

/* ===========================================================
   DAY DETAILS PANEL
=============================================================*/

let selectedDayData = null;

function showDayDetails(dayKey, templateId, dateStr) {
    const panel = document.getElementById('dayDetailsPanel');
    const title = document.getElementById('dayDetailsTitle');
    const subtitle = document.getElementById('dayDetailsSubtitle');
    const exercisesDiv = document.getElementById('dayDetailsExercises');
    const startBtn = document.getElementById('dayDetailsStartBtn');

    const dayNames = {
        'MONDAY': 'Monday', 'TUESDAY': 'Tuesday', 'WEDNESDAY': 'Wednesday',
        'THURSDAY': 'Thursday', 'FRIDAY': 'Friday', 'SATURDAY': 'Saturday', 'SUNDAY': 'Sunday'
    };

    if (!templateId) {
        // Rest day
        title.textContent = `${dayNames[dayKey]} - Rest Day`;
        subtitle.textContent = 'Take it easy! Recovery is important.';
        exercisesDiv.innerHTML = `
            <div style="padding:20px; text-align:center; opacity:0.7;">
                <div style="font-size:32px; margin-bottom:12px;">😴</div>
                <div>No workout scheduled.</div>
                <div style="margin-top:8px;">Rest days help your muscles recover and grow stronger!</div>
            </div>
        `;
        startBtn.style.display = 'none';
        selectedDayData = null;
    } else {
        // Find template
        const template = templatesCache.find(t => t.id === templateId);
        if (!template) {
            panel.style.display = 'none';
            return;
        }

        selectedDayData = { template, dateStr, dayKey };

        title.textContent = `${dayNames[dayKey]} - ${template.name}`;
        subtitle.textContent = template.notes || `${template.estimatedDuration || 60} minutes`;

        if (template.exercises && template.exercises.length > 0) {
            exercisesDiv.innerHTML = `
                <table class="exercise-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Exercise</th>
                            <th>Sets</th>
                            <th>Reps</th>
                            <th>Weight</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${template.exercises.map((ex, idx) => `
                            <tr>
                                <td class="row-num">${idx + 1}</td>
                                <td class="exercise-name">${ex.name}</td>
                                <td>${ex.sets || '-'}</td>
                                <td>${ex.reps || (ex.durationSeconds ? Math.round(ex.durationSeconds/60) + ' min' : '-')}</td>
                                <td>${ex.weight ? ex.weight + ' kg' : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="exercise-tips">
                    <strong>💡 Tips:</strong>
                    <ul>
                        ${getExerciseTips(template.exerciseType)}
                    </ul>
                </div>
            `;
        } else {
            exercisesDiv.innerHTML = '<div class="no-exercises">No exercises defined yet. Edit the template to add exercises.</div>';
        }

        startBtn.style.display = 'inline-block';
        startBtn.textContent = dateStr === formatLocalDate(new Date()) ? 'START THIS WORKOUT' : 'LOG THIS WORKOUT';
    }

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function getExerciseTips(exerciseType) {
    const tips = {
        'PUSH': [
            '<li>Warm up with light sets before heavy lifts</li>',
            '<li>Keep your core tight during pressing movements</li>',
            '<li>Control the weight - don\'t bounce off your chest</li>',
            '<li>Rest 2-3 minutes between heavy compound sets</li>'
        ],
        'PULL': [
            '<li>Squeeze your back muscles at the top of each rep</li>',
            '<li>Use straps if grip is limiting your deadlifts</li>',
            '<li>Keep your elbows close during curls for better bicep activation</li>',
            '<li>Pull with your elbows, not your hands</li>'
        ],
        'LEGS': [
            '<li>Warm up thoroughly - legs have big muscle groups</li>',
            '<li>Go deep on squats for full muscle activation</li>',
            '<li>Keep your knees tracking over your toes</li>',
            '<li>Don\'t skip calves!</li>'
        ],
        'CARDIO': [
            '<li>Start slow and gradually increase intensity</li>',
            '<li>Stay hydrated throughout</li>',
            '<li>Focus on breathing rhythm</li>',
            '<li>Cool down with stretching after</li>'
        ],
        'FULL_BODY': [
            '<li>Start with compound movements when fresh</li>',
            '<li>Alternate upper and lower body exercises</li>',
            '<li>Keep rest periods shorter (60-90 seconds)</li>',
            '<li>Focus on form over weight</li>'
        ],
        'CORE': [
            '<li>Engage your core before each movement</li>',
            '<li>Breathe out during the contraction</li>',
            '<li>Quality over quantity - slow controlled reps</li>',
            '<li>Don\'t pull on your neck during crunches</li>'
        ]
    };
    return tips[exerciseType]?.join('') || '<li>Focus on proper form</li><li>Stay hydrated</li>';
}

function hideDayDetails() {
    document.getElementById('dayDetailsPanel').style.display = 'none';
    selectedDayData = null;
}

function startDayWorkout() {
    if (!selectedDayData) return;

    // If it's today, use the today's workout modal
    const today = formatLocalDate(new Date());
    if (selectedDayData.dateStr === today) {
        hideDayDetails();
        showTodaysWorkoutModal();
    } else {
        // Log for a different day
        logWorkoutForDate(selectedDayData.template, selectedDayData.dateStr);
    }
}

async function logWorkoutForDate(template, dateStr) {
    try {
        const res = await fetch(`${API}/api/fitness/workouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workoutDate: dateStr,
                exerciseType: template.exerciseType,
                durationMinutes: template.estimatedDuration,
                notes: `Logged: ${template.name}`,
                completed: true
            })
        });

        if (!res.ok) throw new Error('Failed to log workout');

        hideDayDetails();
        showToast('Workout logged!', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to log workout:', e);
        showToast('Failed to log workout', 'error');
    }
}

/* ===========================================================
   TODAY'S WORKOUT
=============================================================*/

let todaysWorkoutData = null;

async function loadTodaysWorkout() {
    try {
        const res = await fetch(`${API}/api/fitness/today`);
        if (!res.ok) throw new Error('Failed to load today\'s workout');
        todaysWorkoutData = await res.json();

        const banner = document.getElementById('todaysWorkoutBanner');
        const typeEl = document.getElementById('todaysWorkoutType');
        const planEl = document.getElementById('todaysWorkoutPlan');
        const statusEl = document.getElementById('todaysWorkoutStatus');
        const actionsEl = document.getElementById('todaysWorkoutActions');
        const previewEl = document.getElementById('todaysExercisePreview');

        if (todaysWorkoutData.todaysWorkout && todaysWorkoutData.todaysWorkout.completed) {
            // Already completed today
            banner.style.borderColor = '#0f0';
            typeEl.textContent = todaysWorkoutData.scheduledTemplate?.name || 'Workout';
            typeEl.style.color = '#0f0';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : '';
            statusEl.innerHTML = '<span style="color:#0f0;">✓ Completed today! Great job!</span>';
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()">VIEW DETAILS</button>';
            previewEl.innerHTML = '';
        } else if (todaysWorkoutData.scheduledTemplate) {
            // Has scheduled workout
            const template = todaysWorkoutData.scheduledTemplate;
            banner.style.borderColor = '#f90';
            typeEl.textContent = template.name;
            typeEl.style.color = '#f90';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : '';

            const exerciseCount = template.exercises?.length || 0;
            const duration = template.estimatedDuration || 0;
            statusEl.innerHTML = `<span style="opacity:0.7;">${exerciseCount} exercises • ~${duration} min</span>`;
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()" style="background:#0f0; color:#000; font-weight:bold;">START WORKOUT</button>';

            // Show exercise preview
            if (template.exercises && template.exercises.length > 0) {
                const exerciseList = template.exercises.map(ex => {
                    const info = ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : '';
                    return `<span style="margin-right:12px;">• ${ex.name} ${info}</span>`;
                }).join('');
                previewEl.innerHTML = `<div style="margin-top:8px; padding:8px; background:rgba(255,255,255,0.05); border-radius:4px;">${exerciseList}</div>`;
            }
        } else {
            // Rest day
            banner.style.borderColor = '#888';
            typeEl.textContent = 'Rest Day 😴';
            typeEl.style.color = '#888';
            planEl.textContent = todaysWorkoutData.planName ? `From: ${todaysWorkoutData.planName}` : 'No active plan';
            statusEl.innerHTML = '<span style="opacity:0.7;">Recovery day - your muscles grow while you rest!</span>';
            actionsEl.innerHTML = '<button class="btn" onclick="showTodaysWorkoutModal()">LOG ANYWAY</button>';
            previewEl.innerHTML = '';
        }
    } catch (e) {
        console.error('Failed to load today\'s workout:', e);
        document.getElementById('todaysWorkoutType').textContent = 'No plan active';
        document.getElementById('todaysWorkoutStatus').textContent = 'Create a plan to get started';
        document.getElementById('todaysExercisePreview').innerHTML = '';
    }
}

function showTodaysWorkoutModal() {
    const modal = document.getElementById('todaysWorkoutModal');
    const title = document.getElementById('todaysWorkoutModalTitle');
    const planInfo = document.getElementById('todaysWorkoutModalPlan');
    const exerciseList = document.getElementById('todaysExerciseList');

    if (!todaysWorkoutData) {
        showToast('No workout data available', 'error');
        return;
    }

    const template = todaysWorkoutData.scheduledTemplate;
    const existingWorkout = todaysWorkoutData.todaysWorkout;

    if (template) {
        title.textContent = template.name;
        planInfo.textContent = template.notes || '';

        // Build exercise checklist
        if (template.exercises && template.exercises.length > 0) {
            exerciseList.innerHTML = template.exercises.map((ex, idx) => {
                const isChecked = existingWorkout?.completed ? 'checked disabled' : '';
                const weightInfo = ex.weight ? `@ ${ex.weight}kg` : '';
                const setsReps = ex.sets && ex.reps ? `${ex.sets} x ${ex.reps} ${weightInfo}` : '';
                const duration = ex.durationSeconds ? `${Math.round(ex.durationSeconds / 60)} min` : '';

                return `
                    <div class="exercise-checklist-item" style="display:flex; align-items:center; padding:12px; border:1px solid oklch(var(--b3)); margin-bottom:8px;">
                        <input type="checkbox" id="exercise_${idx}" ${isChecked} style="width:20px; height:20px; margin-right:12px;">
                        <div style="flex:1;">
                            <div style="font-weight:bold;">${ex.name}</div>
                            <div style="font-size:12px; opacity:0.7;">${setsReps || duration || ''}</div>
                            ${ex.notes ? `<div style="font-size:11px; opacity:0.5;">${ex.notes}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            exerciseList.innerHTML = '<div style="opacity:0.5; padding:12px;">No exercises defined for this template</div>';
        }

        // Pre-fill duration
        document.getElementById('todayWorkoutDuration').value = template.estimatedDuration || '';
    } else {
        title.textContent = 'Rest Day';
        planInfo.textContent = 'No workout scheduled, but you can log one anyway';
        exerciseList.innerHTML = `
            <div style="padding:12px;">
                <label>Workout Type:</label>
                <select id="restDayWorkoutType" style="margin-top:8px;">
                    <option value="CARDIO">Cardio</option>
                    <option value="FULL_BODY">Full Body</option>
                    <option value="CORE">Core</option>
                    <option value="REST">Rest (just tracking)</option>
                </select>
            </div>
        `;
    }

    // Pre-fill notes if existing workout
    if (existingWorkout) {
        document.getElementById('todayWorkoutDuration').value = existingWorkout.durationMinutes || '';
        document.getElementById('todayWorkoutCalories').value = existingWorkout.caloriesBurned || '';
        document.getElementById('todayWorkoutNotes').value = existingWorkout.notes || '';
    } else {
        document.getElementById('todayWorkoutCalories').value = '';
        document.getElementById('todayWorkoutNotes').value = '';
    }

    openModal('todaysWorkoutModal');
}

async function completeTodaysWorkout() {
    const duration = document.getElementById('todayWorkoutDuration').value;
    const calories = document.getElementById('todayWorkoutCalories').value;
    const notes = document.getElementById('todayWorkoutNotes').value;

    const template = todaysWorkoutData?.scheduledTemplate;
    const existingWorkout = todaysWorkoutData?.todaysWorkout;

    let exerciseType = template?.exerciseType || 'FULL_BODY';

    // If rest day, get selected type
    const restDaySelect = document.getElementById('restDayWorkoutType');
    if (restDaySelect) {
        exerciseType = restDaySelect.value;
    }

    try {
        let method = 'POST';
        let url = `${API}/api/fitness/workouts`;

        const workoutData = {
            workoutDate: formatLocalDate(new Date()),
            exerciseType: exerciseType,
            durationMinutes: duration ? parseInt(duration) : null,
            caloriesBurned: calories ? parseInt(calories) : null,
            notes: notes || (template ? `Completed: ${template.name}` : null),
            completed: true
        };

        // If already exists, update instead
        if (existingWorkout) {
            method = 'PUT';
            url = `${API}/api/fitness/workouts/${existingWorkout.id}`;
        }

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workoutData)
        });

        if (!res.ok) throw new Error('Failed to save workout');

        closeModal('todaysWorkoutModal');
        showToast('Workout completed! Great job!', 'success');

        // Refresh everything
        await Promise.all([
            loadTodaysWorkout(),
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to complete workout:', e);
        showToast('Failed to save workout', 'error');
    }
}

async function loadFitnessStats() {
    try {
        const res = await fetch(`${API}/api/fitness/stats`);
        if (!res.ok) throw new Error('Failed to load fitness stats');
        const stats = await res.json();

        document.getElementById('fitnessCurrentStreak').textContent = `${stats.currentStreak} days`;
        document.getElementById('fitnessLongestStreak').textContent = `${stats.longestStreak} days`;
        document.getElementById('fitnessThisWeek').textContent = `${stats.thisWeekWorkouts} workouts`;
        document.getElementById('fitnessTotalWorkouts').textContent = stats.totalWorkouts;

        // Update streak color based on value
        const streakEl = document.getElementById('fitnessCurrentStreak');
        if (stats.currentStreak >= 7) {
            streakEl.classList.add('text-success');
        } else if (stats.currentStreak === 0) {
            streakEl.classList.remove('text-success');
        }
    } catch (e) {
        console.error('Failed to load fitness stats:', e);
    }
}

async function loadWeeklyWorkouts() {
    try {
        // Pass local date to ensure correct week calculation regardless of server timezone
        const localToday = formatLocalDate(new Date());

        // Fetch both workouts and active plan
        const [workoutsRes, planRes] = await Promise.all([
            fetch(`${API}/api/fitness/workouts/week?date=${localToday}`),
            fetch(`${API}/api/fitness/plans/active`)
        ]);

        const workouts = workoutsRes.ok ? await workoutsRes.json() : [];
        const activePlan = planRes.ok ? await planRes.json() : null;

        // Get week dates
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const dayKeys = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

        // Map workouts by date string (normalize to YYYY-MM-DD format)
        const workoutsByDate = {};
        workouts.forEach(w => {
            if (w.workoutDate) {
                // Normalize date format - handle both "2026-02-02" and "2026-02-02T00:00:00" formats
                const normalizedDate = w.workoutDate.split('T')[0];
                workoutsByDate[normalizedDate] = w;
            }
        });

        // Build schedule HTML
        const container = document.getElementById('weeklySchedule');
        let html = '';

        const todayStr = formatLocalDate(today);

        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            const dateStr = formatLocalDate(date);
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;

            // Get planned workout from active plan
            let planned = null;
            if (activePlan && activePlan.schedule) {
                const templateId = activePlan.schedule[dayKeys[i]];
                if (templateId) {
                    const template = templatesCache.find(t => t.id === templateId);
                    planned = template ? template.name : 'Workout';
                }
            }

            // Get actual workout
            const actual = workoutsByDate[dateStr];

            // Determine status
            let borderColor = '#888';
            let statusIcon = '';
            let statusClass = '';

            if (actual && actual.completed) {
                borderColor = '#0f0';
                statusIcon = '✓';
                statusClass = 'completed';
            } else if (actual && !actual.completed) {
                borderColor = '#f90';
                statusIcon = '○';
                statusClass = 'pending';
            } else if (planned && !isPast) {
                borderColor = '#f90';
                statusIcon = '○';
                statusClass = 'pending';
            } else if (!planned) {
                borderColor = '#888';
            }

            const actualType = actual?.exerciseType?.replace('_', ' ') || null;
            const plannedDisplay = planned?.replace(' Day', '') || 'Rest';

            // Find template ID for this day
            const templateId = activePlan?.schedule?.[dayKeys[i]] || null;

            html += `
                <div class="day-card" style="border-color:${borderColor}; ${isToday ? 'background:rgba(255,255,255,0.05);' : ''} cursor:pointer;"
                     onclick="showDayDetails('${dayKeys[i]}', '${templateId || ''}', '${dateStr}')">
                    <div class="day-name" style="${isToday ? 'color:#0f0;' : ''}">${days[i]}${isToday ? ' ◀' : ''}</div>
                    <div style="font-size:9px; opacity:0.5; margin-bottom:4px;">${date.getDate()}/${date.getMonth() + 1}</div>
                    <div class="day-plan" style="font-size:9px; opacity:0.7; margin-bottom:2px;">Plan: ${plannedDisplay}</div>
                    ${actual ? `
                        <div class="day-actual" style="font-size:10px; color:${actual.completed ? '#0f0' : '#f90'};">
                            Did: ${actualType || 'Workout'}
                        </div>
                    ` : (isPast && planned ? `
                        <div class="day-actual" style="font-size:10px; color:#f33;">Missed</div>
                    ` : '')}
                    <div class="day-status ${statusClass}" style="margin-top:4px;">${statusIcon}</div>
                </div>
            `;
        }

        container.innerHTML = html;
    } catch (e) {
        console.error('Failed to load weekly workouts:', e);
    }
}

async function loadWeightData() {
    try {
        // Load latest weight
        const latestRes = await fetch(`${API}/api/fitness/weight/latest`);
        if (latestRes.ok) {
            const latest = await latestRes.json();
            document.getElementById('currentWeight').textContent = `${latest.weight} kg`;
        }

        // Load weight history for chart
        const historyRes = await fetch(`${API}/api/fitness/weight?days=30`);
        if (!historyRes.ok) throw new Error('Failed to load weight history');
        const history = await historyRes.json();

        renderWeightChart(history);

        // Calculate weight change indicator
        if (history.length >= 2) {
            const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
            const first = sorted[0].weight;
            const last = sorted[sorted.length - 1].weight;
            const change = last - first;

            const indicator = document.getElementById('weightChangeIndicator');
            if (change < 0) {
                indicator.textContent = `${change.toFixed(1)} kg (30 days)`;
                indicator.style.color = '#0f0';
            } else if (change > 0) {
                indicator.textContent = `+${change.toFixed(1)} kg (30 days)`;
                indicator.style.color = '#f90';
            } else {
                indicator.textContent = 'No change (30 days)';
                indicator.style.color = 'inherit';
            }
        }
    } catch (e) {
        console.error('Failed to load weight data:', e);
    }
}

function renderWeightChart(data) {
    const ctx = document.getElementById('weightChart')?.getContext('2d');
    if (!ctx) return;

    // Sort by date
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = sorted.map(d => d.date);
    const weights = sorted.map(d => d.weight);

    if (weightChart) {
        weightChart.destroy();
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Weight (kg)',
                data: weights,
                borderColor: '#0f0',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#aaa',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255,255,255,0.1)'
                    },
                    ticks: {
                        color: '#aaa'
                    }
                }
            }
        }
    });
}

async function loadWorkoutHistory() {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/recent`);
        if (!res.ok) throw new Error('Failed to load workout history');
        const workouts = await res.json();

        const container = document.getElementById('workoutHistoryList');
        if (!workouts.length) {
            container.innerHTML = '<div style="opacity:0.5; padding:12px;">No workouts logged yet</div>';
            return;
        }

        container.innerHTML = workouts.map(w => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${w.workoutDate || 'No date'}</div>
                    <div style="font-size:12px; opacity:0.7;">
                        ${w.exerciseType ? w.exerciseType.replace('_', ' ') : 'Unknown'}
                        ${w.durationMinutes ? `• ${w.durationMinutes} min` : ''}
                        ${w.caloriesBurned ? `• ${w.caloriesBurned} cal` : ''}
                    </div>
                    ${w.notes ? `<div style="font-size:11px; opacity:0.5; margin-top:4px;">${w.notes}</div>` : ''}
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <span style="color:${w.completed ? '#0f0' : '#f90'};">${w.completed ? '✓' : '○'}</span>
                    <button class="btn" onclick="editWorkout('${w.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deleteWorkout('${w.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load workout history:', e);
    }
}

async function logWorkout() {
    const date = document.getElementById('workoutDate').value;
    const type = document.getElementById('workoutType').value;
    const duration = document.getElementById('workoutDuration').value;
    const calories = document.getElementById('workoutCalories').value;
    const notes = document.getElementById('workoutNotes').value;
    const completed = document.getElementById('workoutCompleted').checked;

    if (!date || !type) {
        showToast('Please select a date and workout type', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/api/fitness/workouts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workoutDate: date,
                exerciseType: type,
                durationMinutes: duration ? parseInt(duration) : null,
                caloriesBurned: calories ? parseInt(calories) : null,
                notes: notes || null,
                completed: completed
            })
        });

        if (!res.ok) throw new Error('Failed to log workout');

        showToast('Workout logged successfully', 'success');

        // Clear form
        document.getElementById('workoutDuration').value = '';
        document.getElementById('workoutCalories').value = '';
        document.getElementById('workoutNotes').value = '';
        document.getElementById('workoutCompleted').checked = true;

        // Reload data
        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to log workout:', e);
        showToast('Failed to log workout', 'error');
    }
}

async function logWeight() {
    const date = document.getElementById('weightDate').value;
    const weight = document.getElementById('weightValue').value;
    const notes = document.getElementById('weightNotes').value;

    if (!date || !weight) {
        showToast('Please enter date and weight', 'error');
        return;
    }

    try {
        const res = await fetch(`${API}/api/fitness/weight`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: date,
                weight: parseFloat(weight),
                notes: notes || null
            })
        });

        if (!res.ok) throw new Error('Failed to log weight');

        showToast('Weight logged successfully', 'success');

        // Clear form
        document.getElementById('weightValue').value = '';
        document.getElementById('weightNotes').value = '';

        // Reload weight data
        await loadWeightData();
    } catch (e) {
        console.error('Failed to log weight:', e);
        showToast('Failed to log weight', 'error');
    }
}

async function editWorkout(id) {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`);
        if (!res.ok) throw new Error('Failed to fetch workout');
        const workout = await res.json();

        document.getElementById('editWorkoutId').value = workout.id;
        document.getElementById('editWorkoutDate').value = workout.workoutDate || '';
        document.getElementById('editWorkoutType').value = workout.exerciseType || 'PUSH';
        document.getElementById('editWorkoutDuration').value = workout.durationMinutes || '';
        document.getElementById('editWorkoutCalories').value = workout.caloriesBurned || '';
        document.getElementById('editWorkoutNotes').value = workout.notes || '';
        document.getElementById('editWorkoutCompleted').checked = workout.completed;

        openModal('workoutEditModal');
    } catch (e) {
        console.error('Failed to load workout for edit:', e);
        showToast('Failed to load workout', 'error');
    }
}

async function saveWorkoutEdit() {
    const id = document.getElementById('editWorkoutId').value;
    const date = document.getElementById('editWorkoutDate').value;
    const type = document.getElementById('editWorkoutType').value;
    const duration = document.getElementById('editWorkoutDuration').value;
    const calories = document.getElementById('editWorkoutCalories').value;
    const notes = document.getElementById('editWorkoutNotes').value;
    const completed = document.getElementById('editWorkoutCompleted').checked;

    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workoutDate: date,
                exerciseType: type,
                durationMinutes: duration ? parseInt(duration) : null,
                caloriesBurned: calories ? parseInt(calories) : null,
                notes: notes || null,
                completed: completed
            })
        });

        if (!res.ok) throw new Error('Failed to update workout');

        closeModal('workoutEditModal');
        showToast('Workout updated successfully', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to update workout:', e);
        showToast('Failed to update workout', 'error');
    }
}

async function deleteWorkout(id) {
    if (!confirm('Delete this workout?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/workouts/${id}`, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Failed to delete workout');

        showToast('Workout deleted', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to delete workout:', e);
        showToast('Failed to delete workout', 'error');
    }
}

/* ===========================================================
   FITNESS TEMPLATES
=============================================================*/

let templatesCache = [];

async function loadTemplates() {
    try {
        const res = await fetch(`${API}/api/fitness/templates`);
        if (!res.ok) throw new Error('Failed to load templates');
        templatesCache = await res.json();

        const container = document.getElementById('templatesList');
        if (!templatesCache.length) {
            container.innerHTML = '<div style="opacity:0.5; padding:12px;">No templates yet. Create one to get started.</div>';
            return;
        }

        container.innerHTML = templatesCache.map(t => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${t.name}</div>
                    <div style="font-size:12px; opacity:0.7;">
                        ${t.exerciseType ? t.exerciseType.replace('_', ' ') : 'Unknown'}
                        ${t.estimatedDuration ? `• ${t.estimatedDuration} min` : ''}
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn" onclick="quickLogFromTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">LOG TODAY</button>
                    <button class="btn" onclick="editTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deleteTemplate('${t.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');

        // Update plan dropdowns
        updatePlanTemplateDropdowns();
    } catch (e) {
        console.error('Failed to load templates:', e);
    }
}

function updatePlanTemplateDropdowns() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const select = document.getElementById(`plan${day}`);
        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="">Rest</option>' +
                templatesCache.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            select.value = currentVal;
        }
    });
}

function showAddTemplateModal() {
    document.getElementById('templateModalTitle').textContent = 'Add Template';
    document.getElementById('editTemplateId').value = '';
    document.getElementById('templateName').value = '';
    document.getElementById('templateType').value = 'PUSH';
    document.getElementById('templateDuration').value = '';
    document.getElementById('templateNotes').value = '';
    openModal('templateModal');
}

async function editTemplate(id) {
    try {
        const res = await fetch(`${API}/api/fitness/templates/${id}`);
        if (!res.ok) throw new Error('Failed to fetch template');
        const template = await res.json();

        document.getElementById('templateModalTitle').textContent = 'Edit Template';
        document.getElementById('editTemplateId').value = template.id;
        document.getElementById('templateName').value = template.name || '';
        document.getElementById('templateType').value = template.exerciseType || 'PUSH';
        document.getElementById('templateDuration').value = template.estimatedDuration || '';
        document.getElementById('templateNotes').value = template.notes || '';

        openModal('templateModal');
    } catch (e) {
        console.error('Failed to load template:', e);
        showToast('Failed to load template', 'error');
    }
}

async function saveTemplate() {
    const id = document.getElementById('editTemplateId').value;
    const name = document.getElementById('templateName').value;
    const exerciseType = document.getElementById('templateType').value;
    const duration = document.getElementById('templateDuration').value;
    const notes = document.getElementById('templateNotes').value;

    if (!name) {
        showToast('Please enter a template name', 'error');
        return;
    }

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/fitness/templates/${id}` : `${API}/api/fitness/templates`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                exerciseType,
                estimatedDuration: duration ? parseInt(duration) : null,
                notes: notes || null
            })
        });

        if (!res.ok) throw new Error('Failed to save template');

        closeModal('templateModal');
        showToast(id ? 'Template updated' : 'Template created', 'success');
        await loadTemplates();
    } catch (e) {
        console.error('Failed to save template:', e);
        showToast('Failed to save template', 'error');
    }
}

async function deleteTemplate(id) {
    if (!confirm('Delete this template?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/templates/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete template');

        showToast('Template deleted', 'success');
        await loadTemplates();
    } catch (e) {
        console.error('Failed to delete template:', e);
        showToast('Failed to delete template', 'error');
    }
}

async function quickLogFromTemplate(templateId) {
    try {
        const res = await fetch(`${API}/api/fitness/workouts/from-template/${templateId}`, {
            method: 'POST'
        });

        if (!res.ok) throw new Error('Failed to log workout');

        showToast('Workout logged from template', 'success');

        await Promise.all([
            loadFitnessStats(),
            loadWeeklyWorkouts(),
            loadWorkoutHistory()
        ]);
    } catch (e) {
        console.error('Failed to log from template:', e);
        showToast('Failed to log workout', 'error');
    }
}

/* ===========================================================
   FITNESS PLANS
=============================================================*/

async function loadPlans() {
    try {
        const res = await fetch(`${API}/api/fitness/plans`);
        if (!res.ok) throw new Error('Failed to load plans');
        const plans = await res.json();

        // Show active plan
        const activeDisplay = document.getElementById('activePlanDisplay');
        const activePlan = plans.find(p => p.active);
        if (activePlan) {
            const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
            const schedule = days.map(day => {
                const templateId = activePlan.schedule[day];
                const template = templatesCache.find(t => t.id === templateId);
                return template ? template.name : 'Rest';
            });
            activeDisplay.innerHTML = `
                <div style="border:1px solid #0f0; padding:12px; background:rgba(0,255,0,0.05);">
                    <div style="font-weight:bold; color:#0f0; margin-bottom:8px;">Active: ${activePlan.name}</div>
                    <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; font-size:11px; text-align:center;">
                        ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) =>
                            `<div><div style="opacity:0.7;">${d}</div><div>${schedule[i]}</div></div>`
                        ).join('')}
                    </div>
                </div>
            `;
        } else {
            activeDisplay.innerHTML = '<div style="opacity:0.5; font-size:12px;">No active plan. Create and activate a plan.</div>';
        }

        // Show all plans
        const container = document.getElementById('plansList');
        if (!plans.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = plans.map(p => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:12px;">
                <div>
                    <div style="font-weight:bold;">${p.name} ${p.active ? '<span style="color:#0f0;">(Active)</span>' : ''}</div>
                </div>
                <div style="display:flex; gap:8px;">
                    ${!p.active ? `<button class="btn" onclick="activatePlan('${p.id}')" style="padding:4px 8px; font-size:11px;">ACTIVATE</button>` : ''}
                    <button class="btn" onclick="editPlan('${p.id}')" style="padding:4px 8px; font-size:11px;">EDIT</button>
                    <button class="btn" onclick="deletePlan('${p.id}')" style="padding:4px 8px; font-size:11px;">DEL</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Failed to load plans:', e);
    }
}

function showAddPlanModal() {
    document.getElementById('planModalTitle').textContent = 'Add Plan';
    document.getElementById('editPlanId').value = '';
    document.getElementById('planName').value = '';
    document.getElementById('planActive').checked = false;
    document.getElementById('planNotes').value = '';

    // Reset dropdowns
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    days.forEach(day => {
        const select = document.getElementById(`plan${day}`);
        if (select) select.value = '';
    });

    updatePlanTemplateDropdowns();
    openModal('planModal');
}

async function editPlan(id) {
    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}`);
        if (!res.ok) throw new Error('Failed to fetch plan');
        const plan = await res.json();

        document.getElementById('planModalTitle').textContent = 'Edit Plan';
        document.getElementById('editPlanId').value = plan.id;
        document.getElementById('planName').value = plan.name || '';
        document.getElementById('planActive').checked = plan.active;
        document.getElementById('planNotes').value = plan.notes || '';

        updatePlanTemplateDropdowns();

        // Set schedule
        const dayMap = {
            'MONDAY': 'Monday', 'TUESDAY': 'Tuesday', 'WEDNESDAY': 'Wednesday',
            'THURSDAY': 'Thursday', 'FRIDAY': 'Friday', 'SATURDAY': 'Saturday', 'SUNDAY': 'Sunday'
        };
        Object.entries(plan.schedule || {}).forEach(([day, templateId]) => {
            const select = document.getElementById(`plan${dayMap[day]}`);
            if (select) select.value = templateId || '';
        });

        openModal('planModal');
    } catch (e) {
        console.error('Failed to load plan:', e);
        showToast('Failed to load plan', 'error');
    }
}

async function savePlan() {
    const id = document.getElementById('editPlanId').value;
    const name = document.getElementById('planName').value;
    const active = document.getElementById('planActive').checked;
    const notes = document.getElementById('planNotes').value;

    if (!name) {
        showToast('Please enter a plan name', 'error');
        return;
    }

    // Build schedule
    const schedule = {};
    const dayMap = {
        'Monday': 'MONDAY', 'Tuesday': 'TUESDAY', 'Wednesday': 'WEDNESDAY',
        'Thursday': 'THURSDAY', 'Friday': 'FRIDAY', 'Saturday': 'SATURDAY', 'Sunday': 'SUNDAY'
    };
    Object.entries(dayMap).forEach(([jsDay, javaDay]) => {
        const select = document.getElementById(`plan${jsDay}`);
        if (select && select.value) {
            schedule[javaDay] = select.value;
        }
    });

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API}/api/fitness/plans/${id}` : `${API}/api/fitness/plans`;

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, schedule, active, notes: notes || null })
        });

        if (!res.ok) throw new Error('Failed to save plan');

        closeModal('planModal');
        showToast(id ? 'Plan updated' : 'Plan created', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to save plan:', e);
        showToast('Failed to save plan', 'error');
    }
}

async function activatePlan(id) {
    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}/activate`, { method: 'PUT' });
        if (!res.ok) throw new Error('Failed to activate plan');

        showToast('Plan activated', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to activate plan:', e);
        showToast('Failed to activate plan', 'error');
    }
}

async function deletePlan(id) {
    if (!confirm('Delete this plan?')) return;

    try {
        const res = await fetch(`${API}/api/fitness/plans/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete plan');

        showToast('Plan deleted', 'success');
        await loadPlans();
    } catch (e) {
        console.error('Failed to delete plan:', e);
        showToast('Failed to delete plan', 'error');
    }
}

/* ===========================================================
   FITNESS ANALYTICS
=============================================================*/

let workoutTypeChart = null;
let weeklyVolumeChart = null;

async function loadFitnessAnalytics() {
    try {
        const res = await fetch(`${API}/api/fitness/analytics?weeks=12`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const analytics = await res.json();

        // Update consistency score
        document.getElementById('consistencyScore').textContent = analytics.consistencyScore + '%';
        document.getElementById('avgWorkoutsPerWeek').textContent = analytics.averageWorkoutsPerWeek.toFixed(1);

        // Render charts
        renderWorkoutTypeChart(analytics.workoutsByType);
        renderWeeklyVolumeChart(analytics.weeklyVolume);
    } catch (e) {
        console.error('Failed to load fitness analytics:', e);
    }
}

function renderWorkoutTypeChart(data) {
    const ctx = document.getElementById('workoutTypeChart')?.getContext('2d');
    if (!ctx) return;

    const labels = Object.keys(data).map(k => k.replace('_', ' '));
    const values = Object.values(data);
    const colors = ['#0f0', '#39f', '#f90', '#f33', '#90f', '#0ff', '#ff0'];

    if (workoutTypeChart) {
        workoutTypeChart.destroy();
    }

    workoutTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#000',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#fff',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
}

function renderWeeklyVolumeChart(data) {
    const ctx = document.getElementById('weeklyVolumeChart')?.getContext('2d');
    if (!ctx) return;

    const labels = data.map(d => d.weekLabel.split('-W')[1] ? 'W' + d.weekLabel.split('-W')[1] : d.weekLabel);
    const workouts = data.map(d => d.workoutCount);
    const minutes = data.map(d => d.totalMinutes);

    if (weeklyVolumeChart) {
        weeklyVolumeChart.destroy();
    }

    weeklyVolumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Workouts',
                data: workouts,
                backgroundColor: '#0f0',
                borderColor: '#0f0',
                borderWidth: 1,
                yAxisID: 'y'
            }, {
                label: 'Minutes',
                data: minutes,
                backgroundColor: 'rgba(57, 159, 255, 0.5)',
                borderColor: '#39f',
                borderWidth: 1,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#fff',
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#aaa', font: { size: 9 } }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#0f0', stepSize: 1 },
                    title: { display: true, text: 'Workouts', color: '#0f0' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#39f' },
                    title: { display: true, text: 'Minutes', color: '#39f' }
                }
            }
        }
    });
}

/* ===========================================================
   INIT
=============================================================*/

document.addEventListener('DOMContentLoaded', function() {
    loadFitnessTab();
});
