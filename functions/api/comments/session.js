import { errorJson, json, readSession } from "../../../functions-shared/comments.js";

export async function onRequestGet({ request, env }) {
  try {
    const session = await readSession(request, env);

    if (!session?.user) {
      return json({ authenticated: false });
    }

    return json({
      authenticated: true,
      user: session.user,
    });
  } catch (error) {
    return errorJson(error);
  }
}
