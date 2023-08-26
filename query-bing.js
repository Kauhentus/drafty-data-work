// const https = require('https')
// const { default: axios } = require('axios');
// const fs = require('fs');

import https from 'https'
import axios from 'axios'
import fs from 'fs'

// const {
//     key2: key,
//     endpoint: endpoint
// } = require('./bingapikeys.json');
import bingkeys from './bingapikeys.json' assert {type: "json"}
const {
    key2: key,
    endpoint: endpoint
} = bingkeys;
const url = `${endpoint}v7.0/search`;

const pageMemoFolder = './query-bing-memo/pages';
const fetchPage = async (link) => {
    if(!fs.existsSync(pageMemoFolder)) fs.mkdirSync(pageMemoFolder);
    const pastPages = fs.readdirSync(pageMemoFolder);
    const linkToPathName = link.replace(/:/g, '#').replace(/\//g, '$').replace(/\?/g, '!');
    const pastPagesIndex = pastPages.indexOf(linkToPathName);
    if(pastPagesIndex !== -1){
        // console.log('Reading from cache...');
        const cachedPath = `${pageMemoFolder}/${linkToPathName}`;
        return fs.readFileSync(cachedPath).toString();
    }

    console.log(`Fetching link "${link}" via HTTPS...`);
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });
    try {
        const res = await axios.get(link, { httpsAgent })
        fs.writeFileSync(`${pageMemoFolder}/${linkToPathName}`, res.data);
        return res.data;
    } catch(err) {
        console.log(`  Error: ${err.message}`);
        return "";
    }
}

const name = 'Matthew Lentz'
const institution = 'duke university'

// const name = 'jeff huang'
// const institution = 'brown university'

const querySize = 5;
const displaySize = 3;

export const sendQuery = async (query, refreshCache = false, n = 3, rerank = true) => {
    const data = await memoQueryFetch(query, refreshCache);
    const webpages = data.webPages.value;
    const top3Results = webpages.map(page => page.url).slice(0, n);

    const res = await Promise.all(top3Results.map(link => fetchPage(link)))
    const filteredRes = res.filter(data => data.length > 0);

    const nameTokens = name.split(' ');
    const lastName = nameTokens[nameTokens.length - 1];
    const countOccurances = (str, regex) => (str.match(regex) || []).length;
    const counters = filteredRes.map((data, i) => {
        const str = data.replace(/\./g, ' ');
        const myCount = countOccurances(str, / my /g);
        const meCount = countOccurances(str, / me /g);
        const iCount = countOccurances(str, / i /g);
        const otherCount = countOccurances(str, / i'm /g) + 
            countOccurances(str, />i /g) + 
            countOccurances(str, />my /g) + 
            countOccurances(str, />me /g);
        const povSum = myCount + meCount + iCount + otherCount;

        const fullNameCount = countOccurances(data, new RegExp(name, 'g')) ;
        const lastNameCount = countOccurances(data, new RegExp(lastName, 'g'));

        return [fullNameCount + lastNameCount + 2 * povSum, povSum, i];
    }).sort((a, b) => b[0] - a[0]);

    const reorderedTop3 = rerank ? counters.map(pair => top3Results[pair[2]]) : top3Results;

    const confidences = reorderedTop3.map((result, i) => {
        const j = top3Results.indexOf(result);
        const absDist = Math.abs(i - j); 
        // out of 5, 4 = max
        // can't always be 100% so - 0.05
        // penalty for 2nd place -10%, 3rd place -20%, etc.
        return 0.5 + 0.5 * (1 - absDist / (querySize - 1)) - 0.05 - i * 0.1; 
    });

    return {
        results: reorderedTop3,
        confidences: confidences
    }
}

const top3Request = async (queryString, n = 3) => {
    const {
        results: result,
        confidences: confidences
    } = await sendQuery(queryString, false, n);
    console.log(`Top ${displaySize} likely webpages for query "${queryString}":
${result.slice(-displaySize).map((v, i) => `${i + 1}) [${(confidences[i] * 100 | 0).toString()}%] ${v}`).join('\n')}
`);
    return result;
}

const topRequest = async (queryString) => {
    const {
        results: result,
        confidences: confidences
    } = await sendQuery(queryString, false, 3);
    console.log(`
Top matching webpage for query "${queryString}":
${result.slice(0, displaySize).map((v, i) => `${i + 1}) [${'XX'}%] ${v}`).join('\n')}`);
}

const memoFolder = './query-bing-memo';
const memoQueryFetch = async (query, refreshCache) => {
    if(!fs.existsSync(memoFolder)) fs.mkdirSync(memoFolder);
    const pastQueries = fs.readdirSync(memoFolder);
    const pastQueryIndex = pastQueries.indexOf(query);

    if(pastQueryIndex !== -1 && !refreshCache){
        console.log('Reading from cache...')
        const cachedPath = `${memoFolder}/${pastQueries[pastQueryIndex]}`;
        return JSON.parse(fs.readFileSync(cachedPath).toString());
    }

    console.log('Fetching from API endpoint...')
    return new Promise((resolve, reject) => {
        axios.get(url, {
            params: { 'q': query },
            headers: { 'Ocp-Apim-Subscription-Key': key },
        }).then((res) => {
            fs.writeFileSync(`${memoFolder}/${query}`, JSON.stringify(res.data));
            resolve(res.data);
        }).catch(err => {
            reject(err);
        });
    });
}

// top3Request(`${name} homepage ${institution}`).then(() => {
//     return topRequest(`${name} ${institution} cv curriculm vitae filetype:pdf`);
// }).finally(() => {
//     console.log(' ');
// })

;
// sendQuery(`${name} brown university homepage`).then(() => {

// }).catch(err => {
//     console.log(Object.keys(err))
//     console.log(err.message)
// });

// module.exports = {
//     sendQuery: sendQuery,
//     // top3Request: top3Request
// }