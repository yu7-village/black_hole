// netlify/functions/token.js (最終修正版)

// Skyway Auth Token生成ライブラリをインポート
const { SkyWayAuthToken, uuidV4 } = require('@skyway-sdk/token');

// Netlify環境変数から機密情報を取得
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
          // channelsではなく rooms を使用 (Roomライブラリ推奨のため)
          rooms: [ 
            {
              // black_hole ルームを指す
              name: ROOM_NAME,
              // Roomリソースに対する操作権限 (create, close, updateMetadataなど)
              actions: ['read', 'write'], 
              // メンバーに対する権限
              members: [
                {
                  id: '*', // 全てのメンバーID
                  name: '*', // 全てのメンバー名
                  // publish, subscribe, updateMetadataを許可
                  actions: ['read', 'write'], 
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
    // エラー詳細をログに残し、クライアントには一般的なエラーを返す
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate authentication token. Check Netlify Functions logs for details.' }),
    };
  }
};
