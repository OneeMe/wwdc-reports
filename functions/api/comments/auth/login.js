import {
  errorJson,
  getConfig,
  isConfigured,
  oauthCookie,
  pkceChallenge,
  randomToken,
  safeReturnTo,
} from "../../../../functions-shared/comments.js";

export async function onRequestGet({ request, env }) {
  try {
    const config = getConfig(env);

    if (!isConfigured(config)) {
      return new Response("GitHub comments are not configured", { status: 503 });
    }

    const url = new URL(request.url);
    const state = randomToken();
    const codeVerifier = randomToken(48);
    const codeChallenge = await pkceChallenge(codeVerifier);
    const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
    const redirectUri = new URL("/api/comments/auth/callback", url.origin).toString();
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");

    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", config.scope);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(null, {
      status: 302,
      headers: {
        location: authorizeUrl.toString(),
        "set-cookie": await oauthCookie(request, config, { state, codeVerifier, returnTo }),
      },
    });
  } catch (error) {
    return errorJson(error);
  }
}
