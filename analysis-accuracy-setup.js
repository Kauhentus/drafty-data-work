const fs = require('fs');
const data = fs.readFileSync('final_profs.csv').toString();

const desiredProfs = data.split('\n').filter(str => {
    const tokens = str.split(',');
    return tokens[1] === 'University of Massachusetts Amherst';
});

// fs.writeFileSync('out.csv', desiredProfs.join('\n'))
// fs.writeFileSync('umass-acc.csv', desiredProfs.map(row => row.split(',').slice(0, 1).join(',') + ',').join('\n'))

// 0 = good

// -5 = name wrong
// -1 = join year wrong
// -2 = subfield wrong
// -3 = undergrad wrong
// -4 = phd wrong

// !1 = join year missing
// !2 = subfield missing
// !3 = undergrad missing
// !4 = phd missing

// !X = changed institutions
// !D = duplicate
// !E = emeritus/emerita
// !I = not a CS professor?
// !A = adjunct, not tenure track