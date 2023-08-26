// const {default: axios} = require('axios');
// const { writeFileSync } = require('fs');
// const https = require('https');
// const HTMLParser = require('node-html-parser');
// const OpenAI = require('openai');

// const openai = new OpenAI({
//     apiKey: require('./openaiapikeys.json').key,
// });

import axios from 'axios'
import { writeFileSync } from 'fs'
import https from 'https'
import HTMLParser from 'node-html-parser'
import OpenAI from 'openai';

import openaikey from './openaiapikeys.json' assert {type: "json"}
const openai = new OpenAI({
    apiKey: openaikey.key,
});
    
export const queryGPT = async (link) => {
    console.log(`Re-fetching link "${link}" via HTTPS...`);
    let data;
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });
    try {
        const res = await axios.get(link, { httpsAgent })
        data = res.data;
    } catch(err) {
        console.log(`  Error: ${err.message}`);
        return;
    }

    console.log('Extracting meaningful text from page...');
    const root = HTMLParser.parse(data);
    const textNodes = [];
    const traverse = node => {
        if(
            node.nodeType == 3 &&
            !node.text.toLowerCase().includes('doctype html') &&
            node.text !== '\n' &&
            node.parentNode.tagName !== 'STYLE' &&
            node.parentNode.tagName !== 'SCRIPT' &&
            node.parentNode.tagName !== 'NOSCRIPT' &&
            node.parentNode.tagName !== 'IFRAME' &&
            node.parentNode.tagName !== 'OBJECT'
        ){
            textNodes.push(node);
        }
        node.childNodes.forEach(child => traverse(child))
    }
    traverse(root);

    const res = textNodes.map(n => n.text.trim()).filter(text => text.length > 1).join(' ');
    const chunks = res.split('. ');

    const countOccurances = (str, regex) => (str.match(regex) || []).length;
    const chunksFlagged = chunks.map(chunk => {
        const str = chunk.toLocaleLowerCase();
        const myCount = countOccurances(str, / my /g) + (str.slice(0, 3) === 'my ' ? 1 : 0);
        const meCount = countOccurances(str, / me /g) + (str.slice(0, 3) === 'me ' ? 1 : 0);
        const iCount = countOccurances(str, / i /g) + (str.slice(0, 2) === 'i ' ? 1 : 0);
        const pronounCount = countOccurances(str, / she /g) + (str.slice(0, 4) === 'she ' ? 1 : 0) + 
            countOccurances(str, / hee /g) + (str.slice(0, 3) === 'he ' ? 1 : 0);
            
        const otherCount = countOccurances(str, / i'm /g) + (str.slice(0, 4) === 'i\'m ' ? 1 : 0)
            + countOccurances(str, / professor /g) 
            + countOccurances(str, / university /g) 
            + countOccurances(str, / college /g) 
            + countOccurances(str, / institute /g) 
            + countOccurances(str, / school /g) 
            + countOccurances(str, / école /g) 
            + countOccurances(str, / technology /g)
        const sum = myCount + meCount + iCount + otherCount + pronounCount;
        return [chunk, sum];
    });
    // let valuableChunks = [];
    // for(let i = 0; i < chunksFlagged.length; i++){
    //     let curChunk = chunksFlagged[i];
    //     if(curChunk[1] > 0) valuableChunks.push(curChunk);
    //     else {
    //         if(i !== 0 && chunksFlagged[i - 1][1] > 0) valuableChunks.push(curChunk);
    //         else if(i !== chunksFlagged.length - 1 && chunksFlagged[i + 1][1] > 0) valuableChunks.push(curChunk);
    //     }
    // }
    let valuableChunks = chunksFlagged.filter(chunk => chunk[1] > 0)
    // console.log(valuableChunks.map(c => c[0]).length)
    // console.log(valuableChunks.map(c => c[0]))
    // console.log(chunks)

    let importantText = '"';
    for(let i = 0; i < valuableChunks.length; i++){
        let currentChunk = valuableChunks[i];
        if(importantText.length + currentChunk[0].length < 3500){
            importantText += currentChunk[0] + '. ';
        }
    }
    importantText += '"';

    // console.log(importantText)

    writeFileSync('temp.txt', importantText)

    console.log("Querying GPT-3.5...")

    const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: 
`In the following body of text about a professor, please find where the professor got their bachelors and doctorate degrees if mentioned. There may be nonsensical words at the beginning and end of the body of text. Please respond with only two lines starting with "Bachelors:" or "Doctorate:" respectively (only put down the institution name), and if the degree is not mentioned, put "N/A".
${importantText}`}],
        model: 'gpt-3.5-turbo',
    });

    if(completion.choices[0]){
        const result = completion.choices[0].message.content;
        const lines = result.split('\n');
        return {
            bachelors: lines[0],
            doctorate: lines[1]
        }
    } else {
        return {
            bachelors: 'Bachelors: N/A',
            doctorate: 'Doctorate: N/A'
        }
    }
}

// module.exports = {
//     queryGPT: queryGPT
// }

/*
In the following body of text about a professor, please find where the professor got their bachelors and doctorate degrees if mentioned. There may be nonsensical words at the beginning and end of the body of text. Please respond with only two lines starting with "Bachelors:" or "Doctorate:" respectively (only put down the institution name), and if the degree is not mentioned, put "N/A".
*/