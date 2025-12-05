// netlify/functions/token.js (最終最終修正版 - サンプルコード準拠)

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
    // サンプルコードとV3仕様に基づき、シンプルな権限構造を採用
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
              // Room名で特定 (black_hole)
              name: ROOM_NAME, 
              
              members: [
                {
                  // メンバー名でワイルドカードを指定
                  name: '*',
                  // 接続と通信に必要な最小限のメソッド
                  actions: ['publish', 'subscribe'], 
                },
              ],
            },
          ],
        },
      },
    }).encode(SKYWAY_SECRET_KEY);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', 
      },
      body: JSON.stringify({ token: token }),
    };
  } catch (error) {
    console.error('Error generating Skyway Auth Token:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token. Check Netlify Functions logs for details.' }),
    };
  }
};
