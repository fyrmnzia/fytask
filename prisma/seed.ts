import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Create a demo user
  const hashedPassword = await bcrypt.hash("demo123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@fyrmnzia.com" },
    update: {},
    create: {
      email: "demo@fyrmnzia.com",
      username: "demouser",
      password: hashedPassword,
      name: "Demo User",
      emailVerified: true,
    },
  });

  console.log("Demo user created:", user);

  //   create sample categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Work",
        color: "#3B82F6",
        icon: "💼",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Personal",
        color: "#10B981",
        icon: "🏠",
        userId: user.id,
      },
    }),
    prisma.category.create({
      data: {
        name: "Health",
        color: "#EF4444",
        icon: "❤️",
        userId: user.id,
      },
    }),
  ]);

  console.log("Sample categories created:", categories.length);

  // Create sample tags
  const tags = await Promise.all([
    prisma.tag.create({
      data: {
        name: "urgent",
        color: "#EF4444",
        userId: user.id,
      },
    }),
    prisma.tag.create({
      data: {
        name: "meeting",
        color: "#8B5CF6",
        userId: user.id,
      },
    }),
  ]);

  console.log("✅ Tags created:", tags.length);
  // Create sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: "Complete project proposal",
        description: "Finish the Q1 project proposal and send to stakeholders",
        priority: "HIGH",
        status: "IN_PROGRESS",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        userId: user.id,
        categoryId: categories[0].id, // Work
        subtasks: {
          create: [
            { title: "Research market trends", isCompleted: true, position: 0 },
            { title: "Draft initial proposal", isCompleted: false, position: 1 },
            { title: "Get feedback from team", isCompleted: false, position: 2 },
          ],
        },
        tags: {
          create: [{ tagId: tags[0].id }], // urgent
        },
      },
    }),
    prisma.task.create({
      data: {
        title: "Buy groceries",
        description: "Milk, eggs, bread, vegetables",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        userId: user.id,
        categoryId: categories[1].id, // Personal
      },
    }),
    prisma.task.create({
      data: {
        title: "Schedule dentist appointment",
        priority: "LOW",
        status: "TODO",
        userId: user.id,
        categoryId: categories[2].id, // Health
      },
    }),
  ]);
  console.log("✅ Tasks created:", tasks.length);
  // Create sample notes
  const notes = await Promise.all([
    prisma.note.create({
      data: {
        title: "Meeting Notes - Q1 Planning",
        content:
          "# Q1 Planning Meeting\n\n## Attendees\n- John\n- Sarah\n- Mike\n\n## Key Points\n- Focus on customer retention\n- Launch new feature by March\n- Increase marketing budget by 20%",
        isPinned: true,
        userId: user.id,
        categoryId: categories[0].id,
      },
    }),
    prisma.note.create({
      data: {
        title: "Book Recommendations",
        content:
          "# Books to Read\n\n1. Atomic Habits\n2. Deep Work\n3. The Lean Startup\n4. Zero to One",
        userId: user.id,
        categoryId: categories[1].id,
      },
    }),
  ]);
  console.log("✅ Notes created:", notes.length);
  // Create sample reminder
  await prisma.reminder.create({
    data: {
      remindAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      message: "Don't forget to complete the proposal!",
      method: "notification",
      taskId: tasks[0].id,
      userId: user.id,
    },
  });
  console.log("✅ Reminder created");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
