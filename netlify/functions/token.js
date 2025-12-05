// netlify/functions/token.js

const jwt = require('jsonwebtoken');
const { uuidV4 } = require('@skyway-sdk/token'); 

const SKYWAY_APP_ID = process.env.SKYWAY_APP_ID;
const SKYWAY_SECRET_KEY = process.env.SKYWAY_SECRET_KEY;

const ROOM_NAME = 'black_hole';

exports.handler = async (event, context) => {
  if (!SKYWAY_APP_ID || !SKYWAY_SECRET_KEY) {
    console.error('Skyway environment variables are not set!');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing App ID or Secret Key.' }),
    };
  }

  try {
    const NOW = Math.floor(Date.now() / 1000);
    const EXP = NOW + 3600; // 1時間後のUnixタイムスタンプ

    // Skyway V3 SDKの仕様に準拠したペイロード
    const payload = {
      jti: uuidV4(),
      iss: SKYWAY_APP_ID, // V3 SDK では App ID が推奨される
      iat: NOW,
      exp: EXP,
      scope: {
        app: {
          id: SKYWAY_APP_ID,
          turn: true,
          actions: ['read', 'write'], 
          rooms: [ 
            {
              name: ROOM_NAME, 
              actions: ['read', 'write'], 
              members: [
                {
                  name: '*',
                  actions: ['read', 'write'],
                },
              ],
            },
          ],
        },
      },
    };

    // jsonwebtokenでトークンを署名
    const token = jwt.sign(payload, SKYWAY_SECRET_KEY, { algorithm: 'HS256' });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', 
      },
      body: JSON.stringify({ token: token }),
    };
  } catch (error) {
    console.error('Error generating Skyway Auth Token (JWT method):', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token using JWT. Check Netlify Functions logs.' }),
    };
  }
};
