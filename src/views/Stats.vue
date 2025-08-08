<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white">Statistikk</h1>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Sets</p>
            <p class="text-2xl font-bold text-white">{{ totalSets }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Reps</p>
            <p class="text-2xl font-bold text-white">{{ totalReps }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Fullførte Økter</p>
            <p class="text-2xl font-bold text-white">{{ workoutData.completedSessions.value.length }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Snitt Varighet</p>
            <p class="text-2xl font-bold text-white">{{ workoutData.averageWorkoutDuration.value }} min</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Over Time -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Fremgang over Tid</h3>
      
      <!-- Personal Records -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-white mb-4">Personlige Rekorder</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            v-for="pr in personalRecords" 
            :key="pr.exercise"
            class="bg-dark-700 rounded-lg p-3"
          >
            <div class="text-sm text-dark-300">{{ pr.exercise }}</div>
            <div class="text-lg font-bold text-primary-500">{{ pr.weight }} kg</div>
            <div class="text-xs text-dark-300">{{ pr.reps }} reps • {{ pr.date }}</div>
          </div>
        </div>
      </div>

      <!-- Weekly Volume Chart -->
      <div>
        <h4 class="text-md font-medium text-white mb-4">One Rep Max Progresjon</h4>
        <div class="space-y-2">
          <div 
            v-for="max in oneRepMaxProgression" 
            :key="max.exercise"
            class="bg-dark-700 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-white font-medium">{{ max.exercise }}</div>
                <div class="text-xs text-dark-300">{{ max.date }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-primary-500">{{ max.weight }} kg</div>
                <div class="text-xs text-dark-300">1RM</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Training Habits -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Treningsvaner</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Weekly Average -->
        <div class="text-center p-4 bg-dark-700 rounded-lg">
          <div class="text-2xl font-bold text-primary-500 mb-1">{{ averageWorkoutsPerWeek }}</div>
          <div class="text-xs text-dark-300">Økter/uke siste 3 måneder</div>
        </div>
        
        <!-- Current Streak -->
        <div class="text-center p-4 bg-dark-700 rounded-lg">
          <div class="text-2xl font-bold text-primary-500 mb-1">{{ currentStreak }}</div>
          <div class="text-xs text-dark-300">Dager på rad</div>
        </div>
        
        <!-- Longest Streak -->
        <div class="text-center p-4 bg-dark-700 rounded-lg">
          <div class="text-2xl font-bold text-primary-500 mb-1">{{ longestStreak }}</div>
          <div class="text-xs text-dark-300">Lengste streak</div>
        </div>
      </div>

      <!-- Training Calendar Heatmap -->
      <div class="mt-6">
        <h4 class="text-md font-medium text-white mb-4">Treningskalender</h4>
        <div class="grid grid-cols-7 gap-1 max-w-md">
          <div 
            v-for="day in trainingCalendar" 
            :key="day.date"
            class="w-8 h-8 rounded-sm transition-colors"
            :class="getCalendarDayClass(day.trained)"
            :title="`${day.date}: ${day.trained ? 'Trenet' : 'Ikke trent'}`"
          ></div>
        </div>
        <div class="flex items-center gap-4 mt-3 text-xs text-dark-300">
          <span>Ikke trent</span>
          <div class="flex gap-1">
            <div class="w-3 h-3 bg-dark-700 rounded-sm"></div>
            <div class="w-3 h-3 bg-primary-500 rounded-sm"></div>
          </div>
          <span>Trent</span>
        </div>
      </div>
    </div>

    <!-- Distribution and Balance -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Fordeling og Balanse</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Muscle Group Distribution -->
        <div>
          <h4 class="text-md font-medium text-white mb-4">Muskelgruppe Fordeling</h4>
          <div class="space-y-3">
            <div 
              v-for="group in muscleGroupDistribution" 
              :key="group.name"
              class="flex items-center gap-3"
            >
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: group.color }"></div>
              <div class="flex-1 text-sm text-white">{{ group.name }}</div>
              <div class="text-sm font-medium text-primary-500">{{ group.percentage }}%</div>
            </div>
          </div>
        </div>
        
        <!-- Training Type Balance -->
        <div>
          <h4 class="text-md font-medium text-white mb-4">Trenings Type Balanse</h4>
          <div class="space-y-3">
            <div 
              v-for="type in trainingTypeBalance" 
              :key="type.name"
              class="flex items-center gap-3"
            >
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: type.color }"></div>
              <div class="flex-1 text-sm text-white">{{ type.name }}</div>
              <div class="text-sm font-medium text-primary-500">{{ type.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievements and Motivation -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Prestasjoner og Motivasjon</h3>
      
      <!-- Achievements Grid -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-white mb-4">Prestasjoner</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            v-for="achievement in achievements" 
            :key="achievement.id"
            class="text-center p-3 bg-dark-700 rounded-lg"
            :class="{ 'border-2 border-primary-500': achievement.earned }"
          >
            <div class="text-2xl mb-1">{{ achievement.icon }}</div>
            <div class="text-xs text-white font-medium">{{ achievement.title }}</div>
            <div class="text-xs text-dark-300">{{ achievement.description }}</div>
          </div>
        </div>
      </div>

      <!-- Progress to Next Goal -->
      <div>
        <h4 class="text-md font-medium text-white mb-4">Neste Mål</h4>
        <div class="bg-dark-700 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-white">{{ nextGoal.title }}</span>
            <span class="text-sm text-primary-500">{{ nextGoal.progress }}/{{ nextGoal.target }}</span>
          </div>
          <div class="w-full bg-dark-600 rounded-full h-2">
            <div 
              class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
              :style="{ width: `${nextGoal.percentage}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHybridData } from '@/composables/useHybridData'

const workoutData = useHybridData()

// Computed
const averageVolumePerWorkout = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  return workoutData.totalVolume.value / workoutData.completedSessions.value.length
})

const totalSets = computed(() => {
  return workoutData.completedSessions.value.reduce((total, session) => {
    return total + session.exercises.reduce((exerciseTotal, exercise) => {
      return exerciseTotal + exercise.sets.filter(set => set.isCompleted).length
    }, 0)
  }, 0)
})

const totalReps = computed(() => {
  return workoutData.completedSessions.value.reduce((total, session) => {
    return total + session.exercises.reduce((exerciseTotal, exercise) => {
      return exerciseTotal + exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.isCompleted && set.reps ? set.reps : 0)
      }, 0)
    }, 0)
  }, 0)
})

const workoutTypeStats = computed(() => {
  const typeCounts: { [key: string]: number } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    typeCounts[session.workoutType] = (typeCounts[session.workoutType] || 0) + 1
  })

  const totalSessions = workoutData.completedSessions.value.length
  
  return workoutData.workoutTypes.value.map(type => ({
    id: type.id,
    name: type.name,
    color: type.color,
    count: typeCounts[type.id] || 0,
    percentage: totalSessions > 0 ? Math.round((typeCounts[type.id] || 0) / totalSessions * 100) : 0
  })).filter(stat => stat.count > 0)
})

const bestPerformances = computed(() => {
  const performances: { [key: string]: { name: string; weight: number; reps: number; date: string; volume: number } } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        if (set.isCompleted && set.weight && set.reps) {
          const volume = set.weight * set.reps
          const exerciseId = exercise.exerciseId
          
          if (!performances[exerciseId] || volume > performances[exerciseId].volume) {
            performances[exerciseId] = {
              name: exercise.name,
              weight: set.weight,
              reps: set.reps,
              date: formatDate(session.date),
              volume: volume
            }
          }
        }
      })
    })
  })
  
  return Object.values(performances)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
})

const muscleGroupStats = computed(() => {
  const groupVolumes: { [key: string]: number } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      // Get exercise data to find muscle groups
      const exerciseData = workoutData.exercises.value.find(e => e.id === exercise.exerciseId)
      const muscleGroups = exerciseData?.muscleGroups || []
      
      exercise.sets.forEach(set => {
        if (set.isCompleted && set.weight && set.reps) {
          const volume = set.weight * set.reps
          muscleGroups.forEach((group: string) => {
            groupVolumes[group] = (groupVolumes[group] || 0) + volume
          })
        }
      })
    })
  })
  
  return Object.entries(groupVolumes)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
})

const currentStreak = computed(() => {
  return getCurrentStreak()
})

const longestStreak = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  let maxStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null
  
  for (const session of sortedSessions) {
    const sessionDate = new Date(session.date)
    sessionDate.setHours(0, 0, 0, 0)
    
    if (lastDate) {
      const daysDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    
    lastDate = sessionDate
  }
  
  return Math.max(maxStreak, currentStreak)
})

const averageWorkoutsPerWeek = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedSessions.length < 2) return 1
  
  const firstDate = new Date(sortedSessions[0].date)
  const lastDate = new Date(sortedSessions[sortedSessions.length - 1].date)
  const weeksDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
  
  return weeksDiff > 0 ? Math.round((sortedSessions.length / weeksDiff) * 10) / 10 : sortedSessions.length
})

const consistencyPercentage = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedSessions.length < 2) return 100
  
  const firstDate = new Date(sortedSessions[0].date)
  const lastDate = new Date(sortedSessions[sortedSessions.length - 1].date)
  const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Count days with workouts
  const workoutDays = new Set()
  sortedSessions.forEach(session => {
    const date = new Date(session.date)
    date.setHours(0, 0, 0, 0)
    workoutDays.add(date.getTime())
  })
  
  return totalDays > 0 ? Math.round((workoutDays.size / totalDays) * 100) : 100
})

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const getWorkoutTypeName = (typeId: string): string => {
  const type = workoutData.getWorkoutType.value(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getWeeklyProgressPercentage = (volume: number): number => {
  const maxVolume = Math.max(...workoutData.workoutStats.value.weeklyProgress.map(w => w.volume))
  if (maxVolume === 0) return 0
  return Math.round((volume / maxVolume) * 100)
}

const getCalendarDayClass = (trained: boolean): string => {
  if (!trained) return 'bg-dark-700'
  return 'bg-primary-500 rounded-sm'
}

const getMuscleGroupPercentage = (volume: number): number => {
  const maxVolume = Math.max(...muscleGroupStats.value.map(group => group.volume))
  if (maxVolume === 0) return 0
  return Math.round((volume / maxVolume) * 100)
}



const trainingCalendar = computed(() => {
  const calendar: { date: string; trained: boolean }[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Show last 30 days

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const sessionsOnDate = workoutData.completedSessions.value.filter(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === date.getTime();
    });

    const trained = sessionsOnDate.length > 0;
    calendar.push({ date: formatDate(date), trained: trained });
  }
  return calendar;
});

const oneRepMaxProgression = computed(() => {
  const oneRepMaxes: { [key: string]: { exercise: string; weight: number; date: string } } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        // Look for sets with exactly 1 rep (one rep max attempts)
        if (set.isCompleted && set.weight && set.reps === 1) {
          const exerciseId = exercise.exerciseId
          
          // Keep the highest weight for each exercise
          if (!oneRepMaxes[exerciseId] || set.weight > oneRepMaxes[exerciseId].weight) {
            oneRepMaxes[exerciseId] = {
              exercise: exercise.name,
              weight: set.weight,
              date: formatDate(session.date)
            }
          }
        }
      })
    })
  })
  
  return Object.values(oneRepMaxes)
    .sort((a, b) => b.weight - a.weight) // Sort by weight descending
    .slice(0, 5) // Show top 5
})

const personalRecords = computed(() => {
  const records: { exercise: string; weight: number; reps: number; date: string }[] = []
  const exerciseNames = new Set<string>()

  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      exerciseNames.add(exercise.name)
    })
  })

  exerciseNames.forEach(name => {
    const exerciseSessions = workoutData.completedSessions.value.filter(session =>
      session.exercises.some(exercise => exercise.name === name)
    )

    const maxWeight = Math.max(...exerciseSessions.map(session => {
      const maxSetWeight = Math.max(...session.exercises.find(e => e.name === name)?.sets.map(set => set.weight || 0) || [])
      return maxSetWeight
    }))

    const maxReps = Math.max(...exerciseSessions.map(session => {
      const maxSetReps = Math.max(...session.exercises.find(e => e.name === name)?.sets.map(set => set.reps || 0) || [])
      return maxSetReps
    }))

    const lastSession = exerciseSessions.reduce((last, current) => {
      return new Date(current.date) > new Date(last.date) ? current : last
    }, exerciseSessions[0])

    if (maxWeight > 0 || maxReps > 0) {
      records.push({
        exercise: name,
        weight: maxWeight,
        reps: maxReps,
        date: formatDate(lastSession.date)
      })
    }
  })

  return records.sort((a, b) => b.weight - a.weight || b.reps - a.reps || new Date(b.date).getTime() - new Date(a.date).getTime())
})

const muscleGroupDistribution = computed(() => {
  const totalVolume = muscleGroupStats.value.reduce((sum, group) => sum + group.volume, 0)
  if (totalVolume === 0) return []

  return muscleGroupStats.value.map(group => ({
    name: group.name,
    color: getWorkoutTypeColor(group.name), // Assuming muscle groups are workout types for now
    percentage: Math.round((group.volume / totalVolume) * 100)
  }))
})

const trainingTypeBalance = computed(() => {
  const typeCounts: { [key: string]: number } = {}
  workoutData.completedSessions.value.forEach(session => {
    typeCounts[session.workoutType] = (typeCounts[session.workoutType] || 0) + 1
  })

  const totalSessions = workoutData.completedSessions.value.length
  if (totalSessions === 0) return []

  return workoutData.workoutTypes.value.map(type => ({
    name: type.name,
    color: type.color,
    percentage: Math.round((typeCounts[type.id] || 0) / totalSessions * 100)
  }))
})

const achievements = computed(() => {
  const achievements: { id: string; icon: string; title: string; description: string; earned: boolean }[] = []

  // Example achievements (replace with actual logic)
  if (currentStreak.value >= 30) {
    achievements.push({ id: 'streak-30', icon: '⚡️', title: '30 Dagers Streak', description: 'Du har holdt 30 dager på rad!', earned: true })
  }
  if (totalReps.value >= 1000) {
    achievements.push({ id: 'reps-1000', icon: '💪', title: '1000 Reps', description: 'Du har fullført 1000 reps!', earned: true })
  }
  if (totalSets.value >= 500) {
    achievements.push({ id: 'sets-500', icon: '⚙️', title: '500 Sets', description: 'Du har fullført 500 sets!', earned: true })
  }
  if (consistencyPercentage.value >= 90) {
    achievements.push({ id: 'consistency-90', icon: '🎯', title: '90% Konsistens', description: 'Du har 90% konsistens i treningsplanen!', earned: true })
  }

  return achievements
})

const nextGoal = computed(() => {
  const currentVolume = workoutData.totalVolume.value
  const targetVolume = 10000 // Example target
  const progress = Math.min(currentVolume, targetVolume)
  const percentage = Math.round((progress / targetVolume) * 100)

  if (percentage >= 100) {
    return { title: 'Mål oppnådd!', progress: progress, target: targetVolume, percentage: 100 }
  }

  return { title: 'Neste mål: 10000 kg volum', progress: progress, target: targetVolume, percentage: percentage }
})

const getCurrentStreak = (): number => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sortedSessions.length; i++) {
    const sessionDate = new Date(sortedSessions[i].date)
    sessionDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === streak) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}
</script> 