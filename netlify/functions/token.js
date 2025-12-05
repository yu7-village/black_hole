// netlify/functions/token.js (JWT 直生成版)

// 💡 修正ポイント: SkyWayAuthToken の代わりに jsonwebtoken を使用
const jwt = require('jsonwebtoken');
const { uuidV4 } = require('@skyway-sdk/token'); 
// uuidV4 のためにパッケージは残す

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

    // 💡 JWTペイロードの定義 (Skyway Auth Tokenの仕様に厳密に準拠)
    const payload = {
      jti: uuidV4(),
      iss: SKYWAY_APP_ID, // iss (発行者) は App ID
      iat: NOW,
      exp: EXP,
      scope: {
        app: {
          id: SKYWAY_APP_ID,
          turn: true,
          rooms: [ 
            {
              name: ROOM_NAME, 
              members: [
                {
                  name: '*',
                  actions: ['publish', 'subscribe'], 
                },
              ],
            },
          ],
        },
      },
    };

    // シークレットキーとHS256アルゴリズムを使用してトークンを生成
    const token = jwt.sign(payload, SKYWAY_SECRET_KEY, { algorithm: 'HS256' });

    return {
      statusCode: 200, // 成功ステータス
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
