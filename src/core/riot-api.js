const { RiotApi, LolApi, Constants } = require("twisted");

const apiKey = process.env.RIOT_API_KEY ? process.env.RIOT_API_KEY.trim() : "";

const riotApi = new RiotApi({ key: apiKey });
const lolApi = new LolApi({ key: apiKey });

async function getRankedData(gameName, tagLine) {
  try {
    const cleanName = gameName.trim();
    const cleanTag = tagLine.trim();

    console.log(`Checking: ${cleanName} #${cleanTag}`);

    const accountData = await riotApi.Account.getByRiotId(
      cleanName,
      cleanTag,
      Constants.RegionGroups.ASIA
    );

    const puuid = accountData.response.puuid;

    const leagueData = await lolApi.League.byPUUID(
      puuid,
      Constants.Regions.SINGAPORE
    );

    const leagueEntries = leagueData.response;

    const soloQueueData = leagueEntries.find(
      (entry) => entry.queueType === "RANKED_SOLO_5x5"
    );

    if (!soloQueueData) {
      console.log(` -> Success: Unranked`);
      return {
        success: true,
        puuid: puuid,
        lp: 0,
        tier: "UNRANKED",
        rank: "",
        wins: 0,
        losses: 0,
      };
    }

    console.log(` -> Success: ${soloQueueData.tier} ${soloQueueData.rank}`);
    return {
      success: true,
      puuid: puuid,
      lp: soloQueueData.leaguePoints,
      tier: soloQueueData.tier,
      rank: soloQueueData.rank,
      wins: soloQueueData.wins,
      losses: soloQueueData.losses,
    };
  } catch (error) {
    const status = error.statusCode || "Unknown";

    if (status === 404) {
      console.log(` -> Not Found (404)`);
      return { success: false, error: "Player not found" };
    }

    console.error(
      ` -> Error (${status}):`,
      error.body?.message || error.message
    );
    return { success: false, error: error.message };
  }
}

module.exports = { getRankedData };
