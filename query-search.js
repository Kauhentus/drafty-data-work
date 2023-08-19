const fs = require('fs');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

// const pagesFolder = './query-data/cs.brown.edu/pages-v2';
const pagesFolder = './query-data-v2/cs.brown.edu/pages';
const pages = fs.readdirSync(pagesFolder);
const loadedPages = pages.map((file, i) => {
    if(i % 100 === 0) console.log(`Loaded ${i} of ${pages.length} pages into memory`);
    return {
        fileName: file.replace(/#/g, ':').replace(/\$/g, '/').replace(/!/g, '?'),
        data: fs.readFileSync(`${pagesFolder}/${file}`).toString().toLowerCase(),
        occurances: -1,
        firstpov: -1
    }
});

const name = 'james tompkin';

const queryName = (name) => {
    const nameTokens = name.split(' ');
    const firstName = nameTokens[0];
    const lastName = nameTokens[nameTokens.length - 1];
    
    console.log('filtering...')
    const desiredPages = loadedPages.filter(page => 
        page.data.includes(name.toLowerCase()) || 
        (page.data.includes(firstName.toLowerCase()) && page.data.includes(lastName.toLowerCase()) )
    );
    console.log('finished filtering')
    
    const linkToPath = (link) => {
        const fileName = `${link.replace(/:/g, '#').replace(/\//g, '$').replace(/\?/g, '!')}.txt`;
        return `${pagesFolder}/${fileName}`;
    }
    
    const countOccurances = (str, regex) => (str.match(regex) || []).length;
    const occurancesFilter = desiredPages
        .map((data, i) => [
            2 * countOccurances(data.data, new RegExp(name, 'g')) +
            // countOccurances(data.data, new RegExp(firstName, 'g')) +
            countOccurances(data.data, new RegExp(lastName, 'g'))
        , i])
        .sort((a, b) => a[0] - b[0]);
    
    const likelyMatches = occurancesFilter.map(pair => {
        const match = desiredPages[pair[1]];
        match.occurances = pair[0];
        return match;
    });
    const likelyMatchesLinks = likelyMatches.map(m => [m.occurances, m.fileName.slice(0, -4)]);
    
    const firstPersonFilter = likelyMatches.map(m => {
        const str = m.data.replace(/\./g, ' ');
        const myCount = countOccurances(str, / my /g);
        const meCount = countOccurances(str, / me /g);
        const iCount = countOccurances(str, / i /g);
        const otherCount = countOccurances(str, / i'm /g) + 
            countOccurances(str, />i /g) + 
            countOccurances(str, />my /g) + 
            countOccurances(str, />me /g);
        m.firstpov = myCount + meCount + iCount + otherCount;
        return m;
    }).sort((a, b) => a.firstpov - b.firstpov);
    const firstPersonLinks = firstPersonFilter
        .map(m => [m.firstpov, m.fileName.slice(0, -4)])
        .filter(pair => pair[0] > 0);
    
    const collectedLinks = [...new Set([
        ...likelyMatchesLinks.map(m => m[1]),
        ...firstPersonLinks.map(m => m[1])
    ])];
    const rankings = collectedLinks.map(link => {
        const likelyMatchesIndex = likelyMatchesLinks.findIndex(pair => pair[1] === link);
        const firstPersonIndex = firstPersonLinks.findIndex(pair => pair[1] === link);

        const numMatches = likelyMatchesLinks[likelyMatchesIndex] ? likelyMatchesLinks[likelyMatchesIndex][0] : 0;
        const numFOV = firstPersonLinks[firstPersonIndex] ? firstPersonLinks[firstPersonIndex][0] : 0;
        const ratio = numFOV / numMatches;

        return [
            likelyMatchesIndex / likelyMatchesLinks.length, 
            firstPersonIndex / firstPersonLinks.length,
            link,
            ratio,
            numMatches, numFOV
        ]
    }).map(triple => [
        triple[0] < 0 ? 0 : triple[0],
        triple[1] < 0 ? 0 : triple[1],
        triple[2],
        triple[3],
        triple[4],
        triple[5]
    ]);
    
    const nameWeight = 2;
    const firstPOVWeight = 1;
    
    const finalRankings = rankings.map(triple => [
        triple[0], // name ranking
        triple[2], // link
        triple[3]  // name-to-fov ratio
    ]).sort((a, b) => a[0] - b[0]).filter(triple => triple[2] > 0.02);

    return finalRankings;
}

const displayResults = (queryRankings, name) => console.log(`
Top 5 likely webpages for "${name}":
${queryRankings.slice(-5).reverse().map((v, i) => `${i + 1}) ${v[1]}`).join('\n')}
`);

const query = (name) => displayResults(queryName(name), name);

// runtime call
query(name);

const prompt = () => {
    readline.question('> ', (str) => {
        try {
            console.log(eval(str));
        } catch(e) {
            console.log(e);
        }
        
        prompt();
    });
}
prompt();