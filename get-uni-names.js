const fs = require('fs');
const data = fs.readFileSync('./bpa/mapping.py').toString();
let names = [''];
let inString = false;
let curChar = '';
for(let i = 0; i < data.length; i++){
    let char = data[i];
    if(!inString && (char === '"' || char === "'")){
        curChar = char;
    }

    if(curChar === char){
        if(inString){
            inString = false;
            curChar === '';
            names.push('')
        } else {
            inString = true;
        }
    }

    else if(inString){
        names[names.length - 1] += char;
    }
}

let namesTokenized = names
    .map(name => name.toLocaleLowerCase())
    .map(name => ({
        tokens: [name, ...name.split(' ').filter(keyword => {
        return keyword;
})]}));

fs.writeFileSync('./university-names-data.json', JSON.stringify(namesTokenized));