import {
  clearOauthCookie,
  errorJson,
  exchangeOAuthCode,
  getConfig,
  getGitHubUser,
  HttpError,
  readOauthCookie,
  safeReturnTo,
  sessionCookie,
} from "../../../../functions-shared/comments.js";

export async function onRequestGet({ request, env }) {
  const clearOauth = clearOauthCookie(request);

  try {
    const config = getConfig(env);
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const oauth = await readOauthCookie(request, config);

    if (!code || !state || !oauth?.state || oauth.state !== state) {
      throw new HttpError(400, "Invalid GitHub OAuth callback");
    }

    const token = await exchangeOAuthCode(config, request, code, oauth.codeVerifier);
    const user = await getGitHubUser(config, token);
    const returnTo = safeReturnTo(oauth.returnTo);

    const headers = new Headers({
      location: returnTo,
      "set-cookie": clearOauth,
    });
    headers.append("set-cookie", await sessionCookie(request, config, { token, user }));

    return new Response(null, { status: 302, headers });
  } catch (error) {
    const response = errorJson(error);
    response.headers.append("set-cookie", clearOauth);
    return response;
  }
}
