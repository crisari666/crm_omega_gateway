<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Central webhook ingress for Meta (WhatsApp + Lead Ads). Forwards to downstream microservices via RabbitMQ.

### HTTP webhooks

| Route | Purpose |
|-------|---------|
| `GET/POST /webhooks/ceiba` | Meta **Page** Lead Ads (`leadgen`). Fetches lead via Graph, routes by form name: `clientes*` → customers-ms, `referidos*` → office_back. |
| `GET/POST /webhooks/customers` | Meta **WhatsApp** (CRM WABA) → `customers.meta.webhook.ingress.v1` |
| `POST /webhooks/meta` | Same WhatsApp ingress as customers |

### Environment (Lead Ads / Ceiba)

| Variable | Purpose |
|----------|---------|
| `FB_BUSINESS_CEIBA_TOKEN` | Graph token when `IS_DEV=true` (default) |
| `FB_BUSINESS_CEIBA_TOKEN_PROD` | Graph token when `IS_DEV` is not true |
| `IS_DEV` | `true` / `1` / `yes` selects dev token (default `true`) |
| `META_VERIFY_TOKEN` | Meta webhook verify token |
| `RABBIT_MQ_*` | RabbitMQ connection |

### Meta subscription cutover

1. Point Ceiba Facebook Page webhook to `https://<gateway-host>/webhooks/ceiba` (GET verify + POST).
2. Keep GTOWER page on `omega_office_back` `POST /rest/webhook/page/gtower` until a second gateway route is added.
3. Ensure `omega_office_back` runs with `USE_RABBITMQ=true` for `office.facebook.leadgen.ingest.v1`.

### RabbitMQ patterns

| Pattern | Queue | Consumer |
|---------|-------|----------|
| `customers.meta.webhook.ingress.v1` | `crm.customers.whatsapp_integration` | crm-omega-customers-ms |
| `customers.meta.leadgen.ingest.v1` | same | crm-omega-customers-ms (campaign leads) |
| `office.facebook.leadgen.ingest.v1` | `crm_back_queue` | omega_office_back |

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev

# production mode
$ yarn run start:prod
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
