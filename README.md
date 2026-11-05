# Hotel Terror 🎃

A CAP service for a hotel that lodges monsters, written in TypeScript and backed by
PostgreSQL. Guests have a species, rooms have compatibility rules, bookings carry charges
and incidents, and a small analytics layer tracks revenue against monthly targets.

The point of the project: run a normal SAP CAP stack (typed models, a service layer with
real business rules, tests) on PostgreSQL instead of HANA Cloud, and deploy it to Cloud
Foundry. Same developer experience, a database without the high monthly floor.

## Stack

- Node.js 20+ (built on 22), `@sap/cds` 10, TypeScript 5, run with `tsx`.
- SQLite locally and in tests; PostgreSQL (`@cap-js/postgres`) with XSUAA for auth on BTP.

## Quick start 👻

You only need Node and git for this. If you just want a look at the service, stop after the
tests.

```bash
git clone <your-clone-url> hotel-terror
cd hotel-terror
npm install
npm run watch        # cds watch on SQLite, with mock data and mocked auth
```

The service comes up at `http://localhost:4004/hotel`. Run the tests with:

```bash
npm test
```

## Prerequisites

To deploy to Cloud Foundry you need a few tools beyond the local setup:

1. Node.js 20 or newer and git (see Quick start).
2. The [Cloud Foundry CLI](https://github.com/cloudfoundry/cli/releases) v8.
3. The MultiApps plugin, which `cf deploy` relies on:
   ```bash
   cf install-plugin multiapps
   ```
4. The MTA build tool, installed globally:
   ```bash
   npm i -g mbt
   ```
5. A PostgreSQL client for browsing the database, such as [DBeaver](https://dbeaver.io/download/).

## Set up a BTP trial

1. Create a free account at [SAP BTP trial](https://www.sap.com/products/technology-platform/trial.html).
2. In the BTP cockpit, enter your trial subaccount, enable Cloud Foundry, and create a space.
3. Add the two entitlements this project uses, then save:
   - "PostgreSQL, hyperscaler option", plan `trial`.
   - "Authorization and Trust Management Service", plan `application`.
4. Log in with the CLI, using the API endpoint shown on your subaccount overview:
   ```bash
   cf login -a <your-api-endpoint>
   ```
   When prompted, pick `<your-org>` and `<your-space>`. Check the target with:
   ```bash
   cf target
   ```
   You should see your org and space listed.

## Deploy to Cloud Foundry

1. Build the MTA archive:
   ```bash
   npm run build
   ```
2. Push it:
   ```bash
   npm run deploy
   ```

This creates the `hotel-terror-srv` app, the two service instances (`hotel-terror-auth` and
`hotel-terror-db`), and a service key for database access. Check the results:

```bash
cf apps        # hotel-terror-srv should be started
cf services    # both service instances should be listed
```

The service requires authentication and there is no UI, so it will not open in a browser. The
real checks are the app status above, `npm run hybrid`, and the database itself (below).

## Database access 🦇

The trial PostgreSQL has no public endpoint, so the `db:*` scripts tunnel in through the
deployed app over SSH and expose the database at `localhost:63306`. Point any PostgreSQL client
at it with SSL mode `require`, and read the dbname, user and password from the service key:

```bash
cf service-key hotel-terror-db hotel-terror-db-key
```

### Connecting with DBeaver

With `npm run db:tunnel` running, point [DBeaver](https://dbeaver.io/download/) at a new
PostgreSQL connection: Host `localhost`, Port `63306`, and read Database, Username and Password
from the service key above. DBeaver 26.x has no separate SSL tab: on the Main tab open the
"SSH, SSL, ..." dropdown, tick Use SSL and set mode to `require`. Do not enable the SSH option
in that dropdown; the tunnel already carries the SSH hop. For a quick query without a GUI,
`npm run db:shell` opens the tunnel and drops into a small SQL prompt instead.

### What you should see

The domain tables (`hotel_*`), their `*_drafts` counterparts, the `hotel_analytics_*` views
(including a room ranking built with `rank() over`), and `cds_model`. A fresh deploy seeds only
the code lists, so the booking, room and guest tables start empty until you add data.

## Scripts

Everything goes through `npm run`. Day to day: work on SQLite with `watch` and `test`, then
`build` and `deploy` to Cloud Foundry, then poke at the real database with the `db:*` scripts.

| Command | What it does |
|---|---|
| `npm run watch` | Local dev server on SQLite with mock data and mocked auth. |
| `npm test` | Run the tests. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run build` | Package the MTA archive (`mbt build`). |
| `npm run deploy` | Push the archive to Cloud Foundry. |
| `npm run db:tunnel` | SSH tunnel to the deployed PostgreSQL for a GUI or psql client. Leave it running. |
| `npm run db:shell` | Tunnel plus a small SQL prompt, no psql install needed. |
| `npm run hybrid` | Run the local server against the real trial database over the tunnel. |
| `npm run db:reset` | Trial only. Drops the schema so the next deploy rebuilds it. Destructive. |

## Layout

| Folder | What's in it |
|---|---|
| `db/` | domain model (`schema.cds`), analytics views, code-list seed data |
| `srv/` | the `HotelService`, handlers under `srv/handlers/`, business logic under `srv/lib/` |
| `test/` | unit tests for the logic, plus an integration test for the service |
| `scripts/` | tooling for the deployed PostgreSQL (below) |

## Troubleshooting

- Start the app first. The tunnel runs through `hotel-terror-srv`, which a trial account stops
  on inactivity, so run `cf start hotel-terror-srv` before tunneling.
- The app needs SSH enabled. If it isn't, the `db:*` scripts print the
  `cf enable-ssh hotel-terror-srv && cf restart hotel-terror-srv` command to run once.
- On a corporate VPN the tunnel never binds. Many VPNs block the Cloud Foundry SSH port, so the
  tunnel banner prints but `localhost:63306` stays closed and clients fail with `ECONNREFUSED`.
  Disconnect from the VPN and tunnel again.

## Stopping and cleaning up

Stop the app when you are done, to keep a trial account quiet:

```bash
cf stop hotel-terror-srv
```

To remove everything this project created, including the database and all its data:

```bash
cf undeploy hotel-terror --delete-services --delete-service-keys
```

This deletes the two service instances and the service key as well as the app. The data in the
database is gone for good.

## License

MIT.
