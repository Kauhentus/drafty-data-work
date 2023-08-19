const fs = require('fs');
const data = fs.readFileSync('final_profs.csv').toString();

const desiredProfs = data.split('\n').filter(str => {
    const tokens = str.split(',');
    return tokens[1] === 'University of Massachusetts Amherst';
});

// fs.writeFileSync('out.csv', desiredProfs.join('\n'))