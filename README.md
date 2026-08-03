<p align="center">
    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Kickbase_Logo_2023.svg"
    width="100">
</p>

<h1 align="center">
Kickbase API v4 Documentation
</h1>

<div align="center">

<a href="https://share.apidog.com/bca1f84a-99d7-4f8f-96a5-5e084ee24fe3">

![Static Badge](https://img.shields.io/badge/Browse%20Docs%20with%20apidog%20ui-585858?style=for-the-badge&logo=apidog)

</a>

</div>

<div align="center">

<a href="http://kevinskyba.github.io/kickbase-api-doc/index.html">

![Static Badge](https://img.shields.io/badge/Browse%20Docs%20with%20swagger%20ui-585858?style=for-the-badge&logo=swagger)

</a>

![Static Badge](https://img.shields.io/badge/version-4.5.0-%23ff4600?style=for-the-badge)
![Static Badge](https://img.shields.io/badge/license-MIT-%23ff4600?style=for-the-badge)
![Static Badge](https://img.shields.io/badge/contributers-3-%23ff4600?style=for-the-badge)

</div>

This repository contains the **API v4** documentation of the popular game **[kickbase](https://www.kickbase.com/)**.
This work is unofficial and not related to kickbase in any way. All of this was done for scientific reasons only and you
should not use it for anything else but for your personal learning!

## Usage

### Web

> **NEW!** Directly use the browseable and
> interactive [Apidog Web Version](https://share.apidog.com/fe2420a6-d929-409f-9b1d-35122923316d)

Use the browseable [Web Version](http://kevinskyba.github.io/kickbase-api-doc/index.html) made
with [Apidog](https://apidog.com/blog/export-postman-documentation-to-html-or-markdown/)
and [Swagger Hub](https://app.swaggerhub.com/)

**How to get started:**

1. Choose endpoint `/v4/user/login` from the `User` section
2. On the right hand side click the `"Try it out"` button

3. Fill in your kickbase email and password into the request body json

   ```json
   {
     "em": "your-kickbase-email",
     "loy": false,
     "pass": "your-kickbase-password",
     "rep": {}
   }
   ```

4. Click the `"Execute"` button and copy the property `"tkn"` from the response body json

   ```json
   {
       ...
       "tkn": "my-secret-access-token",
       ...
   }
   ```

5. Click `"Authorize"` at the top right corner of the page, paste in the `access token` into the value field and click
   again `"Authorize"`

6. Now you can try out any endpoint with your path and query params

### MCP Server (Claude / AI Assistants)

The `mcp-server/` directory contains a ready-to-run MCP server that exposes 38 Kickbase tools to any MCP-compatible AI client (Claude Code, Claude Desktop, etc.).

#### Setup

```bash
cd mcp-server
npm install
npm run build
```

#### Claude Code (CLI)

Register the server with the `claude mcp add` command instead of hand-editing config files:

```bash
claude mcp add kickbase \
  -e KICKBASE_EMAIL=your@email.com \
  -e KICKBASE_PASSWORD=yourpassword \
  -- node /absolute/path/to/kickbase-api-doc/mcp-server/dist/index.js
```

- Use an absolute path to `dist/index.js` (the build output from the setup step above).
- Add `-s user` to make the server available in every project instead of just the current one, or `-s project` to share it via `.mcp.json` checked into this repo.
- Verify it's connected with `claude mcp list`, and inspect its tools from inside a session with `/mcp`.
- Remove it again with `claude mcp remove kickbase`.

#### Claude Desktop

Claude Desktop reads its server list from a config file instead of a CLI. Open it via
**Settings → Developer → Edit Config** (or edit `claude_desktop_config.json` directly) and add:

```json
{
  "mcpServers": {
    "kickbase": {
      "command": "node",
      "args": ["/absolute/path/to/kickbase-api-doc/mcp-server/dist/index.js"],
      "env": {
        "KICKBASE_EMAIL": "your@email.com",
        "KICKBASE_PASSWORD": "yourpassword"
      }
    }
  }
}
```

Restart Claude Desktop afterwards for the server to be picked up.

#### Authentication

The server authenticates automatically on first use and caches the token in memory. You can also skip the login flow by providing a pre-obtained token directly instead of email/password:

```bash
claude mcp add kickbase -e KICKBASE_TOKEN=eyJhbGci... -- node /absolute/path/to/kickbase-api-doc/mcp-server/dist/index.js
```

#### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `KICKBASE_EMAIL` / `KICKBASE_PASSWORD` | — | Credentials for automatic login |
| `KICKBASE_TOKEN` | — | Pre-obtained bearer token; skips the login flow |
| `KICKBASE_CACHE_TTL` | `300` | Cache lifetime in seconds for slow-moving reference data. `0` disables caching |
| `KICKBASE_KEEP_IMAGES` | unset | Set to `1` to keep image-path fields in responses (see below) |

#### Token & request efficiency

Kickbase responses are verbose, and an AI client pays for every byte. The server
applies three optimisations, measured across a representative set of endpoints:

| Optimisation | Effect |
|---|---|
| Compact JSON output | −38% payload (indentation buys the consuming model nothing) |
| Image-path stripping | −26% more; fields like `pim`, `uim`, `t1im`, `plpim` are unusable to an AI client and make up ~50% of `/matchdays` |
| **Combined** | **−64% tokens** (≈50k → ≈18k tokens over the sampled endpoints) |

Set `KICKBASE_KEEP_IMAGES=1` if you actually need the image paths — e.g. when
building a UI on top of the server. Values are dropped by shape rather than by a
fixed key list, so image fields added by future API versions are covered too.

Request count is reduced by two mechanisms:

- **Response cache** — only slow-moving reference data is cached
  (`/competitions`, `/matchdays`, `/table`, competition players, `/base/stage`).
  Budgets, market, lineup and other volatile endpoints are **never** cached, and
  any `POST`/`DELETE` flushes the cache, so a write is always followed by fresh
  reads.
- **Request coalescing** — identical GETs issued before the first one resolves
  share a single HTTP request instead of racing.

Additionally, `kickbase_get_matchdays` accepts a `day` parameter
(`'5'` or `'current'`). It is the largest response of any tool — filtering to a
single matchday cuts it from ~37 KB to ~1.4 KB (**−96%**).

#### Available tools

| Tool | Description |
|---|---|
| `kickbase_get_profile` | Your account profile |
| `kickbase_list_leagues` | All your leagues |
| `kickbase_get_league_overview` | League details |
| `kickbase_get_league_ranking` | Manager standings |
| `kickbase_get_my_squad` | Your owned players |
| `kickbase_get_my_budget` | Remaining budget |
| `kickbase_get_my_league_info` | Your stats in a league |
| `kickbase_get_activities_feed` | Transfer & event feed |
| `kickbase_get_lineup` | Current lineup |
| `kickbase_get_lineup_overview` | Lineup with live points |
| `kickbase_get_lineup_selection` | Available players for lineup |
| `kickbase_fill_lineup` | Set formation & lineup |
| `kickbase_get_market` | Transfer market (incl. inline `ofs[]` offers, see notes) |
| `kickbase_sell_player` | List a player for sale |
| `kickbase_remove_from_market` | Delist a player |
| `kickbase_list_player_offers` | Open offers + market status for a single player (see notes) |
| `kickbase_place_offer` | Bid on a player |
| `kickbase_withdraw_offer` | Cancel your own outgoing bid |
| `kickbase_accept_offer` | Accept an incoming offer |
| `kickbase_decline_offer` | Decline an incoming offer |
| `kickbase_get_league_player` | Player details (league ctx) |
| `kickbase_get_player_market_value` | Market value history |
| `kickbase_get_player_performance` | Player match points |
| `kickbase_get_player_transfer_history` | Player transfer log |
| `kickbase_get_scouted_players` | Your watchlist of scouted players |
| `kickbase_add_scouted_player` | Add a player to your watchlist |
| `kickbase_remove_scouted_player` | Remove one player from your watchlist |
| `kickbase_clear_scouted_players` | Clear your entire watchlist |
| `kickbase_get_manager_squad` | Another manager's squad |
| `kickbase_get_manager_performance` | Manager point history |
| `kickbase_list_competitions` | Available competitions |
| `kickbase_search_players` | Search players by name |
| `kickbase_get_competition_players` | Top-25 competition players by points, optionally filtered by position |
| `kickbase_get_competition_player` | Single player details |
| `kickbase_get_competition_table` | Football league table |
| `kickbase_get_matchdays` | Matchday schedule (supports `day` filter, see notes) |
| `kickbase_get_base_overview` | Live match overview |
| `kickbase_get_stage` | Current matchday/stage info |

#### Architecture

Built with the MCP TypeScript SDK's modern `McpServer` / `registerTool` API (not
the older `Server` + manual request-handler pattern). Each tool's input is
validated at runtime with a Zod schema and annotated with `readOnlyHint` /
`destructiveHint` / `idempotentHint` / `openWorldHint` so MCP clients can reason
about side effects before calling it.

```
src/
├── index.ts       # McpServer setup; wires up the tool modules below
├── schemas.ts      # Shared Zod field schemas (leagueId, playerId, pagination, ...)
├── format.ts       # registerApiTool() — shared error handling + response truncation
├── auth.ts         # Login/token refresh
├── client.ts       # HTTP client: caching, request coalescing, image stripping
└── tools/          # One file per domain (leagues, market, players, ...),
                     # each exporting a register*Tools(server) function
```

Tool outputs stay untyped JSON passed through from Kickbase rather than
hand-maintained Zod `outputSchema`s — the API's fields are undocumented and
single-letter-keyed, and can change without notice, so encoding a strict output
shape would be brittle for little benefit. Responses over `CHARACTER_LIMIT`
(25k characters, see `format.ts`) are truncated with a note pointing the caller
at pagination or filter parameters.

#### Notes & API quirks

**Offers are only partially visible.** Kickbase removed the ability to see other
managers' bids on players you don't own. `kickbase_list_player_offers` therefore
returns a populated `ofs[]` array only for:

- your own bids on someone else's listing, and
- bids other managers placed on *your* listed player.

An empty `ofs[]` is the normal case, not an error.

**There is no GET endpoint for market offers.**
`/v4/leagues/{id}/market/{playerId}/offers` exists as `POST` only (placing a
bid); a `GET` returns `405 Method Not Allowed`. `kickbase_list_player_offers`
therefore reads from `GET /v4/leagues/{id}/players/{playerId}/transfers`, which
returns `ofs[]` plus market context (`iotm`, `iposl`, `mv`, `prc`). Do not
confuse this with `/transferHistory` (mapped as
`kickbase_get_player_transfer_history`), which returns *completed* transactions
rather than open bids.

**`offerId` is the bidder's user ID.** In observed responses, the `uoid` of an
offer is identical to the bidding user's ID (`u`). Pass that value as `offerId`
to `kickbase_accept_offer` / `kickbase_decline_offer` — and, for your own
outgoing bid, to `kickbase_withdraw_offer` (that's just your own user ID, see
`kickbase_get_profile`).

**Withdrawing your own bid is a different endpoint from declining one.**
`kickbase_decline_offer` is for the *seller* rejecting someone else's bid on
their listing; there's a separate `DELETE .../market/{playerId}/offers/{offerId}`
endpoint for the *bidder* to cancel their own outgoing offer, exposed as
`kickbase_withdraw_offer`.

**`kickbase_get_market` already includes offers inline.** Each market entry
carries `ofc` (offer count) and, when bids exist, the full `ofs[]` array —
including `unm` (bidder name), which the single-player endpoint omits. Prefer
`kickbase_get_market` when scanning the whole market; use
`kickbase_list_player_offers` for a targeted single-player check or for a player
who is not currently listed.

**`kickbase_get_competition_players` is a top-25 leaderboard, not a paginated
roster.** Confirmed live: the underlying endpoint hard-caps results at 25 and
always sorts by points descending — `start`/`max` (which an earlier version of
this tool exposed) are silently ignored no matter what you pass. `position` is
the only filter that actually does anything: it still caps at 25 for outfield
positions, but returns every player at that position if there are 25 or fewer
(e.g. all ~15 goalkeepers in a league). For a specific player who might not be
a top performer, use `kickbase_search_players` instead.

---

### Local

#### Postman

Import the [Postman Collection JSON](kickbase-v4.postman_collection.json)
and [Postman Eniroment JSON](kickbase-v4.postman_environment.json) into your postman workspace

#### Swagger

Import the [Swagger JSON](kickbase-v4.swagger.json) into your swagger hub

## Contributors

<table>
  <tbody>
    <tr>
        <td align="center" style="border: 1px solid white"><a href="https://github.com/kevinskyba"><img src="https://avatars.githubusercontent.com/u/1737255?v=4" width="100px;" style="border-radius: 10px; object-fit: contain;border: 2px solid #ff4600" alt="kevinskyba"/><br /><sub><b>kevinskyba</b></sub></a></td>
        <td align="center" style="border: 1px solid white"><a href="https://github.com/simonsagstetter"><img src="https://avatars.githubusercontent.com/u/44363600?v=4" width="100px;" style="border-radius: 10px; object-fit: contain;border: 2px solid #ff4600" alt="simonsagstetter"/><br /><sub><b>simonsagstetter</b></sub></a></td>
        <td align="center" style="border: 1px solid white"><a href="https://github.com/casudo"><img src="https://avatars.githubusercontent.com/u/55252063?v=4" width="100px;" style="border-radius: 10px; object-fit: contain;border: 2px solid #ff4600" alt="casudo"/><br /><sub><b>casudo</b></sub></a></td>
    </tr>
  </tbody>
</table>

## Issues

### API Documentation Status

This documentation contains all currently known endpoints, including their path parameters, query parameters, and
request bodies, as of March 6, 2026.

For GET requests, we provide response examples for most endpoints. However, for the majority of POST, PUT, and DELETE
requests, response examples are currently missing. Collecting and validating these responses requires significant setup
and time, and this project is maintained as a hobby project.

Descriptions have been added to most relevant endpoints. These descriptions were generated using Postman Generative AI.
While they appear largely accurate at first glance, they may still contain inaccuracies or hallucinations, so please
verify them before relying on them in production environments.

Please use the API responsibly. Avoid sending large numbers of requests or requesting excessive amounts of data at once.
It is possible that the service provider may monitor requests made outside their official applications and block access.
We do not take responsibility for any actions taken using this documentation.

If you encounter incorrect documentation or non-working endpoints, please open an issue.

### Contributing

We are always looking for contributors.

At the moment, the most valuable contributions would be:

- Collecting 2xx and 4xx responses
- Documenting response schemas
- Completing request body schemas

Having complete request and response schemas would allow us to generate an OpenAPI specification. This would enable
automatic generation of REST clients, for example:

- JavaScript clients using tools like Orval
- Python clients using frameworks such as FastAPI

These improvements would significantly increase the usability of this project.

Thank you!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
