import * as fs from 'fs';
import { getInstitutions } from './query-combined.js';
import OpenAI from 'openai';

const uniDict = JSON.parse(fs.readFileSync('./university-names-data.json').toString());
const uniList = JSON.parse(fs.readFileSync('./university-names-data-2.json').toString())

const rawData = fs.readFileSync('./validate.csv').toString().replace(/\r/g, '').split('\n');
const items = rawData.filter(line => line !== '').map(line => {
    const tokens = [''];
    let inQuote = false;
    for(let i = 0; i < line.length; i++){
        const c = line[i];
        if(!inQuote){
            if(c === '"'){
                inQuote = true;
            } else if(c === ','){
                tokens.push('');
            } else {
                tokens[tokens.length - 1] += c;
            }
        } else {
            if(c === '"'){
                inQuote = false;
            } else {
                tokens[tokens.length - 1] += c;
            }
        }
    }
    return tokens;
});

import openaikey from './openaiapikeys.json' assert {type: "json"}
const openai = new OpenAI({
    apiKey: openaikey.key,
});

const memoResults = async (name, institution, priorBachelors, priorDoctorate) => {
    console.log(`Validating ${name} at ${institution}`);

    if(!fs.existsSync('./query-results-memo')){
        fs.mkdirSync('./query-results-memo');
    }

    let finalBachelors;
    let finalDoctorate;
    let memoFilename = `./query-results-memo/${name},${institution}.json`;
    if(fs.existsSync(memoFilename)){
        console.log(`Getting memoized query...`)
        let {
            finalBachelors: finalBachelorsQuery,
            finalDoctorate: finalDoctorateQuery
        } = JSON.parse(fs.readFileSync(memoFilename).toString());
        finalBachelors = finalBachelorsQuery;
        finalDoctorate = finalDoctorateQuery;
    } else {
        console.log(`Running query...`)
        let {
            finalBachelors: finalBachelorsQuery,
            finalDoctorate: finalDoctorateQuery
        } = await getInstitutions(name, institution);
        fs.writeFileSync(memoFilename, JSON.stringify({
            finalBachelors: finalBachelorsQuery,
            finalDoctorate: finalDoctorateQuery
        }));
        finalBachelors = finalBachelorsQuery;
        finalDoctorate = finalDoctorateQuery;
    }

    console.log('Fetched', finalBachelors, finalDoctorate)
    
    const toolBachelorsConclusion = finalBachelors.toLowerCase();
    const toolDoctorateConclusion = finalDoctorate.toLowerCase();

    const unisAreSame = async (uniA, uniB) => {
        const completion = await openai.chat.completions.create({
            messages: [{ role: 'user', content: `Do "${uniA}" and "${uniB}" refer to the same institution? Respond with "yes" or "no" only.`}],
            model: 'gpt-3.5-turbo',
        });
        const result = completion.choices[0].message.content.toLowerCase();
        if(result.includes('yes')){
            return true;
        } else if(result.includes('no')){
            return false;
        } else {
            return false;
        }
    }

    const bachelorsSame = await unisAreSame(toolBachelorsConclusion, priorBachelors);
    const doctorateSame = await unisAreSame(toolDoctorateConclusion, priorDoctorate);

    let log = '';
    if(!bachelorsSame && toolBachelorsConclusion !== ''){
        log += `Discrepancy or missing data found for ${name} at ${institution}:\n`
        log += ` -> Bachelors degree: found data "${toolBachelorsConclusion}", but existing data is "${priorBachelors}"\n`;
    } 
    if(!doctorateSame && toolBachelorsConclusion !== ''){
        log += `Discrepancy or missing data found for ${name} at ${institution}:\n`
        log += ` -> Doctorate degree: found data "${toolDoctorateConclusion}", but existing data is "${priorDoctorate}"\n`;
    } 
    console.log(log);
    return log;
};

const validateCSV = async () => {
    const results = [];
    for(let item of items){
        const res = await new Promise(res => {
            setTimeout(async () => {
                const result = await memoResults(
                    item[0], item[1],
                    item[4], item[5]
                );
                res(result);
            }, 1000);
        });
        results.push(res);
    }

    const totalValidated = results.length;
    const validNumber = results.filter(res => res !== '').length;

    const formatDtoP = (decimal) => (decimal * 100).toFixed(2) + '%';
    fs.writeFileSync('./validation-log.txt', `Validation results:
${validNumber} discrepancies/missing data encountered in ${results.length} entries
${formatDtoP(validNumber / totalValidated)} of data should be reviewed...

Validation log of discrepancies/missing data below:
\n${results.join('\n')}`);
}

validateCSV();

// memoResults(
//     'james tompkin', 'brown university',
//     'university of college london', 'university of college london'
// );