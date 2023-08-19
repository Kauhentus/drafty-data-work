const { readFileSync, writeFileSync, link } = require("fs");
const fs = require('fs');
const { parse } = require('node-html-parser');
const axios = require('axios');
const https = require('https');
const url = require('url'); 
const { error } = require("console");

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

const fetchLinks = async (link) => {
    const baseURL = new url.URL(link);
    const hostname = baseURL.hostname;
    const protocol = baseURL.protocol;
    const path = baseURL.path;
    
    console.log(`Extracting base links from: ${link}`)
    console.log(`Setting hostname to "${baseURL.hostname}" with protocol "${protocol}"`)

    console.log('Fetching link...')
    const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
    });
    const res = await axios.get(link, { httpsAgent })
    
    console.log('Data fetched, beginning parsing...');
    rawHTML = res.data;
    const struct = parse(rawHTML);
    const links = [...new Set(struct.querySelectorAll('a'))]
        .map(node => node.rawAttrs.split(' '))
        .filter(attrs => {
            const selected = attrs.filter(attr => attr.slice(0, 4) === 'href');
            return selected.length !== 0 && attrs.length !== 0;
        })
        .map(link => link[0].slice(6, -1));

    const repairedLinks = links.map(link => {
        if(link[0] === "/" && link[1] === "/") link = link.slice(2); // href starts with // for some reason, remove it
        if(link[0] === "/" && link[1] !== "/") return `${protocol}//www.${hostname}${link}`; // relative path, i.e. /*
        if(link.slice(0,4) === "www.") link = `${protocol}//${link}`; // href starts with www., need to add in protocol
        let newLink;
        try {
            newLink = new url.URL(link);
        } catch(e) {
            // console.log(link, e);
            return "[[DUD]]"
        }
        return newLink.href;
    }).filter(link => link !== "[[DUD]]");

    return {
        htmlSource: rawHTML,
        links: repairedLinks
    };
}

const genLinks = async (link) => {
    const baseURL = new url.URL(link);
    const hostname = baseURL.hostname;
    const protocol = baseURL.protocol;
    const path = baseURL.path;

    const {
        htmlSource: htmlSource,
        links: repairedLinks
    } = await fetchLinks(link);

    if(!fs.existsSync(`./query-data-v2/${hostname}/`)) fs.mkdirSync(`./query-data-v2/${hostname}/`);
    fs.writeFileSync(`./query-data-v2/${hostname}/main-v1.json`, JSON.stringify({
        traversed: [],
        queue: repairedLinks.map(link => ({
            url: link,
            depth: 0,
        })),
        errorLinks: [],
        sourceDomain: hostname
    }, null, 4));

    console.log(repairedLinks)
}

const iter = async (hostname) => {
    let config = JSON.parse(fs.readFileSync(`./query-data-v2/${hostname}/main-v1.json`));
    /** @type {string[]} */
    const traversed = config.traversed;
    /** @type {({url: string, depth: number)[]} */
    let queue = config.queue;
    const sourceDomain = config.sourceDomain;
    const errorLinks = config.errorLinks;

    const curLinkObj = queue.shift();
    const curLinkURL = new URL(curLinkObj.url);
    const curLinkDepth = curLinkObj.depth;
    console.log(`Scraping URL: ${curLinkObj.url}`);
    if(curLinkDepth > 3) {
        config = {
            traversed: traversed,
            queue: queue,
            sourceDomain: sourceDomain,
            errorLinks: errorLinks
        };
        fs.writeFileSync(`./query-data-v2/${hostname}/main-v1.json`, JSON.stringify(config, null, 4));

        return;
    };

    let HTMLSource, links;
    try {
        console.log(curLinkObj, curLinkObj.url)
        const {
            htmlSource: h,
            links: l
        } = await fetchLinks(curLinkObj.url);
        HTMLSource = h;
        links = l;

        if(!fs.existsSync(`./query-data-v2/${hostname}/pages`)) fs.mkdirSync(`./query-data-v2/${hostname}/pages`);
        const reformattedLink = curLinkObj.url.replace(/:/g, '#').replace(/\//g, '$').replace(/\?/g, '!');
        fs.writeFileSync(`./query-data-v2/${hostname}/pages/${reformattedLink}.txt`, h);
        console.log(`  ${h.length * 2} bytes written to disk`);
    } catch(e) {
        console.log(`  Error encountered with link ${curLinkObj.url}`)
        errorLinks.push(curLinkObj);
        config = {
            traversed: traversed,
            queue: queue,
            sourceDomain: sourceDomain,
            errorLinks: errorLinks
        };
        fs.writeFileSync(`./query-data-v2/${hostname}/main-v1.json`, JSON.stringify(config, null, 4));
        return;
    }

    const startQueueLength = queue.length;
    links.forEach(link => {
        const existingTraversedIndex = traversed.findIndex(l => link === l);
        const existingQueueIndex = queue.findIndex(pair => pair.url === link);
        if(
            existingQueueIndex === -1 && existingTraversedIndex === -1 &&
            link.indexOf(hostname) !== -1
        ){
            queue.push({
                url: link,
                depth: curLinkDepth + 1
            });
        }
    });
    console.log(`  ${queue.length - startQueueLength} links added to the Queue`);
    console.log(`  ${queue.length} links left to scrape`);
    queue = queue.filter(item => blacklist.every(keyword => !(item.url.toLowerCase().includes(keyword))));
    traversed.push(curLinkURL);

    config = {
        traversed: traversed,
        queue: queue,
        sourceDomain: sourceDomain,
        errorLinks: errorLinks
    };
    fs.writeFileSync(`./query-data-v2/${hostname}/main-v1.json`, JSON.stringify(config, null, 4));
    return;
}

const chainedIter = async (hostname) => {
    console.log(`\n###`);
    await iter(hostname);
    setTimeout(() => {
        chainedIter(hostname);
    }, 200 + Math.random() * 300 | 0);
}

//genLinks('https://cs.brown.edu/people/faculty/');
chainedIter('cs.brown.edu');