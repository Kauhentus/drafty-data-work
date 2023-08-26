import chalk from 'chalk';
// const { sendQuery } = require("./query-bing");
// const { queryGPT } = require("./query-chatgpt");
// const { loadCV, rerankCVs } = require("./query-cv-pdf");

import  { sendQuery } from "./query-bing.js";
import  { queryGPT } from "./query-chatgpt.js";
import  { loadCV, rerankCVs } from "./query-cv-pdf.js";

// const name = 'matthew lentz'
// const institution = 'duke university';

const name = 'keenan crane';
const institution = 'carnegie mellon university';

// const name = 'jeff huang';
// const institution = 'brown university';

// const name = 'james tompkin';
// const institution = 'brown university';

// const name = 'narges mayhar';
// const institution = 'umass amherst';

// const name = 'daniel ritchie';
// const institution = 'brown university';

// const name = 'ugur centintemel';
// const institution = 'brown university';

// const name = 'erik demaine';
// const institution = 'mit'

const run = async () => {
    console.log(chalk.bgAnsi256(217)(`Querying ${name} at ${institution}...`));
    const nameTokens = name.split(' ');
    const firstName = nameTokens[0];
    const lastName = nameTokens[nameTokens.length - 1];

    console.log(`Finding homepages for ${name} at ${institution}...`);
    const {
        results: resultHomepage,
        confidences: confidencesHomepage
    } = await sendQuery(`${name} homepage ${institution}`, false, 3);
    console.log(resultHomepage)
    console.log('Potential homepages links found above. Beginning query of first link...')
    const result = await queryGPT(resultHomepage[0])
    console.log(result)
    console.log(chalk.bgAnsi256(227)(` -> ${result.bachelors}`))
    console.log(chalk.bgAnsi256(227)(` -> ${result.doctorate}`))


    console.log(`\nFinding CVs for ${name} at ${institution}...`);
    const {
        results: resultCV,
        confidences: confidencesCV
    } = await sendQuery(`${name} ${institution} cv curriculm vitae filetype:pdf`, false, 3, false);
    const rerankedCVS = await rerankCVs(resultCV, lastName);
    console.log(rerankedCVS)
    console.log('Potential CV pdfs found above. Beginning query of first CV...')
    const degreesFromCV = await loadCV(rerankedCVS[0]);
    console.log(chalk.bgAnsi256(227)(` -> Bachelors: ${degreesFromCV.bachelors}`))
    console.log(chalk.bgAnsi256(227)(` -> Doctorate: ${degreesFromCV.doctorate}`))
}

run();