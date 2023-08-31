import chalk from 'chalk';
// const { sendQuery } = require("./query-bing");
// const { queryGPT } = require("./query-chatgpt");
// const { loadCV, rerankCVs } = require("./query-cv-pdf");

import  { sendQuery } from "./query-bing.js";
import  { queryGPT } from "./query-chatgpt.js";
import  { loadCV, rerankCVs } from "./query-cv-pdf.js";

// const name = 'matthew lentz'
// const institution = 'duke university';

// const name = 'keenan crane';
// const institution = 'carnegie mellon university';

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

// const name = 'Amir Houmansadr';
// const institution = 'University of Massachusetts Amherst'

// const name = 'dan sheldon';
// const institution = 'umass amherst'

// const name = 'Andrew McCallum';
// const institution = 'umass amherst'

const name = 'Eliot Moss';
const institution = 'umass amherst'

export const run = async (name, institution, display = true) => {
    const d = display;
    if(d) console.log(chalk.bgAnsi256(217)(`Querying ${name} at ${institution}...`));
    const nameTokens = name.split(' ');
    const firstName = nameTokens[0];
    const lastName = nameTokens[nameTokens.length - 1];

    if(d) console.log(`Finding homepages for ${name} at ${institution}...`);
    const {
        results: resultHomepage,
        confidences: confidencesHomepage
    } = await sendQuery(`${firstName} ${lastName} homepage ${institution}`, false, 3);
    if(d) console.log(resultHomepage)
    if(d) console.log('Potential homepages links found above. Beginning query of first link...')
    const result = await new Promise(res => {
        setTimeout(async () => {
            const result = queryGPT(resultHomepage[0])
            res(result);
        }, 500);
    });
    const result2 = await new Promise(res => {
        setTimeout(async () => {
            const result = queryGPT(resultHomepage[1])
            res(result);
        }, 500);
    });
    console.log(confidencesHomepage);
    let homepageBachelors = result ? result.bachelors.slice(10) : '';
    let homepageDoctorate = result ? result.doctorate.slice(10) : '';
    if(homepageBachelors.includes('N/A') && result2 && result2.bachelors) homepageBachelors = result2.bachelors.slice(10);
    if(homepageDoctorate.includes('N/A') && result2 && result2.doctorate) homepageDoctorate = result2.doctorate.slice(10);
    if(d) console.log(chalk.bgAnsi256(227)(` -> Bachelors: ${homepageBachelors}`))
    if(d) console.log(chalk.bgAnsi256(227)(` -> Doctorate: ${homepageDoctorate}`))


    if(d) console.log(`\nFinding CVs for ${name} at ${institution}...`);
    const {
        results: resultCV,
        confidences: confidencesCV
    } = await sendQuery(`${name} ${institution} cv curriculm vitae filetype:pdf`, false, 3, false);
    const rerankedCVS = await rerankCVs(resultCV, lastName);
    if(d) console.log(rerankedCVS)
    if(d) console.log('Potential CV pdfs found above. Beginning query of first CV...')
    const degreesFromCV = await loadCV(rerankedCVS[0]);
    const cvBachelors = degreesFromCV.bachelors;
    const cvDoctorate = degreesFromCV.doctorate;
    if(d) console.log(chalk.bgAnsi256(227)(` -> Bachelors: ${cvBachelors}`))
    if(d) console.log(chalk.bgAnsi256(227)(` -> Doctorate: ${cvDoctorate}`))

    return {
        homepageBachelors: homepageBachelors,
        homepageDoctorate: homepageDoctorate,
        homepageConfidences: confidencesHomepage,
        cvBachelors: cvBachelors,
        cvDoctorate: cvDoctorate,
        cvConfidences: confidencesCV
    };
}

export const getInstitutions = async (name, institution) => {
    const {
        homepageBachelors: homepageBachelors,
        homepageDoctorate: homepageDoctorate,
        homepageConfidences: confidencesHomepage,
        cvBachelors: cvBachelors,
        cvDoctorate: cvDoctorate,
        cvConfidences: confidencesCV
    } = await run(name, institution, false);

    let finalBachelors;
    let finalDoctorate;
    if(homepageBachelors.includes('N/A')) finalBachelors = cvBachelors;
    else finalBachelors = homepageBachelors;
    if(homepageDoctorate.includes('N/A')) finalDoctorate = cvDoctorate;
    else finalDoctorate = homepageDoctorate;

    return {
        finalBachelors: finalBachelors.trim(),
        finalDoctorate: finalDoctorate.trim()
    };
}

run(name, institution);