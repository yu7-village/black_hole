// netlify/functions/token.js (最小権限構成版)

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

// netlify/functions/token.js の tryブロックの直前
// ⚠️ デバッグが完了したら必ずこの行を削除してください！
  console.log('DEBUG: Secret Key length:', SKYWAY_SECRET_KEY ? SKYWAY_SECRET_KEY.length : 0);


  try {
    // 💡 修正ポイント: rooms内の構造をjoin/publish/subscribeに必要な最小限に絞る
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
              // RoomレベルのactionsやsfuBotsは省略
              members: [
                {
                  // ユーザーIDは自動生成されるためワイルドカード('*')
                  id: '*',
                  // ユーザー名は任意なのでワイルドカード('*')
                  name: '*',
                  // 接続と通信に必要な最小限のメソッドを明示
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
      statusCode: 500, // 502/500をクライアントに返す
      body: JSON.stringify({ error: 'Failed to generate authentication token. Check Netlify Functions logs for details.' }),
    };
  }
};
