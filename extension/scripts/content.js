const init = () => {
    // (async () => {
    //     const response = await chrome.runtime.sendMessage({greeting: "hello"});
    //     // do something with response here, not outside the function
    //     console.log(response);
    // })();

    // find CV on page
    let cvAnchorIndex = 0;
    const CVKeywords = ['curriculum vitae', 'cv', 'c.v.']
    const CVnonKeywords = ['cvpr', 'eecv', 'iccv']
    const hasCVKeyword = str => {
        const lowercaseStr = str.toLowerCase();
        return CVKeywords.some(keyword => lowercaseStr.includes(keyword)) && 
            CVnonKeywords.every(keyword => !lowercaseStr.includes(keyword));
    };
    let array = [
        // ...Array.from(document.querySelectorAll('p')),
        ...Array.from(document.querySelectorAll('a'))
    ].filter(el => hasCVKeyword(el.textContent));
    array.forEach(elem => {
        console.log("CV:", elem)
        elem.style.backgroundColor = 'yellow';

        const anchor = document.createElement('a');
        anchor.id = `[cvAnchor]-${cvAnchorIndex}`;
        elem.appendChild(anchor);
        cvAnchorIndex += 1;
    });

    // find phd on page
    let phdAnchorIndex = 0;
    let PhDKeywords = ['ph.d.', 'phd',  ' doctoral', ' doctorate'];
    const hasPhDKeyword = str => {
        const lowercaseStr = str.toLowerCase();
        return PhDKeywords.some(keyword => lowercaseStr.includes(keyword))
    }
    let array2 = [
        //...Array.from(document.querySelectorAll('p')),
        //...Array.from(document.querySelectorAll('#text')),
        ...Array.from(document.querySelectorAll('body')),
    ].filter(el => hasPhDKeyword(el.textContent));
    array2.forEach(elem => {
        // console.log("PhD:", elem)
        let elemStr = elem.innerHTML;
        let indices = PhDKeywords.map(keyword => getIndicesOf(keyword, elemStr, false).map(i => [i, keyword.length]))
            .flat().filter(i => i[0] !== -1).sort((a, b) => a[0] - b[0]);
        indices.reverse().forEach(index => {
            if(index === undefined) return;
            let endIndex = index[0] + index[1], startIndex = index[0];
            let temp = elemStr.split('');
            if(![' ', '"', '', '\s', '\t', '\n', '>'].includes(temp[startIndex - 1])) return;
            // console.log("AAA", endIndex, startIndex, phdAnchorIndex)
            temp.splice(endIndex, 0, '</a></font>');
            temp.splice(startIndex, 0, `<font style="background-color: rgb(0, 200, 255);"><a id="[pAnchor]-${phdAnchorIndex}">`);
            // elem.innerHTML = temp.join('');
            elemStr = temp.join('');
            // console.log(elem.innerHTML.slice(startIndex - 20, endIndex + 20))
            phdAnchorIndex += 1;
        });
        elem.innerHTML = elemStr;
    });
    let validPhDAnchors = [];
    for(let i = 0; i < phdAnchorIndex; i++){
        const potentialAnchor = document.getElementById(`[pAnchor]-${i}`);
        if(potentialAnchor !== null && potentialAnchor !== undefined){
            if(potentialAnchor.getBoundingClientRect().height > 0) validPhDAnchors.push(i);
        }
    }
    validPhDAnchors.reverse();
    
    // find undergrad on page
    let ugradAnchorIndex = 0;
    let ugradKeywords = ['bachelors', 'undergraduate', 'bsc', 'bs.c.', 'b.sc', 'b.s.', 'sc.b.', ' bs ', 'bachelor\'s']
    const hasUgradKeyword = str => {
        const lowercaseStr = str.toLowerCase();
        return ugradKeywords.some(keyword => lowercaseStr.includes(keyword))
    }
    let array3 = [
        //...Array.from(document.querySelectorAll('p')),
        //...Array.from(document.querySelectorAll('#text')),
        ...Array.from(document.querySelectorAll('body')),
    ].filter(el => hasUgradKeyword(el.textContent));
    array3.forEach(elem => {
        // console.log("Ugrad:", elem)
        let elemStr = elem.innerHTML;
        let indices = ugradKeywords.map(keyword => getIndicesOf(keyword, elemStr, false).map(i => [i, keyword.length]))
            .flat().filter(i => i[0] !== -1).sort((a, b) => a[0] - b[0]);
        indices.reverse().forEach(index => {
            if(index === undefined) return;
            let endIndex = index[0] + index[1], startIndex = index[0];
            let temp = elemStr.split('');
            if(![' ', '"', '', '\s', '\t', '\n', '>'].includes(temp[startIndex - 1])) return;
            // console.log(endIndex, startIndex, ugradAnchorIndex)
            temp.splice(endIndex, 0, '</a></font>');
            temp.splice(startIndex, 0, `'<font style="background-color: rgb(200, 255, 0);"><a id="[uAnchor]-${ugradAnchorIndex}">`);
            elemStr = temp.join('');
            // console.log(elem.innerHTML.slice(startIndex - 20, endIndex + 20))
            ugradAnchorIndex += 1;
        });
        elem.innerHTML = elemStr;
    });
    let validUgradAnchors = [];
    for(let i = 0; i < ugradAnchorIndex; i++){
        const potentialAnchor = document.getElementById(`[uAnchor]-${i}`);
        if(potentialAnchor !== null && potentialAnchor !== undefined){
            if(potentialAnchor.getBoundingClientRect().height > 0) validUgradAnchors.push(i);
        }
    }

    console.log(cvAnchorIndex, validPhDAnchors.length, validUgradAnchors.length)

    const popup = document.createElement('div');
    const ps = popup.style;
    ps.position = 'fixed';
    ps.zIndex = '9999';
    ps.backgroundColor = 'rgba(255, 255, 255, 200)';
    ps.padding = '1rem';
    ps.border = '1px solid darkgrey';
    ps.borderRadius = '3px';
    ps.top = '0.5rem';
    ps.right = '0.5rem'
    popup.id = 'label-popup'
    document.body.appendChild(popup);
    //document.childNodes[0].appendChild(popup);

    popup.innerHTML = `
        <div>Keyword search</div>
        <hr style="margin-top: 0.5rem; margin-bottom: 0.5rem;">
        <div style="display: flex; flex-direction: row; line-height: 150%;">
            <div style="display: flex; flex-direction: column; margin-right: 1rem;">   
                <div><font style="background-color: yellow;">CV</font> mentions:</div>
                <div><font style="background-color: rgb(0, 200, 255);">Ph.D.</font> mentions:</div>
                <div><font style="background-color: rgb(200, 255, 0);">Bs.c.</font> mentions:</div>
            </div>
            <div style="display: flex; flex-direction: column; margin-right: 1rem;">   
                <div>${cvAnchorIndex}</div>
                <div>${validPhDAnchors.length}</div>
                <div>${validUgradAnchors.length}</div>
            </div>
            <div style="display: flex; flex-direction: column;">   
                <a id="cvjumper">Jump To Next</a>
                <a id="phdjumper">Jump To Next</a>
                <a id="ugradjumper"">Jump To Next</a>
            </div>
        </div>
    `;
    
    let curCVAnchorIndex = 0;
    let curPhDAnchorIndex = 0;
    let curUgradAnchorIndex = 0;

    document.getElementById('cvjumper').onclick = () => {
        const curAnchor = document.getElementById(`[cvAnchor]-${curCVAnchorIndex}`);
        curAnchor.scrollIntoView();
        scrollBy(0, -50);
        curCVAnchorIndex += 1;
        if(curCVAnchorIndex >= cvAnchorIndex) curCVAnchorIndex = 0;
    };
    document.getElementById('phdjumper').onclick = () => {
        const curAnchor = document.getElementById(`[pAnchor]-${validPhDAnchors[curPhDAnchorIndex]}`);
        curAnchor.scrollIntoView();
        scrollBy(0, -50);
        curPhDAnchorIndex += 1;
        if(curPhDAnchorIndex >= validPhDAnchors.length) curPhDAnchorIndex = 0;
    };
    document.getElementById('ugradjumper').onclick = () => {
        const curAnchor = document.getElementById(`[uAnchor]-${validUgradAnchors[curUgradAnchorIndex]}`);
        curAnchor.scrollIntoView();
        scrollBy(0, -50);
        curUgradAnchorIndex += 1;
        if(curUgradAnchorIndex >= validUgradAnchors.length) curUgradAnchorIndex = 0;
    };
}
document.body.onload = init;


function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}