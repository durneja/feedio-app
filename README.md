# feedio-app

Feedio app is a node-js powered server that will periodically trigger the price fetch and update mechanism. At each tick the following steps will happen - **core.service**

1) Fetching the price from the providers - Exchange Aggregation (Binance, Coinmarketcap and Coingecko) and Chainlink Price Feeds. 
2) Combine the prices to provide a single price point for a token (Currently the weightage of the providers are set in the ratio of 80:20 respectively)
3) On-chain prices are retrieved from the Feedio Primary contract
4) Prices are compared with the current prices retrieved and the on-chain prices. If the relative difference is above a certain threshold then the prices will be updated on chain for the tokens
5) Decimal places and rounding off is also done. The thumb rule is approximately 8-9 significant digits with a cap of 6 decimal places. The decimal information is also provided by the smart contract as calculated.

## License

[MIT](LICENSE)
