const request = require('request');

// API credentials for viewing individual profiles on ORCID
// const config = {
//     "access_token": "c9f4b4ab-f3b2-477e-9bee-25654636ef3a",
//     "token_type": "bearer",
//     "refresh_token": "e60b80f8-6885-4556-8fa0-a7daf3070e25",
//     "expires_in": 631138518,
//     "scope": "/read-public",
//     "orcid": null
// };

// const queryName = 'Jeff Huang';
// const institution = 'Brown University';

const queryName = 'Pat Hanrahan';
const institution = 'Stanford University';

const url = `https://pub.orcid.org/v3.0/expanded-search/?q=${queryName.toLowerCase().replace(' ', '+')}`;
const url2 = `${url}+${institution.toLowerCase().replace(' ', '+')}`;
request.get(url2, {
    auth: {
        bearer: 'c9f4b4ab-f3b2-477e-9bee-25654636ef3a'
    },
    json: true,
    headers: [
        {
          name: 'content-type',
          value: 'application/vnd.orcid+json'
        }
    ],
}, async (err, res, body) => {
    if(err){
        console.log(err);
        return;
    }

    const results = body['expanded-result'];
    const relevantResults = results.filter(data => 
        queryName.includes(data['given-names']) && 
        queryName.includes(data['family-names']));

    const potentialORCID = `https://orcid.org/${relevantResults[0]['orcid-id']}`;
    console.log(potentialORCID);
});