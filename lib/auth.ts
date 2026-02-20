import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { sendEmail } from "./email-service";
import { getMongoDb } from "@/lib/mongodb";

const db = await getMongoDb();

export const auth = betterAuth({
  trustedOrigins: ["http://localhost:3000", "https://teach-my-ai.vercel.app"],
  database: mongodbAdapter(db),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        html: `Click the link to verify your email: ${url}`,
      });
    },
  },
});
