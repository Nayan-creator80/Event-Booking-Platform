import { PrismaClient } from "@prisma/client";
import { Role } from "../src/utils/enums";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// High-quality category stock images from Unsplash
const concertImages = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1487180142328-054b783fc471?auto=format&fit=crop&w=600&q=80"
];

const hackathonImages = [
  "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80"
];

const locations = [
  "Bengaluru, Karnataka",
  "Mumbai, Maharashtra",
  "Delhi NCR",
  "Hyderabad, Telangana",
  "Pune, Maharashtra",
  "Chennai, Tamil Nadu",
  "Kolkata, West Bengal",
  "Goa",
  "Jaipur, Rajasthan",
  "Online (Virtual)"
];

const concertTitles = [
  "Neon Pulse Music Festival",
  "Electric Symphony Night",
  "Acoustic Evening Live",
  "Rock & Roll Revival Arena",
  "Retro Synth Wave Bash",
  "Bassdrop Dubstep Carnival",
  "Jazz & Blues Under Stars",
  "Indie Rock Showcase Tour",
  "Pop Odyssey Live Arena",
  "Metal Mania Metal Fest"
];

const hackathonTitles = [
  "Global GenAI Build Hackathon",
  "Code For Climate Solution Jam",
  "Decentralized Web Hackathon",
  "Smart Cities Innovation Challenge",
  "BioTech Code Jam Sprint",
  "NextGen Mobile Dev Hackathon",
  "FinTech Futures Build Jam",
  "Open Source Global Sprint",
  "Cyber Defense Shield Hack",
  "Agentic AI Build-Off Marathon"
];

async function main() {
  console.log("Seeding database with 100+ events...");

  // Clear existing records
  await prisma.booking.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Create Admin
  const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPasswordHash,
      name: "System Admin",
      role: Role.ADMIN,
    },
  });

  // Create Regular User
  const userPasswordHash = await bcrypt.hash("user@example.com", 10); // Wait, password was UserPassword123! in seed, let's keep that!
  const janeDoePasswordHash = await bcrypt.hash("UserPassword123!", 10);
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      password: janeDoePasswordHash,
      name: "Jane Doe",
      role: Role.USER,
    },
  });

  const eventsData = [];

  // Generate 50 Concert Events
  for (let i = 0; i < 52; i++) {
    const titleBase = concertTitles[i % concertTitles.length];
    const title = `${titleBase} #${Math.floor(i / concertTitles.length) + 1}`;
    const location = locations[i % locations.length];
    const imageUrl = concertImages[i % concertImages.length];

    const date = new Date();
    date.setDate(date.getDate() + (i % 30) + 1); // 1 to 30 days out
    date.setHours(19, 0, 0, 0); // Evening show

    const price = Math.floor(Math.random() * 2500) + 499; // ₹499 to ₹2999
    const capacity = Math.floor(Math.random() * 400) + 100; // 100 to 500 capacity
    const ticketsSold = Math.floor(Math.random() * (capacity * 0.8)); // Up to 80% sold

    eventsData.push({
      title,
      description: `Experience the raw energy of live music at the ${title}! Featuring a stellar line-up of artists, high-fidelity sound engineering, and delicious local food vendors. Secure your seats before tickets sell out!`,
      date,
      location,
      price,
      capacity,
      ticketsSold,
      imageUrl,
      creatorId: admin.id,
    });
  }

  // Generate 50 Hackathon Events
  for (let i = 0; i < 52; i++) {
    const titleBase = hackathonTitles[i % hackathonTitles.length];
    const title = `${titleBase} #${Math.floor(i / hackathonTitles.length) + 1}`;
    const location = locations[i % locations.length];
    const imageUrl = hackathonImages[i % hackathonImages.length];

    const date = new Date();
    date.setDate(date.getDate() + (i % 45) + 5); // 5 to 50 days out
    date.setHours(9, 0, 0, 0); // Morning start

    const isFree = Math.random() > 0.3; // 70% of hackathons are free
    const price = isFree ? 0.0 : Math.floor(Math.random() * 400) + 99; // Free or ₹99 to ₹499
    const capacity = Math.floor(Math.random() * 150) + 50; // 50 to 200 capacity
    const ticketsSold = Math.floor(Math.random() * (capacity * 0.9)); // Up to 90% sold

    eventsData.push({
      title,
      description: `Collaborate, brainstorm, and build functional prototypes at the ${title}. Rub shoulders with industry-leading mentors, win amazing cash prizes, and code for 48 hours straight. Open to students and professionals alike!`,
      date,
      location,
      price,
      capacity,
      ticketsSold,
      imageUrl,
      creatorId: admin.id,
    });
  }

  // Batch insert all events
  await prisma.event.createMany({
    data: eventsData,
  });

  const count = await prisma.event.count();
  console.log(`Successfully seeded ${count} events!`);
  console.log("Admin Credentials: admin@example.com / AdminPassword123!");
  console.log("User Credentials: user@example.com / UserPassword123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
