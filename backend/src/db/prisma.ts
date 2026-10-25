import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { loadEnv } from "../config/env.js";

const adapter = new PrismaPg({ connectionString: loadEnv().DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
