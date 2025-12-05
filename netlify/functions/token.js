// netlify/functions/token.js

// Skyway Auth Token生成ライブラリをインポート
const { SkyWayAuthToken, uuidV4 } = require('@skyway-sdk/token');

// Netlify環境変数から機密情報を取得
const SKYWAY_APP_ID = process.env.SKYWAY_APP_ID;
const SKYWAY_SECRET_KEY = process.env.SKYWAY_SECRET_KEY;

// 要件: ルーム名は "black_hole"
const ROOM_NAME = 'black_hole';

exports.handler = async (event, context) => {
  // 環境変数が設定されているか確認
  if (!SKYWAY_APP_ID || !SKYWAY_SECRET_KEY) {
    console.error('Skyway environment variables are not set!');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: Missing App ID or Secret Key.' }),
    };
  }

  // Auth Token生成ロジック
  try {
    const token = new SkyWayAuthToken({
      jti: uuidV4(), // トークンごとに一意のID
      // 要件: トークン有効期限は3600秒 (1時間)
      ttl: 3600, 
      iat: Math.floor(Date.now() / 1000), // 現在時刻
      scope: {
        app: {
          id: SKYWAY_APP_ID,
          turn: true, // TURN利用を許可
          actions: ['read', 'write'],
          channels: [ // ドキュメントの rooms に相当
            {
              id: '*', // 全てのChannel IDを許可
              name: ROOM_NAME,
              actions: ['read', 'write'],
              members: [
                {
                  id: '*',
                  name: '*',
                  actions: ['read', 'write'], // publish, subscribe, updateMetadataを許可
                },
              ],
              sfuBots: [
                {
                  actions: ['read', 'write'],
                },
              ],
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token.' }),
    };
  }
};
