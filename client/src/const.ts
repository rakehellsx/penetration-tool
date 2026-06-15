// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // In self-hosted / permanent deployments OAuth may be disabled. The previous
  // implementation attempted to construct `new URL("undefined/app-auth")`,
  // which crashes the entire React app before any page can render.
  if (!oauthPortalUrl || !appId) {
    return "/";
  }

  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);
    const base = oauthPortalUrl.endsWith("/") ? oauthPortalUrl : `${oauthPortalUrl}/`;
    const url = new URL("app-auth", base);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    return url.toString();
  } catch (error) {
    console.warn("Invalid OAuth portal configuration; falling back to home page.", error);
    return "/";
  }
};
