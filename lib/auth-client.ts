import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

const signInWithGitHub = async () => {
  const data = await authClient.signIn.social({
    provider: "github",
  });
};

const signInWithGoogle = async () => {
  const data = await authClient.signIn.social({
    provider: "google",
  });
};
