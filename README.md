# yahoo-finance-graphql

This project is meant as:

- a datasource for its accompanying SvelteKit project, [sveltekit-marketquotes](https://github.com/jaxxeh/sveltekit-marketquotes), in the form of a GraphQL API wrapping undocumented Yahoo Finance API calls in order to obtain market status, search suggestions, company information, and live and historical asset price data
- an example of a structured [apollo-server-express](https://www.npmjs.com/package/apollo-server-express)-based GraphQL API
- an example of providing GraphQL subscriptions over web sockets using [graphql-subscriptions](https://github.com/apollostack/graphql-subscriptions) and [subscriptions-transport-ws](https://github.com/apollographql/subscriptions-transport-ws)
- an example of using [Puppeteer](https://pptr.dev/) to pilot headless browser automation in order to collect authentication data and circumvent access restrictions
- an example of using [tough-cookie](https://github.com/salesforce/tough-cookie)'s cookie jar with [got](https://github.com/sindresorhus/got) to persist authentication session cookieš when making external API requests

> DISCLAIMER: this project is meant for testing and educational purposes ONLY. Please use responsibly.

## Getting started

Clone this project locally, cd into the cloned project, then run:

```bash
npm install

npm run apollo
```

By default, the API should then be available at [http://localhost:4000](http://localhost:4000).

Please refer to the accompanying [sveltekit-marketquotes](https://github.com/jaxxeh/sveltekit-marketquotes) project as a mean to showcase and use this API.
