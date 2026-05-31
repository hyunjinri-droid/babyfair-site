const https = require('https');

exports.handler = async (event) => {
  const { sido, page = 1 } = event.queryStringParameters || {};
  
  const API_KEY = '104ebc3179cd4ae76e8d348514ca3d6dd61a771e11eb971c4dd22ed21ebc4547';
  const url = `https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytBassInfoInqire?serviceKey=${API_KEY}&pageNo=${page}&numOfRows=100&dgidIdCd=Q14&_type=json`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: data
        });
      });
    }).on('error', (e) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      });
    });
  });
};
