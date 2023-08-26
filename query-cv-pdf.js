// const request = require('request');
// const https = require('https')
// const { default: axios } = require('axios');
// const fs = require('fs');
// const { getDocument } = require('pdfjs-dist');

import request from "request";
import https from 'https';
import axios from "axios";
import fs from 'fs';
import pkg from "pdfjs-dist";
const { getDocument } = pkg;

// const cvURL = "https://jeffhuang.com/CurriculumVitae.pdf";
// const cvURL = "https://vivo.brown.edu/docs/j/jtompki1_cv.pdf?dt=101910191";
// const cvURL = "https://dritchie.github.io/misc/cv.pdf";
// const cvURL = 'https://groups.cs.umass.edu/wp-content/uploads/sites/8/2022/10/2022-10-CV-Narges-Mahyar.pdf'
// const cvURL = 'https://www.landay.org/_files/ugd/e549d4_6b15f9b92510420dbe1571f425bb5b5d.pdf?index=true';
// const cvURL = 'https://faculty.cc.gatech.edu/~jabernethy9/pdf/Resume.pdf'
// const cvURL = 'https://www.sci.utah.edu/~gerig/gerigCV.pdf';
// const cvURL = 'https://www.cs.purdue.edu/homes/ab/Aniket_CV.pdf';
// const cvURL = 'https://users.cs.duke.edu/~mlentz/cv.pdf';

const uniDict = JSON.parse(fs.readFileSync('./university-names-data.json').toString());
const uniList = JSON.parse(fs.readFileSync('./university-names-data-2.json').toString())

export const loadCV = async (cvlink) => {
    const loadingTask = getDocument({url: cvlink, verbosity: 0});
    const pdfDocument = await loadingTask.promise;
    let runningString = '';

    // only process the first page!
    for(let i = 0; i < 1 /*pdfDocument.numPages*/; i++){
        // console.log(`Processed page ${i + 1} of ${pdfDocument.numPages}`);
        const pageGraph = [];

        const pageNumber = i + 1;
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
            pageGraph.push({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5]
            });
            runningString += '|>' + item.str + '<|'
        });

        const searchTolerance = 1;

        const mergedNodes = [];
        for(let node of pageGraph){
            let prevNode = mergedNodes[mergedNodes.length - 1];
            if(prevNode !== undefined){
                let prevNodeY = prevNode.y;
                if(Math.abs(prevNodeY - node.y) < searchTolerance){
                    mergedNodes[mergedNodes.length - 1].str += node.str;
                } else {
                    mergedNodes.push(node);
                }
            } else {
                mergedNodes.push(node);
            }
        }
        const pageNodes = mergedNodes;


        let ugradKeywords = ['bsc', 'bs.c.', 'b.sc', 'b.s.', 'bs', 'ba', 'b.a.', 'sc.b.', 'bachelor\'s', 'bachelors', 'bachelor', 'b.tech', 'btech']
        let phdKeywords = ['ph.d.', 'phd', 'doctorate', 'engd', 'deng'];

        const findNode = keywordSet => pageNodes.filter(item => {
            const tokens = item.str.replace(/\.|\,|\:|\(|\)/g, '').split(' ').map(token => token.toLowerCase());
            // console.log(tokens, item.y);
            return tokens.some(token => keywordSet.includes(token));
        });
        const bachelorsPotentialNode = findNode(ugradKeywords)
        const doctoratePotentialNode = findNode(phdKeywords)   

        const searchNearestUni = inputNode => {
            // console.log(pageNodes)
            const searchSpace = pageNodes.filter(node => {
                const isBelow = node.y <= inputNode.y + searchTolerance + 100;
                // const isRight = node.x >= inputNode.x - searchTolerance - 20;
                return isBelow // & isRight;
            });
            const nodesWithDistance = searchSpace.map(node => {
                node.distance = Math.sqrt(
                    // (node.x - inputNode.x) ** 2 +
                    (node.y - inputNode.y) ** 2
                )
                return node;
            }).sort((a, b) => a.distance - b.distance);

            // console.log(inputNode);
            // console.log(nodesWithDistance.slice(0, 10))

            let found = false;
            let institution = '', snippet = '';
            outer: for(let node of nodesWithDistance){
                const textToSearch = node.str.toLowerCase();

                // search for university in dictionary
                for(let key of Object.keys(uniDict)){
                    let aliases = uniDict[key].map(alias => alias.toLowerCase());
                    
                    for(let alias of aliases){
                        if(textToSearch.includes(alias)){
                            found = true;
                            institution = key;
                            snippet = alias;
                            break outer;
                        }
                    }
                }
                
                // search for university in list (not in dictionary!)
                const tokensOfInterest = textToSearch.replace(/\.|\,|\:|\(|\)/g, '').split(' ').filter(word =>
                    word !== 'university' && 
                    word !== 'of' && 
                    word !== 'and' && 
                    word !== 'national' &&
                    word !== 'institute' && 
                    word !== 'technology' && 
                    word !== 'state' &&  
                    word !== 'at' && 
                    word !== 'technological' && 
                    word !== 'de' && 
                    word !== 'college' && 
                    word !== 'tech' && 
                    word !== 'engineering' && 
                    word !== 'computer' &&
                    word !== 'science' &&
                    word !== 'international' &&
                    word !== 'academy' &&
                    word !== ''
                );
                let maxCounter = 0;
                let twoWordMatch = 1;
                let match = '';
                let curCounter = 0;
                let matchedTokenSet = [];
                for(let uni of uniList){
                    const tokenSet = uni.replace(/\.|\,|\:|\(|\)/g, '').split(' ').map(token => token.toLowerCase());
                    for(let token of tokensOfInterest){
                        if(tokenSet.includes(token)) curCounter += 1;
                    }
                    if(curCounter > maxCounter) {
                        matchedTokenSet = tokenSet;
                        if(matchedTokenSet.length <= 2) twoWordMatch = 0;
                        maxCounter = curCounter;
                        match = uni;
                    }
                    curCounter = 0;
                }
                // console.log('attempt', tokensOfInterest, matchedTokenSet)
                if(maxCounter > twoWordMatch){
                    found = true;
                    institution = match;
                    snippet = match;
                    break outer;
                }
            }

            // console.log(found, institution, '@', snippet)
            return institution;
        }

        let bachelorsNode = bachelorsPotentialNode[0];
        let doctorateNode = doctoratePotentialNode[0];
        let bachelors = '', doctorate = '';
        if(bachelorsNode !== undefined){
            bachelors = searchNearestUni(bachelorsNode);
        }
        if(doctorateNode !== undefined){
            doctorate = searchNearestUni(doctorateNode);
        }

        return {
            bachelors: bachelors,
            doctorate: doctorate
        }
    }
}

export const rerankCVs = async (links, lastname) => {
    const occurances = await Promise.all(links.map(async (link, i) => {
        const loadingTask = getDocument({url: link, verbosity: 0});

        let pdfDocument;
        try {
            pdfDocument = await loadingTask.promise;
        } catch(e) {
            return [link, 0, 0];
        }

        let runningString = '';
        for(let i = 1; i <= pdfDocument.numPages; i++){
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();
            textContent.items.forEach(item => runningString += item.str);
            runningString = runningString.toLowerCase();
        }
        
        const occurances = runningString.match(new RegExp(lastname, 'g'));
        const CSoccurances = runningString.match(new RegExp('computer', 'g'));
        const CSoccNum = (CSoccurances ? 100 : 0)
        return [link, (occurances ? occurances.length : 0) + CSoccNum, i];
    }));
    const reranked = occurances.sort((a, b) => b[1] - a[1]);
    return reranked.filter(triple => triple[1] > 3).map(triple => triple[0])
}

// module.exports = {
//     loadCV: loadCV,
//     rerankCVs: rerankCVs,
// }