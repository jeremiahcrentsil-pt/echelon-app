import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { CONTENT_LIBRARY } from "../src/lib/data/content";
import { SEED_WORKOUTS } from "../src/lib/data/workouts";
import { toJson } from "../src/lib/json";

const prisma = new PrismaClient();

const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD ?? "coach123";
const CLIENT_PASSWORD = process.env.SEED_CLIENT_PASSWORD ?? "client123";

async function main() {
  const coachHash = await bcrypt.hash(COACH_PASSWORD, 10);
  const clientHash = await bcrypt.hash(CLIENT_PASSWORD, 10);

  const coach = await prisma.user.upsert({
    where: { email: "jeremiah@echelon.local" },
    update: {
      name: "Jeremiah Crentsil",
      role: "coach",
      passwordHash: coachHash,
    },
    create: {
      id: "coach-jeremiah",
      email: "jeremiah@echelon.local",
      name: "Jeremiah Crentsil",
      role: "coach",
      passwordHash: coachHash,
    },
  });

  const alex = await prisma.user.upsert({
    where: { email: "alex@example.com" },
    update: {
      name: "Alex Rivera",
      role: "client",
      phase: "Cut · Plan A",
      passwordHash: clientHash,
    },
    create: {
      id: "client-alex",
      email: "alex@example.com",
      name: "Alex Rivera",
      role: "client",
      phase: "Cut · Plan A",
      passwordHash: clientHash,
    },
  });

  const sam = await prisma.user.upsert({
    where: { email: "sam@example.com" },
    update: {
      name: "Sam Chen",
      role: "client",
      phase: "Recomp",
      passwordHash: clientHash,
    },
    create: {
      id: "client-sam",
      email: "sam@example.com",
      name: "Sam Chen",
      role: "client",
      phase: "Recomp",
      passwordHash: clientHash,
    },
  });

  for (const item of CONTENT_LIBRARY) {
    await prisma.contentItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        summary: item.summary,
        type: item.type,
        category: item.category,
        tags: toJson(item.tags),
        postedAt: item.postedAt,
        durationOrPages: item.durationOrPages,
        body: item.body,
        openLabel: item.openLabel,
        openHref: item.openHref ?? null,
        createdById: coach.id,
      },
      create: {
        id: item.id,
        title: item.title,
        summary: item.summary,
        type: item.type,
        category: item.category,
        tags: toJson(item.tags),
        postedAt: item.postedAt,
        durationOrPages: item.durationOrPages,
        body: item.body,
        openLabel: item.openLabel,
        openHref: item.openHref ?? null,
        createdById: coach.id,
      },
    });
  }

  const workoutCount = await prisma.workout.count({ where: { userId: alex.id } });
  if (workoutCount === 0) {
    for (const workout of SEED_WORKOUTS) {
      await prisma.workout.create({
        data: {
          id: workout.id,
          userId: alex.id,
          title: workout.title,
          performedAt: new Date(workout.performedAt),
          durationMinutes: workout.durationMinutes ?? null,
          notes: workout.notes ?? null,
          exercises: toJson(workout.exercises),
        },
      });
    }
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  const dateKey = `${y}-${m}-${d}`;

  const nutritionCount = await prisma.nutritionEntry.count({
    where: { userId: alex.id },
  });
  if (nutritionCount === 0) {
    await prisma.nutritionEntry.createMany({
      data: [
        {
          id: "n-seed-1",
          userId: alex.id,
          date: dateKey,
          meal: "breakfast",
          name: "Greek yogurt",
          brand: "Fage",
          servingLabel: "170 g",
          servings: 1,
          macros: toJson({ calories: 150, proteinG: 20, carbsG: 6, fatG: 4 }),
          source: "seed",
          loggedAt: new Date(),
        },
        {
          id: "n-seed-2",
          userId: alex.id,
          date: dateKey,
          meal: "lunch",
          name: "Chicken breast",
          servingLabel: "6 oz cooked",
          servings: 1,
          macros: toJson({ calories: 280, proteinG: 52, carbsG: 0, fatG: 6 }),
          source: "seed",
          loggedAt: new Date(),
        },
      ],
    });
  }

  const checkInCount = await prisma.checkInSubmission.count();
  if (checkInCount === 0) {
    await prisma.checkInSubmission.create({
      data: {
        id: "ci-seed-alex",
        userId: alex.id,
        formId: "weekly-check-in",
        formTitle: "Weekly check-in",
        submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 18),
        answers: toJson({
          weight: "176.2",
          energy: "7",
          sleep: "7",
          training_adherence: "Most sessions",
          nutrition_adherence: "Mostly on",
          notes: "Travel Friday — logged a hotel gym session.",
        }),
      },
    });
  }

  const monitoringCount = await prisma.monitoringEntry.count({
    where: { userId: alex.id },
  });
  if (monitoringCount === 0) {
    for (let i = 1; i <= 3; i += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dk = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      await prisma.monitoringEntry.create({
        data: {
          id: `m-seed-${i}`,
          userId: alex.id,
          date: dk,
          steps: 7200 + i * 400,
          waterLiters: 2.2 + i * 0.1,
          readiness: 3 + (i % 2),
          mood: 3 + ((i + 1) % 2),
          sleepQuality: 4 - (i % 2),
          notes: i === 1 ? "Solid day overall." : null,
          loggedAt: day,
        },
      });
    }
  }

  const mealPlanDays = [
    {
      dayIndex: 0,
      label: "Monday",
      focus: "Lower body training",
      meals: [
        {
          id: "m-mon-b",
          slot: "breakfast",
          name: "Greek yogurt bowl",
          description: "Nonfat Greek yogurt, berries, 30 g oats",
          calories: 380,
          proteinG: 35,
          carbsG: 42,
          fatG: 8,
        },
        {
          id: "m-mon-l",
          slot: "lunch",
          name: "Chicken rice bowl",
          description: "6 oz chicken, 1 cup rice, veggies",
          calories: 520,
          proteinG: 48,
          carbsG: 55,
          fatG: 10,
          notes: "Add hot sauce freely",
        },
        {
          id: "m-mon-s",
          slot: "snack",
          name: "Whey + apple",
          description: "1 scoop whey, medium apple",
          calories: 220,
          proteinG: 25,
          carbsG: 25,
          fatG: 2,
        },
        {
          id: "m-mon-d",
          slot: "dinner",
          name: "Salmon & potatoes",
          description: "5 oz salmon, roasted potatoes, greens",
          calories: 580,
          proteinG: 42,
          carbsG: 45,
          fatG: 22,
        },
      ],
    },
  ];

  // Expand remaining days lightly for seed completeness
  const dayLabels = [
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  for (let i = 0; i < dayLabels.length; i += 1) {
    mealPlanDays.push({
      dayIndex: i + 1,
      label: dayLabels[i],
      focus: i < 4 ? "Training" : "Recovery",
      meals: [
        {
          id: `m-d${i + 1}-b`,
          slot: "breakfast",
          name: "Protein breakfast",
          description: "Eggs or yogurt + carbs",
          calories: 400,
          proteinG: 30,
          carbsG: 40,
          fatG: 12,
        },
        {
          id: `m-d${i + 1}-l`,
          slot: "lunch",
          name: "Lean protein bowl",
          description: "Chicken/fish, rice, veg",
          calories: 520,
          proteinG: 45,
          carbsG: 50,
          fatG: 12,
        },
        {
          id: `m-d${i + 1}-s`,
          slot: "snack",
          name: "Protein snack",
          description: "Shake or cottage cheese",
          calories: 200,
          proteinG: 25,
          carbsG: 15,
          fatG: 3,
        },
        {
          id: `m-d${i + 1}-d`,
          slot: "dinner",
          name: "Dinner plate",
          description: "Protein + starch + greens",
          calories: 560,
          proteinG: 45,
          carbsG: 45,
          fatG: 18,
        },
      ],
    });
  }

  let mealPlan = await prisma.mealPlan.findUnique({ where: { id: "plan-cut-a" } });
  if (!mealPlan) {
    mealPlan = await prisma.mealPlan.create({
      data: {
        id: "plan-cut-a",
        title: "Cut phase · Plan A",
        coachNote:
          "Hit protein first. Swap like-for-like carbs if needed — keep the plate simple on training days.",
        calorieTarget: 2200,
        proteinTargetG: 180,
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        days: toJson(mealPlanDays),
        createdById: coach.id,
        assignments: {
          create: [{ userId: alex.id }],
        },
      },
    });
  }

  let workoutPlan = await prisma.workoutPlan.findUnique({
    where: { id: "wp-strength-a" },
  });
  if (!workoutPlan) {
    workoutPlan = await prisma.workoutPlan.create({
      data: {
        id: "wp-strength-a",
        title: "Strength block · Week template",
        coachNote: "Log working sets honestly. Warm up to the first listed load.",
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        createdById: coach.id,
        sessions: toJson([
          {
            id: "ws-lower-a",
            title: "Lower strength A",
            dayLabel: "Day 1",
            exercises: [
              {
                id: "we-1",
                name: "Back squat",
                prescription: "3×5 @ RPE 7",
                notes: "Pause first rep",
              },
              { id: "we-2", name: "Romanian deadlift", prescription: "3×8" },
              { id: "we-3", name: "Walking lunge", prescription: "2×10/leg" },
            ],
          },
          {
            id: "ws-upper-a",
            title: "Upper push / pull",
            dayLabel: "Day 2",
            exercises: [
              { id: "we-4", name: "Bench press", prescription: "3×6" },
              { id: "we-5", name: "Chest-supported row", prescription: "3×10" },
              { id: "we-6", name: "Cable face pull", prescription: "3×15" },
            ],
          },
        ]),
        assignments: {
          create: [{ userId: alex.id }],
        },
      },
    });
  }

  console.log("Seeded users:", {
    coach: coach.email,
    alex: alex.email,
    sam: sam.email,
  });
  console.log("Demo passwords — coach:", COACH_PASSWORD, "| clients:", CLIENT_PASSWORD);
  console.log("Plans:", { mealPlan: mealPlan.id, workoutPlan: workoutPlan.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
