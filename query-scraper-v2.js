const { readFileSync, writeFileSync, link } = require("fs");
const fs = require('fs');
const { parse } = require('node-html-parser');
const axios = require('axios');
const https = require('https');

const baseurl = 'cs.brown.edu';
const baseurl2 = 'brown.edu';

const configPath = './query-data/' + baseurl + '/main-v2.json';
let config = require(configPath);

const blacklist = [
    'google',
    'dropbox',
    'mailto',
    'people/ugrad',
    'courses',
    'linkedin',
    'twitter',
    'facebook',
    'conduit',
    'youtube',
    'vimeo',
    'arxiv',
    'gitlab',
    'people/grad',
    'files/',
    'papers',
    'dl.acm.org',
    'flickr',
    'youtu.be',
    'springer',
    'login',
    'video',
    'publication',
    'paper',
    '.pdf',
    'type=pdf',
    '.gov',
    'quora',
    'acm.org',
    'ieee.org',
    '..',
    '#',
    'tel:',
    'undergrad',
    'degree',
    'blog',
    '/news',
    'events',
    'talks',
    'wiley',
    'sciencedirect',
    'symposia',
    'archives',
    'degrees',
    'mpg.de',
    'documentation',
    'microsoft',
    'ripta'
];

const iter = async (queueItem) => {
    if(queueItem.depth > 3) return;
    let link = queueItem.link;
    console.log("Processing: " + link);
    if(link === 'END') return;

    config = require(configPath);
    let traversed = config.traversed;
    let queue = config.queue;

    const shiftedItem = queue.shift();
    let rawHTML;
    try {
        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });
        if(link.slice(0, 4) !== 'http'){
            let addwww = link.slice(0, 3) !== 'www' ? 'www.' : '';
            if(link.includes(baseurl)) link = 'https://' + addwww + link;
            else if(link.includes(baseurl2)) link = 'https://' + addwww + link;
            else link = 'https://' + addwww + baseurl + '/' + link;
        }
        console.log(link)
        const res = await axios.get(link, { httpsAgent })
        rawHTML = res.data;
    } catch(err) {
        console.log("B", err.code);
        if(err.code === "ECONNREFUSED") queue.unshift(shiftedItem);
        return;
    }
    
    fs.writeFileSync(`./query-data/${baseurl}/pages-v2/${link.replace(/:/g, '#').replace(/\//g, '$').replace(/\?/g, '!')}.txt`, rawHTML);

    const struct = parse(rawHTML);

    const links = [...new Set(struct.querySelectorAll('a')
        .map(node => node.rawAttrs.split(' '))
        .map(attrs => {
            const selected = attrs.filter(attr => attr.slice(0, 4) === 'href');
            if(selected[0] === undefined) return '[[DUB]]';
            else return selected[0].slice(6, -1);
        })
        .filter(entries => entries !== '[[DUB]]')
        .map(frag => {
            if(frag[0] === '/' && frag[1] !== '/') return 'https://' + baseurl + frag;
            if(frag.slice(0, 2) === '//') return frag.slice(2);
            if(frag.slice(0, 2) === './') return 'https://' + baseurl + frag.slice(1);
            else return frag;
        })
        .filter(link => queue.findIndex(q => q.link === link) === -1)
        .filter(link => !traversed.includes(link))
        .map(link => ({
            link: link,
            depth: queueItem.depth + 1
        }))
    )];

    traversed.push(link);
    if(link.includes(baseurl)) queue.push(...links);

    config.traversed = traversed;
    config.queue = queue.filter(queueItem => blacklist.every(keyword => !(queueItem.link.toLowerCase().includes(keyword))));
    config.queue = config.queue.filter((arr, index, self) =>
        index === self.findIndex((t) => t.link === arr.link))
    config.queue = config.queue.filter(queueItem => queueItem.depth <= 3)

    writeFileSync(configPath, JSON.stringify(config, null, 4));
}

const iterLoop = async () => {
    //while(config.queue?.length > 0){
        config = require(configPath);
        // let i = 0;
        // if(config.queue[i] === "") {
        //     config.queue.unshift();
        //     i++;
        // }
        await iter(config.queue[0] || 'END');
    //}
}

// iter('https://cs.brown.edu/')
iterLoop();