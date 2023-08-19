const request = require('request');
const https = require('https')
const { default: axios } = require('axios');
const fs = require('fs');
const { getDocument } = require('pdfjs-dist');

// const cvURL = "https://jeffhuang.com/CurriculumVitae.pdf";
const cvURL = "https://vivo.brown.edu/docs/j/jtompki1_cv.pdf?dt=101910191";

const loadCV = async (cvlink) => {
    const loadingTask = getDocument({url: cvlink});
    const pdfDocument = await loadingTask.promise;
    let runningString = '';

    for(let i = 0; i < 1 /*pdfDocument.numPages*/; i++){
        console.log(`Processed page ${i + 1} of ${pdfDocument.numPages}`);
        const pageGraph = [];

        const pageNumber = i + 1;
        const page = await pdfDocument.getPage(pageNumber);
        const textContent = await page.getTextContent();
        textContent.items.forEach(item => {
            pageGraph.push({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5]
            });
            runningString += '|>' + item.str + '<|'
        });

        // console.log(textContent.items[0])
        //console.log(pageGraph)
        
        let rows = [];
        let prevY = -1;
        let curString = '';

        const withinDistance = (target, test) => Math.abs(target - test) < 3;

        for(let item of pageGraph){
            // if(item.y !== prevY){
            if(!withinDistance(prevY, item.y)){
                rows.push(curString);
                curString = '';
                prevY = item.y;
            }
            // prevY = item.y;

            curString += item.str;
        }

        rows = rows.filter(row => row != ' ')

        console.log(rows)
    }
    fs.writeFileSync('temp.txt', runningString);
}

loadCV(cvURL);