// "Continue with Google" (OAuth 2.0, the authorization code flow). The browser is sent to Google,
// the user chooses an account there, and Google sends the browser back with a one-time "code".
// The server swaps that code for the user's profile. The password stays with Google: we never see it.
// The client ID and secret are in .env (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET).
import config from "../config.js";

const GOOGLE_LOGIN_PAGE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_PROFILE_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export const googleIsSetUp = Boolean(config.google.clientId && config.google.clientSecret);

// The address of Google's "choose an account" page. state is a random text we get back
// unchanged, so we can tell the answer belongs to the login this browser started.
export function googleLoginUrl(state) {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: state,
    prompt: "select_account",
  });
  return GOOGLE_LOGIN_PAGE + "?" + params.toString();
}

// Swaps the one-time code for the user's Google profile: { email, email_verified, given_name,
// family_name, name }. Returns null when Google refuses the code.
export async function readGoogleProfile(code) {
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || typeof tokens.access_token !== "string") {
    // Google's reason goes to the server's terminal, for example "invalid_client" (a wrong
    // client ID or secret) or "redirect_uri_mismatch". It has no secret in it.
    console.error(`Google refused the sign-in code (${tokens.error || tokenResponse.status}: ${tokens.error_description || "no details"}).`);
    return null;
  }

  const profileResponse = await fetch(GOOGLE_PROFILE_URL, {
    headers: { Authorization: "Bearer " + tokens.access_token },
  });
  if (!profileResponse.ok) {
    console.error(`Google did not give the profile (status ${profileResponse.status}).`);
    return null;
  }
  return profileResponse.json();
}
