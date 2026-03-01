import * as microsoftTeams from "@microsoft/teams-js";

export async function initTeams(): Promise<void> {
  try {
    // This will throw if not running in Teams; we gracefully ignore.
    await microsoftTeams.app.initialize();
  } catch {
    // noop
  }
}

export async function getTeamsContext(): Promise<any | null> {
  try {
    await microsoftTeams.app.initialize();
    return await microsoftTeams.app.getContext();
  } catch {
    return null;
  }
}
