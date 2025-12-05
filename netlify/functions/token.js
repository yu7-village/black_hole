// netlify/functions/token.js (最終調整版)

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
    // 💡 修正ポイント: scope構造を最小限に簡略化
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
              name: ROOM_NAME,
              // actions: ['read', 'write'], // ❌ 冗長な actions を削除
              members: [
                {
                  id: '*',
                  name: '*',
                  // メンバーのpublish/subscribeの権限を明示
                  actions: ['publish', 'subscribe', 'updateMetadata'], 
                },
              ],
              // sfuBots定義を削除し、デフォルト設定に任せる
            },
          ],
        },
      },
    }).encode(SKYWAY_SECRET_KEY);

    // トークンをクライアントに返す
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', 
      },
      body: JSON.stringify({ token: token }),
    };
  } catch (error) {
    console.error('Error generating Skyway Auth Token:', error);
    // エラー詳細をログに残し、クライアントには一般的なエラーを返す
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token. Check Netlify Functions logs for details.' }),
    };
  }
};
