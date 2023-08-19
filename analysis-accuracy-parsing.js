const fs = require('fs');

const institution = 'University of Massachusetts Amherst';
const fileData = fs.readFileSync('./umass-changes.txt').toString();
const rawLines = fileData.split('\n');

const verificationLines = [];
const addendumLines = [];

let mode = '';
for(let line of rawLines){
    // parse header line

    if(line === 'VERIFICATION'){
        mode = line;
        continue;
    }
    if(line === 'ADDENDUM') {
        mode = line;
        continue;
    }
    if(line === 'KEY') {
        mode = line;
        continue;
    }
    if(line === ''){
        continue;
    }

    // parse data line

    if(mode === 'VERIFICATION'){
        const args = line.split(';');
        const name = args[0];
        const errorKind = args[1].split(',');
        const corrections = args[2]?.split(',');
        
        const revised = line[0] === '@';
        if(revised) console.log(revised)

        verificationLines.push({
            name: name,
            errorKind: revised ? '0' : errorKind,
            corrections: revised ? undefined : corrections
        });
        continue;
    }   
    if(mode === 'ADDENDUM'){
        addendumLines.push(line);
        continue; 
    }
}


const validProfsInDB = verificationLines.filter(prof => 
    prof.errorKind[0] !== '!X' &&
    prof.errorKind[0] !== '!D' &&
    prof.errorKind[0] !== '!E' &&
    prof.errorKind[0] !== '!I' &&
    prof.errorKind[0] !== '!A'
);

const numProfsInDB = verificationLines.length;
const numProfsToAdd = addendumLines.length;
const numInvalidProfs = verificationLines.filter(prof => 
    prof.errorKind[0] === '!X' ||
    prof.errorKind[0] === '!D' ||
    prof.errorKind[0] === '!E' ||
    prof.errorKind[0] === '!I' ||
    prof.errorKind[0] === '!A'
).length;
const numProfsGroundTruth = numProfsInDB - numInvalidProfs + numProfsToAdd;

const numProfsNameWrong = verificationLines.filter(prof => 
    prof.errorKind[0] === '-5' || prof.errorKind[0] === '!5').length;
const numProfsJoinYearWrong = verificationLines.filter(prof => 
    prof.errorKind[0] === '-1' || prof.errorKind[0] === '!1').length;
const numProfsSubfieldWrong = verificationLines.filter(prof => 
    prof.errorKind[0] === '-2' || prof.errorKind[0] === '!2').length;
const numProfsUndergradWrong = verificationLines.filter(prof => 
    prof.errorKind[0] === '-3' || prof.errorKind[0] === '!3').length;
const numProfsPhdWrong = verificationLines.filter(prof => 
    prof.errorKind[0] === '-4' || prof.errorKind[0] === '!4').length;
const numProfsWithError = numProfsNameWrong + numProfsJoinYearWrong + numProfsSubfieldWrong + numProfsUndergradWrong + numProfsPhdWrong;
const numErrorMistakes = validProfsInDB.filter(prof => prof.errorKind[0][0] === '-').length;
const numErrorMissing = validProfsInDB.filter(prof => prof.errorKind[0][0] === '!').length;

const formatDtoP = (decimal) => (decimal * 100).toFixed(2) + '%';

fs.writeFileSync('analysis-results.txt',
`------------------------
ANALYSIS RESULTS REPORT
for ${institution}
------------------------
Professor Breakdown:
${numProfsInDB} professors existing in database
${numProfsToAdd} professors to add into database
${numInvalidProfs} invalid professors
${numProfsGroundTruth} professors at university (GROUND TRUTH) 
(N.B. Only professors with Ph.D. students are counted)

Precision + Recall:
True positives:    ${numProfsInDB - numInvalidProfs}
False positives:   ${numInvalidProfs}
True negatives:    -
False negatives:   ${numProfsToAdd}
(N.B. False positives are invalid professors, i.e. wrong institution)

Precision + Recall Analysis:
Precision:                  ${formatDtoP((numProfsInDB - numInvalidProfs) / (numProfsInDB))}
Recall:                     ${formatDtoP((numProfsInDB - numInvalidProfs) / numProfsGroundTruth)}

Error Breakdown:
${numProfsWithError} professors with incorrect data (TOTAL)
${numProfsNameWrong} professors with updated names
${numProfsJoinYearWrong} professors with wrong join year
${numProfsSubfieldWrong} professors with wrong subfield
${numProfsUndergradWrong} professors with wrong undergrad
${numProfsPhdWrong} professors with wrong Ph.D.
(N.B. Invalid professors not included in this tally)

${numErrorMistakes} errors were mistakes in existing data
${numErrorMissing} errors were missing entries in the database
Mistake error percentage: ${formatDtoP(numErrorMistakes / numProfsWithError)}
Missing error percentage: ${formatDtoP(numErrorMissing / numProfsWithError)}

` 
);



// console.log(verificationLines)
// console.log(verificationLines.filter(prof => prof.errorKind[0] === '0'))