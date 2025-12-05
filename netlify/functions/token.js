// netlify/functions/token.js (最新の最終修正版)

const { SkyWayAuthToken, uuidV4 } = require('@skyway-sdk/token');

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
    const token = new SkyWayAuthToken({
      jti: uuidV4(),
      ttl: 3600, // 1時間
      iat: Math.floor(Date.now() / 1000),
      scope: {
        app: {
          id: SKYWAY_APP_ID,
          turn: true,
          rooms: [ 
            {
              // Roomリソースを名前で特定
              name: ROOM_NAME, 
              members: [
                {
                  // メンバーリソースを名前で特定 (ワイルドカード '*')
                  name: '*',
                  // 最小限の権限: publish (送信) と subscribe (受信)
                  actions: ['publish', 'subscribe'], 
                },
              ],
            },
          ],
        },
      },
    }).encode(SKYWAY_SECRET_KEY);

    return {
      statusCode: 200, // 成功ステータス
      headers: {
        'Access-Control-Allow-Origin': '*', 
      },
      body: JSON.stringify({ token: token }),
    };
  } catch (error) {
    console.error('Error generating Skyway Auth Token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token. Check Netlify Functions logs for the specific error.' }),
    };
  }
};
