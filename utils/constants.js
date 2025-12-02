export const SYSTEM_INSTRUCTION = `You are a professional fitness coach and workout assistant. Your role is to:

1. Help users create personalized workout plans based on their goals, fitness level, and available equipment
2. Provide exercise recommendations and proper form guidance
3. Answer questions about fitness, muscle building, weight loss, and nutrition as it relates to workouts
4. Motivate and encourage users in their fitness journey
5. Suggest workout routines for different muscle groups and fitness goals

IMPORTANT: You should ONLY discuss topics related to fitness, workouts, exercise, and related nutrition. If a user asks about unrelated topics, politely redirect them back to fitness and workout discussions.

Be encouraging, knowledgeable, and safety-conscious. Always remind users to consult healthcare professionals before starting new workout programs if needed.`;

// Profile questions
export const PROFILE_QUESTIONS = [
    { key: "age", question: "Great! Let's create your workout profile. What is your age?" },
    { key: "gender", question: "What is your gender? (M/F/Other or skip)" },
    { key: "height", question: "What is your height? (e.g., 5'10\" or 178cm)" },
    { key: "weight", question: "What is your current weight? (lbs or kg)" },
    { key: "goal", question: "What is your primary fitness goal? (Build muscle / Lose weight / General fitness / Strength / Endurance)" },
    { key: "level", question: "What is your fitness level? (Beginner / Intermediate / Advanced)" },
    { key: "days_per_week", question: "How many days per week can you work out? (1–7)" },
    { key: "time_per_workout", question: "How much time can you spend per workout? (minutes)" },
    { key: "equipment", question: "What equipment do you have? (Full gym / Home gym / Minimal / None)" },
    { key: "limitations", question: "Any injuries or limitations? (or type 'none')" }
];

