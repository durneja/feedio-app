const Neon = require('@cityofzion/neon-js');
const axios = require('axios');
const { config } = require('dotenv');
const { aggregate } = require('../models/token.model');

const url = "http://seed1t4.neo.org:20332";
const privateKey = "fb7f465e3a992594537b7b2bc4fbe80fcbbb90dcfe33a4bfc8e1f351598d4c8e";

const n3config = {
    "networkMagic": 877933390,
    "rpcAddress": url,
    "feedioScriptHash": "e0bd649469db432189f15cf9edbe5b1b8bd20a5f",
    "account": new Neon.wallet.Account(privateKey),
    "rpcClient": new Neon.rpc.RPCClient(url)
}

const feedProviders = ["https://feed.feedio.xyz/v1/feed", "https://feed.feedio.xyz/v1/feedChainlink"];
const providerWeightage = [0.8, 0.2];
const supportedAssets = ["BTC", "ETH", "NEO", "GAS", "BNB", "MATIC"];
const assetDecimalPlaces = [4, 4, 6, 6, 6, 6];

const process = async () => {
    const providerResponses = await fetchProviderResponses();
    const aggregatedCurrentResponse = aggregateResponse(providerResponses);
    const toUpdate = await  fetchOnChainPrices(aggregatedCurrentResponse);
    console.log(toUpdate);
    if (toUpdate) {
        updatePricesOnChain(aggregatedCurrentResponse);
    } 
}

const fetchProviderResponses = async () => {

    console.log("in fetchProviderResponses");
    var providerResponses = [];
    for (let index = 0; index < feedProviders.length; index++) {
        const provider = feedProviders[index];
        let response = null;
        try {
            response = await axios.get(provider);
        } catch(ex) {
            response = null;
            console.log(ex);
        }
    
        if (response) {
            const responseData = response.data.data;
            providerResponses.push(responseData);
        } else {
            providerResponses.push({});
        }
    }

    console.log(providerResponses);
    return providerResponses;
}

const aggregateResponse = (providerResponses) => {

    let aggregatedResponse = [];
    for (let i = 0; i < supportedAssets.length; i++) {
        const asset = supportedAssets[i];
        let assetValueWeightedSum = 0;
        let assetWeightSum = 0;
        for (let j = 0; j < providerResponses.length; j++) {
            const providerResponse = providerResponses[j];
            if (asset in providerResponse && providerResponse[asset] > 0) {
                assetValueWeightedSum += providerResponse[asset] * providerWeightage[j];
                assetWeightSum += providerWeightage[j];
            }
        }

        const decimalPlaces = assetDecimalPlaces[i];
        const tokenActualValue = assetValueWeightedSum / assetWeightSum;
        aggregatedResponse[i] = {"name": asset, "value": Math.round(tokenActualValue.toFixed(decimalPlaces) * (Math.pow(10, decimalPlaces)))};
    }

    console.log(aggregatedResponse);
    return aggregatedResponse;
}

const fetchOnChainPrices = async (currentResponse) => {

    for (let index = 0; index < currentResponse.length; index++) {
        const element = currentResponse[index];
        const tokenName = element.name;
        const tokenPrice = element.value;
        
        const resp = await fetchContractPrice(tokenName, n3config);
        
        const diff = tokenPrice - resp[1];
        const ave = (tokenPrice + resp[1])/2;
        var percDiff =  100 * Math.abs(diff / ave); //relative percentage

        console.log(percDiff);
        if (percDiff > 0.1) {
            return true; // If any of the token prices have a different of 0.1 % then update prices
        }
    }

    return false;

}

const updatePricesOnChain = (aggregatedResponse) => {
        
    let tokenArray = Neon.sc.ContractParam.array();
    let tokenPriceArray = Neon.sc.ContractParam.array();
    for (let index = 0; index < aggregatedResponse.length; index++) {
        const element = aggregatedResponse[index];
        const tokenName = element.name;
        const tokenPrice = element.value;
        
        tokenArray.value.push(Neon.sc.ContractParam.string(tokenName));
        tokenPriceArray.value.push(Neon.sc.ContractParam.integer(tokenPrice));
    }
    
    const arguments = [tokenArray, tokenPriceArray];
    invokeSCFunction(n3config.account, n3config.feedioScriptHash, "updateTokenPrice", arguments, n3config)

    return;
}

const fetchContractPrice = async (tokenName, config) => {

    const result = await config.rpcClient.invokeFunction(
          config.feedioScriptHash,
          "getLatestTokenPrice", [Neon.sc.ContractParam.string(tokenName)],
          [
            new Neon.tx.Signer({
              account: config.account.scriptHash,
              scopes: Neon.tx.WitnessScope.CalledByEntry,
            }),
        ]
    );

    return JSON.parse(Neon.u.base642utf8(result.stack[0].value));
}

const invokeSCFunction = async (account, contract, operation, arguments, config) => {
    
    const ContractCallParams = {
        scriptHash: contract,
        operation: operation,
        args: arguments,
    }
    const script = Neon.sc.createScript(ContractCallParams);      
    const signers =  [ { account: account.scriptHash, scopes: Neon.tx.WitnessScope.Global } ];

    var transaction = new Neon.tx.Transaction({ signers, script });
    await Neon.experimental.txHelpers.setBlockExpiry(transaction, config);
    await Neon.experimental.txHelpers.addFees(transaction, config);

    const signedTransaction = transaction.sign(account, config.networkMagic);
    console.log(transaction.toJson());

    const result = await config.rpcClient.sendRawTransaction(Neon.u.HexString.fromHex(signedTransaction.serialize(true)));
    console.log(result);      
}

module.exports = {
    invokeSCFunction,
    process
};